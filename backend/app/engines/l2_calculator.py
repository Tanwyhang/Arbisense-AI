"""
L2 Orderbook VWAP Calculator
Migrated from Rust bot execution.rs AUDIT-0045

Implements Volume-Weighted Average Price (VWAP) calculations using full orderbook depth

Key Features:
- L2-aware sizing: Uses full book depth instead of just top-of-book
- Slippage estimation: Calculates expected slippage for target order sizes
- Optimal sizing: Finds maximum size that stays within slippage tolerance
- Conservative execution: Uses only 50% of displayed liquidity by default
"""

import logging
from typing import List, Tuple
import numpy as np

from app.models.arbitrage import (
    L2OrderBook,
    OrderBookLevel,
    VWAPResult,
)

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

class OrderbookConfig:
    """Orderbook calculation configuration"""

    def __init__(
        self,
        liquidity_factor: float = 0.5,  # Use 50% of displayed liquidity
        max_slippage_cents: int = 2,  # Max 2¢ slippage
        max_depth: int = 5,  # Check 5 levels deep
        min_liquidity: float = 50.0,  # Minimum $50 liquidity
    ):
        self.liquidity_factor = liquidity_factor
        self.max_slippage_cents = max_slippage_cents
        self.max_depth = max_depth
        self.min_liquidity = min_liquidity


DEFAULT_CONFIG = OrderbookConfig()


# ============================================================================
# VWAP CALCULATIONS
# ============================================================================

def calculate_buy_vwap(
    orderbook: L2OrderBook,
    target_size_dollars: float,
    config: OrderbookConfig = DEFAULT_CONFIG,
) -> VWAPResult:
    """
    Calculate VWAP for a buy order walking up the ask side

    Algorithm:
    1. Start at best ask (lowest price)
    2. Accumulate size until we reach target_size or slippage limit
    3. Calculate volume-weighted average price
    4. Return optimal size that stays within slippage tolerance

    Args:
        orderbook: L2 orderbook with full depth
        target_size_dollars: Target order size in dollars
        config: Configuration parameters

    Returns:
        VWAPResult with optimal size and calculations
    """
    if not orderbook.asks:
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=0.0,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    best_ask = orderbook.asks[0].price
    if best_ask == 0:
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=0.0,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    # Extract prices and sizes
    depths = min(len(orderbook.asks), config.max_depth)
    prices = np.array([level.price for level in orderbook.asks[:depths]])
    sizes = np.array([level.size for level in orderbook.asks[:depths]])

    # Apply liquidity factor (use only fraction of displayed liquidity)
    adjusted_sizes = sizes * config.liquidity_factor

    # Calculate cumulative sums
    cumulative_sizes = np.cumsum(adjusted_sizes)
    cumulative_costs = np.cumsum(prices * adjusted_sizes)

    # Calculate VWAP at each level
    with np.errstate(divide='ignore', invalid='ignore'):
        vwap_at_level = cumulative_costs / cumulative_sizes

    # Calculate slippage at each level
    slippage = vwap_at_level - best_ask

    # Find levels within slippage tolerance
    valid_mask = slippage <= config.max_slippage_cents

    if not np.any(valid_mask):
        # No valid levels within slippage tolerance
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=best_ask,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    # Find last valid level
    valid_indices = np.where(valid_mask)[0]
    max_valid_idx = valid_indices[-1]

    # Calculate optimal size
    optimal_size = min(cumulative_sizes[max_valid_idx], target_size_dollars)
    final_vwap = vwap_at_level[max_valid_idx]
    final_slippage = slippage[max_valid_idx]
    levels_used = max_valid_idx + 1

    # Calculate execution cost
    execution_cost_usd = (optimal_size * final_vwap) / 100

    return VWAPResult(
        optimal_size=optimal_size,
        vwap_cents=round(final_vwap, 1),
        slippage_cents=round(final_slippage, 1),
        total_liquidity=cumulative_sizes[max_valid_idx],
        levels_used=levels_used,
        execution_cost_usd=execution_cost_usd,
    )


def calculate_sell_vwap(
    orderbook: L2OrderBook,
    target_size_dollars: float,
    config: OrderbookConfig = DEFAULT_CONFIG,
) -> VWAPResult:
    """
    Calculate VWAP for a sell order walking down the bid side

    Algorithm:
    1. Start at best bid (highest price)
    2. Accumulate size until we reach target_size or slippage limit
    3. Calculate volume-weighted average price
    4. Return optimal size that stays within slippage tolerance

    Args:
        orderbook: L2 orderbook with full depth
        target_size_dollars: Target order size in dollars
        config: Configuration parameters

    Returns:
        VWAPResult with optimal size and calculations
    """
    if not orderbook.bids:
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=0.0,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    best_bid = orderbook.bids[0].price
    if best_bid == 0:
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=0.0,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    # Extract prices and sizes
    depths = min(len(orderbook.bids), config.max_depth)
    prices = np.array([level.price for level in orderbook.bids[:depths]])
    sizes = np.array([level.size for level in orderbook.bids[:depths]])

    # Apply liquidity factor
    adjusted_sizes = sizes * config.liquidity_factor

    # Calculate cumulative sums
    cumulative_sizes = np.cumsum(adjusted_sizes)
    cumulative_costs = np.cumsum(prices * adjusted_sizes)

    # Calculate VWAP at each level
    with np.errstate(divide='ignore', invalid='ignore'):
        vwap_at_level = cumulative_costs / cumulative_sizes

    # Calculate slippage (price goes down when selling)
    slippage = best_bid - vwap_at_level

    # Find levels within slippage tolerance
    valid_mask = slippage <= config.max_slippage_cents

    if not np.any(valid_mask):
        return VWAPResult(
            optimal_size=0.0,
            vwap_cents=best_bid,
            slippage_cents=0.0,
            total_liquidity=0.0,
            levels_used=0,
            execution_cost_usd=0.0,
        )

    # Find last valid level
    valid_indices = np.where(valid_mask)[0]
    max_valid_idx = valid_indices[-1]

    # Calculate optimal size
    optimal_size = min(cumulative_sizes[max_valid_idx], target_size_dollars)
    final_vwap = vwap_at_level[max_valid_idx]
    final_slippage = slippage[max_valid_idx]
    levels_used = max_valid_idx + 1

    # Calculate execution cost
    execution_cost_usd = (optimal_size * final_vwap) / 100

    return VWAPResult(
        optimal_size=optimal_size,
        vwap_cents=round(final_vwap, 1),
        slippage_cents=round(final_slippage, 1),
        total_liquidity=cumulative_sizes[max_valid_idx],
        levels_used=levels_used,
        execution_cost_usd=execution_cost_usd,
    )


def calculate_arbitrage_vwap(
    yes_orderbook: L2OrderBook,
    no_orderbook: L2OrderBook,
    target_size_dollars: float,
    config: OrderbookConfig = DEFAULT_CONFIG,
) -> dict:
    """
    Calculate optimal order size for both legs of an arbitrage

    For arbitrage, we need to ensure both legs can be executed within slippage limits

    Args:
        yes_orderbook: Orderbook for YES token
        no_orderbook: Orderbook for NO token
        target_size_dollars: Target order size in dollars
        config: Configuration parameters

    Returns:
        Dictionary with combined VWAP results
    """
    # Calculate VWAP for both legs
    yes_leg = calculate_buy_vwap(yes_orderbook, target_size_dollars, config)
    no_leg = calculate_buy_vwap(no_orderbook, target_size_dollars, config)

    # Combined optimal size is limited by the smaller leg
    combined_optimal_size = min(yes_leg.optimal_size, no_leg.optimal_size)

    # Total slippage is sum of both legs
    total_slippage_cents = yes_leg.slippage_cents + no_leg.slippage_cents

    # Check if execution is feasible
    can_execute = (
        combined_optimal_size >= config.min_liquidity and
        total_slippage_cents <= config.max_slippage_cents * 2  # Allow 2x for two legs
    )

    return {
        "yes_leg": yes_leg,
        "no_leg": no_leg,
        "combined_optimal_size": combined_optimal_size,
        "total_slippage_cents": total_slippage_cents,
        "can_execute": can_execute,
    }


# ============================================================================
# ORDERBOOK ANALYSIS
# ============================================================================

def calculate_orderbook_imbalance(
    orderbook: L2OrderBook,
    depth: int = 3,
) -> float:
    """
    Calculate orderbook imbalance

    Imbalance = (bid_liquidity - ask_liquidity) / (bid_liquidity + ask_liquidity)
    Values range from -1 (bearish) to +1 (bullish)

    Args:
        orderbook: L2 orderbook
        depth: Number of levels to consider

    Returns:
        Imbalance score from -1 to +1
    """
    bid_liquidity = sum(
        level.size for level in orderbook.bids[:min(depth, len(orderbook.bids))]
    )
    ask_liquidity = sum(
        level.size for level in orderbook.asks[:min(depth, len(orderbook.asks))]
    )

    if bid_liquidity + ask_liquidity == 0:
        return 0.0

    return (bid_liquidity - ask_liquidity) / (bid_liquidity + ask_liquidity)


def calculate_spread(orderbook: L2OrderBook) -> float:
    """
    Calculate spread in cents

    Args:
        orderbook: L2 orderbook

    Returns:
        Spread in cents
    """
    return orderbook.spread


def calculate_total_liquidity(
    orderbook: L2OrderBook,
    depth: int = 5,
) -> float:
    """
    Calculate total liquidity available in orderbook

    Args:
        orderbook: L2 orderbook
        depth: Maximum depth to consider

    Returns:
        Total liquidity in dollars
    """
    total = 0.0

    for level in orderbook.bids[:min(depth, len(orderbook.bids))]:
        total += level.size

    for level in orderbook.asks[:min(depth, len(orderbook.asks))]:
        total += level.size

    return total


def estimate_price_impact(
    orderbook: L2OrderBook,
    order_size_dollars: float,
    is_buy: bool,
    config: OrderbookConfig = DEFAULT_CONFIG,
) -> float:
    """
    Estimate price impact of an order

    Args:
        orderbook: L2 orderbook
        order_size_dollars: Size of order to execute
        is_buy: True for buy, False for sell
        config: Configuration parameters

    Returns:
        Estimated price impact in cents
    """
    if is_buy:
        vwap = calculate_buy_vwap(orderbook, order_size_dollars, config)
    else:
        vwap = calculate_sell_vwap(orderbook, order_size_dollars, config)

    return vwap.slippage_cents


# ============================================================================
# ORDERBOOK VALIDATION
# ============================================================================

def validate_orderbook(
    orderbook: L2OrderBook,
    max_age_ms: int = 5000,
    config: OrderbookConfig = DEFAULT_CONFIG,
) -> dict:
    """
    Validate orderbook data quality

    Args:
        orderbook: L2 orderbook to validate
        max_age_ms: Maximum age for orderbook to be considered fresh
        config: Configuration parameters

    Returns:
        Validation result with issues list
    """
    issues = []
    now_ms = int(datetime.now().timestamp() * 1000)

    # Check freshness
    is_fresh = (now_ms - orderbook.last_update) < max_age_ms
    if not is_fresh:
        age_seconds = (now_ms - orderbook.last_update) / 1000
        issues.append(f"Orderbook is stale: {age_seconds:.1f}s old")

    # Check liquidity
    total_liquidity = calculate_total_liquidity(orderbook)
    has_liquidity = total_liquidity >= config.min_liquidity
    if not has_liquidity:
        issues.append(f"Insufficient liquidity: ${total_liquidity:.2f}")

    # Check for valid prices
    has_valid_prices = True
    if orderbook.bids and orderbook.bids[0].price == 0:
        has_valid_prices = False
        issues.append("Best bid price is 0")

    if orderbook.asks and orderbook.asks[0].price == 0:
        has_valid_prices = False
        issues.append("Best ask price is 0")

    is_valid = is_fresh and has_liquidity and has_valid_prices

    return {
        "is_valid": is_valid,
        "is_fresh": is_fresh,
        "has_liquidity": has_liquidity,
        "issues": issues,
    }


def format_vwap_result(result: VWAPResult) -> str:
    """Format VWAP result for display"""
    return (f"Size: ${result.optimal_size:.2f} | "
            f"VWAP: {result.vwap_cents:.1f}¢ | "
            f"Slippage: {result.slippage_cents:.1f}¢ | "
            f"Levels: {result.levels_used}")
