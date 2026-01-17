"""
Advanced Arbitrage Strategy Detection
Migrated from Rust bot - production-grade algorithms

Implements:
- Multi-outcome arbitrage (3+ outcomes)
- Three-way sports markets (Home/Away/Draw)
- Single-market arbitrage (YES + NO < $1.00)
- Cross-platform arbitrage
"""

import logging
from typing import Optional, List
from datetime import datetime

from app.models.arbitrage import (
    ArbitrageOpportunity,
    MultiOutcomeMarket,
    MultiOutcomeCategory,
    ThreeWayMarket,
    SingleMarket,
    CrossPlatformPair,
    ArbitrageStrategy,
)

logger = logging.getLogger(__name__)


# ============================================================================
# STRATEGY CONFIGURATION
# ============================================================================

STRATEGY_CONFIGS = {
    ArbitrageStrategy.SINGLE_MARKET: {
        "enabled": True,
        "min_profit_cents": 2,
        "max_risk_level": 1,
        "description": "YES + NO < $1 on same market. Binary outcomes only.",
        "example": "BTC>87k: UP($0.51) + DOWN($0.46) = $0.97 → Profit: $0.03",
    },
    ArbitrageStrategy.CROSS_PLATFORM: {
        "enabled": True,
        "min_profit_cents": 3,
        "max_risk_level": 2,
        "description": "YES(Platform1) + NO(Platform2) < $1. Same event, different platforms.",
        "example": "Poly YES($0.68) + Kalshi NO($0.28) = $0.96 → Profit: $0.04",
    },
    ArbitrageStrategy.MULTI_OUTCOME: {
        "enabled": True,
        "min_profit_cents": 3,
        "max_risk_level": 2,
        "description": "Sum of all YES outcomes < $1. Markets with 3+ candidates.",
        "example": "Trump($0.40) + Biden($0.35) + Kamala($0.20) = $0.95 → Profit: $0.05",
    },
    ArbitrageStrategy.THREE_WAY_MARKET: {
        "enabled": True,
        "min_profit_cents": 3,
        "max_risk_level": 3,
        "description": "YES(T1) + NO(T2) < DRAW. Sports markets with draw option.",
        "example": "Draw=$0.24, Chelsea=$0.19 → Arsenal NO fair ≈ $0.43",
    },
    ArbitrageStrategy.CROSS_CONDITIONAL: {
        "enabled": False,  # Planned for future
        "min_profit_cents": 5,
        "max_risk_level": 4,
        "description": "Related markets on same event. E.g., nomination vs election.",
        "example": "Nomination YES($0.70) + Election NO($0.25) = $0.95 → Profit: $0.05",
    },
}


# ============================================================================
# MULTI-OUTCOME ARBITRAGE (AUDIT-0020)
# ============================================================================

def detect_multi_outcome_arbitrage(
    market: MultiOutcomeMarket,
    fees_cents: int = 3
) -> Optional[ArbitrageOpportunity]:
    """
    Detect multi-outcome arbitrage opportunities

    Mathematical basis:
    For N mutually exclusive outcomes, sum of probabilities = 100%
    If sum(YES_price[i] for i=1..N) < 100¢, arbitrage exists
    Profit = $1.00 - sum(costs) - fees

    Examples:
    - Election with 3 candidates: 35¢ + 40¢ + 20¢ = 95¢ → 5¢ profit
    - Sports with 4 outcomes: 25¢ + 30¢ + 20¢ + 20¢ = 95¢ → 5¢ profit

    Args:
        market: Market with 3+ outcomes
        fees_cents: Estimated fees in cents

    Returns:
        ArbitrageOpportunity if found, None otherwise
    """
    if len(market.outcomes) < 3:
        return None

    # Sum all YES prices
    total_price_cents = sum(outcome.yes_price for outcome in market.outcomes)

    # Check if arbitrage exists
    total_cost = total_price_cents + fees_cents
    if total_cost >= 100:
        return None

    profit_cents = 100 - total_cost
    profit_usd = profit_cents / 100

    # Calculate liquidity (min across all outcomes)
    min_liquidity = min(outcome.liquidity for outcome in market.outcomes)

    # Risk score based on number of outcomes
    risk_score = min(10, len(market.outcomes) // 2 + 1)

    # Confidence decreases with more outcomes (execution risk)
    confidence = max(0, 1 - (len(market.outcomes) * 0.05))

    return ArbitrageOpportunity(
        id=f"multi-outcome-{market.condition_id}",
        polymarket_market_id=market.condition_id,
        polymarket_question=market.question,
        polymarket_yes_price=total_price_cents / 100,
        polymarket_no_price=0.0,  # Not applicable
        spread_pct=profit_cents,
        spread_absolute=profit_usd,
        direction="poly_internal",
        action="buy_poly_yes",
        gross_profit_pct=profit_cents,
        estimated_gas_cost=fees_cents / 100,
        platform_fees=0.0,
        net_profit_pct=profit_cents,
        net_profit_usd=profit_usd,
        min_size=10.0,
        max_size=min_liquidity * 0.5,  # Conservative
        available_liquidity=min_liquidity,
        slippage_estimate=len(market.outcomes) * 0.1,  # 0.1% per outcome
        confidence=confidence,
        risk_score=risk_score,
        discovered_at=int(datetime.now().timestamp() * 1000),
        time_sensitive=True,
        status="active",
    )


# ============================================================================
# THREE-WAY SPORTS MARKET ARBITRAGE (AUDIT-0021)
# ============================================================================

def detect_three_way_arbitrage(
    market: ThreeWayMarket,
    fees_cents: int = 3
) -> Optional[ArbitrageOpportunity]:
    """
    Detect three-way sports arbitrage

    Logic: YES(Team1) + NO(Team2) < DRAW price
    If we can buy Team1 YES and Team2 NO for less than DRAW cost, we have arbitrage

    Example:
    Chelsea WIN: 35¢
    Arsenal WIN: 40¢
    DRAW: 22¢

    Option 1: Chelsea YES (35) + Arsenal NO (60) + DRAW (22) = 117¢ (too high)
    Option 2: Arsenal YES (40) + Chelsea NO (65) + DRAW (22) = 127¢ (too high)

    Wait for better prices...

    Args:
        market: Three-way market (Home/Away/Draw)
        fees_cents: Estimated fees in cents

    Returns:
        ArbitrageOpportunity if found, None otherwise
    """
    home_team = market.home_team
    away_team = market.away_team
    draw = market.draw

    # Calculate both options
    option1_cost = home_team.yes_price + away_team.no_price + draw.yes_price
    option2_cost = away_team.yes_price + home_team.no_price + draw.yes_price

    # Find best option
    if option1_cost < option2_cost:
        best_cost = option1_cost
        action = "buy_poly_yes"
        team = "home"
        yes_price = home_team.yes_price
        no_price = away_team.no_price
    else:
        best_cost = option2_cost
        action = "buy_poly_no"
        team = "away"
        yes_price = away_team.yes_price
        no_price = home_team.no_price

    # Add fees
    total_cost = best_cost + fees_cents

    # Check if arbitrage exists
    if total_cost >= 100:
        return None

    profit_cents = 100 - total_cost
    profit_usd = profit_cents / 100

    # Risk score (medium-high for sports complexity)
    risk_score = 6

    return ArbitrageOpportunity(
        id=f"three-way-{market.condition_id}",
        polymarket_market_id=market.condition_id,
        polymarket_question=market.question,
        polymarket_yes_price=yes_price / 100,
        polymarket_no_price=no_price / 100,
        spread_pct=profit_cents,
        spread_absolute=profit_usd,
        direction="poly_internal",
        action=action,
        gross_profit_pct=profit_cents,
        estimated_gas_cost=fees_cents / 100,
        platform_fees=0.0,
        net_profit_pct=profit_cents,
        net_profit_usd=profit_usd,
        min_size=25.0,  # Higher minimum for three-way
        max_size=market.liquidity * 0.4,  # More conservative
        available_liquidity=market.liquidity,
        slippage_estimate=0.3,  # Higher slippage
        confidence=0.7,  # Moderate confidence
        risk_score=risk_score,
        discovered_at=int(datetime.now().timestamp() * 1000),
        time_sensitive=True,
        status="active",
    )


# ============================================================================
# SINGLE-MARKET ARBITRAGE
# ============================================================================

def detect_single_market_arbitrage(
    market: SingleMarket,
    fees_cents: int = 3
) -> Optional[ArbitrageOpportunity]:
    """
    Detect single-market arbitrage (YES + NO < $1.00)

    This is the simplest arbitrage: buy both YES and NO in same market
    If YES + NO < $1.00, guaranteed profit

    Args:
        market: Binary market with YES/NO prices
        fees_cents: Estimated fees in cents

    Returns:
        ArbitrageOpportunity if found, None otherwise
    """
    total_cost = market.yes_price + market.no_price + fees_cents

    if total_cost >= 100:
        return None

    profit_cents = 100 - total_cost
    profit_usd = profit_cents / 100

    return ArbitrageOpportunity(
        id=f"single-{market.condition_id}",
        polymarket_market_id=market.condition_id,
        polymarket_question=market.question,
        polymarket_yes_price=market.yes_price / 100,
        polymarket_no_price=market.no_price / 100,
        spread_pct=profit_cents,
        spread_absolute=profit_usd,
        direction="poly_internal",
        action="buy_poly_yes",  # Buy both YES and NO
        gross_profit_pct=profit_cents,
        estimated_gas_cost=fees_cents / 100,
        platform_fees=0.0,
        net_profit_pct=profit_cents,
        net_profit_usd=profit_usd,
        min_size=10.0,
        max_size=market.liquidity * 0.5,
        available_liquidity=market.liquidity,
        slippage_estimate=0.1,
        confidence=0.95,  # High confidence
        risk_score=1,  # Lowest risk
        discovered_at=int(datetime.now().timestamp() * 1000),
        time_sensitive=True,
        status="active",
    )


# ============================================================================
# CROSS-PLATFORM ARBITRAGE
# ============================================================================

def detect_cross_platform_arbitrage(
    pair: CrossPlatformPair,
    fees_cents: int = 3
) -> Optional[ArbitrageOpportunity]:
    """
    Detect cross-platform arbitrage

    Checks four combinations:
    1. Polymarket YES + Limitless NO
    2. Limitless YES + Polymarket NO

    Args:
        pair: Market pair across platforms
        fees_cents: Estimated fees in cents

    Returns:
        Best ArbitrageOpportunity if found, None otherwise
    """
    opportunities: List[ArbitrageOpportunity] = []

    # Option 1: Poly YES + Limitless NO
    if pair.limitless_no_price is not None:
        cost1 = pair.polymarket_yes_price + pair.limitless_no_price + fees_cents
        if cost1 < 100:
            profit_cents = 100 - cost1

            opportunities.append(ArbitrageOpportunity(
                id=f"cross-poly-yes-limitless-no-{pair.polymarket_market_id}",
                polymarket_market_id=pair.polymarket_market_id,
                polymarket_question=pair.polymarket_question,
                polymarket_yes_price=pair.polymarket_yes_price / 100,
                polymarket_no_price=0.0,
                limitless_price=pair.limitless_no_price / 100,
                spread_pct=profit_cents,
                spread_absolute=profit_cents / 100,
                direction="poly_to_limitless",
                action="buy_poly_yes",
                gross_profit_pct=profit_cents,
                estimated_gas_cost=fees_cents / 100,
                platform_fees=0.0,
                net_profit_pct=profit_cents,
                net_profit_usd=profit_cents / 100,
                min_size=10.0,
                max_size=min(pair.polymarket_liquidity, pair.limitless_liquidity or 0) * 0.5,
                available_liquidity=min(pair.polymarket_liquidity, pair.limitless_liquidity or 0),
                slippage_estimate=0.15,
                confidence=0.85,
                risk_score=2,
                discovered_at=int(datetime.now().timestamp() * 1000),
                time_sensitive=True,
                status="active",
            ))

    # Option 2: Limitless YES + Poly NO
    if pair.limitless_yes_price is not None:
        cost2 = pair.limitless_yes_price + pair.polymarket_no_price + fees_cents
        if cost2 < 100:
            profit_cents = 100 - cost2

            opportunities.append(ArbitrageOpportunity(
                id=f"cross-limitless-yes-poly-no-{pair.polymarket_market_id}",
                polymarket_market_id=pair.polymarket_market_id,
                polymarket_question=pair.polymarket_question,
                polymarket_yes_price=0.0,
                polymarket_no_price=pair.polymarket_no_price / 100,
                limitless_price=pair.limitless_yes_price / 100,
                spread_pct=profit_cents,
                spread_absolute=profit_cents / 100,
                direction="limitless_to_poly",
                action="buy_limitless",
                gross_profit_pct=profit_cents,
                estimated_gas_cost=fees_cents / 100,
                platform_fees=0.0,
                net_profit_pct=profit_cents,
                net_profit_usd=profit_cents / 100,
                min_size=10.0,
                max_size=min(pair.polymarket_liquidity, pair.limitless_liquidity or 0) * 0.5,
                available_liquidity=min(pair.polymarket_liquidity, pair.limitless_liquidity or 0),
                slippage_estimate=0.15,
                confidence=0.85,
                risk_score=2,
                discovered_at=int(datetime.now().timestamp() * 1000),
                time_sensitive=True,
                status="active",
            ))

    # Return best opportunity (highest profit)
    if not opportunities:
        return None

    return max(opportunities, key=lambda opp: opp.net_profit_usd)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def is_strategy_enabled(strategy: ArbitrageStrategy) -> bool:
    """Check if strategy is enabled"""
    return STRATEGY_CONFIGS[strategy]["enabled"]


def get_enabled_strategies() -> List[ArbitrageStrategy]:
    """Get list of enabled strategies"""
    return [
        strategy for strategy, config in STRATEGY_CONFIGS.items()
        if config["enabled"]
    ]


def validate_opportunity(
    opp: ArbitrageOpportunity,
    current_prices: dict,
    max_stale_ms: int = 1000
) -> bool:
    """
    Validate arbitrage opportunity before execution (AUDIT-0003)

    Price revalidation: Re-check prices to prevent stale data execution

    Args:
        opp: Opportunity to validate
        current_prices: Current market prices
        max_stale_ms: Maximum age in milliseconds

    Returns:
        True if valid, False otherwise
    """
    # Check if opportunity is too old
    now_ms = int(datetime.now().timestamp() * 1000)
    if now_ms - opp.discovered_at > max_stale_ms:
        logger.warning(f"Opportunity {opp.id} is stale ({now_ms - opp.discovered_at}ms old)")
        return False

    # Revalidate prices if we have current data
    if opp.polymarket_market_id in current_prices:
        current_price = current_prices[opp.polymarket_market_id]
        price_diff = abs(opp.polymarket_yes_price - current_price)

        # If price moved more than 1%, consider it stale
        if price_diff > 0.01:
            logger.warning(f"Opportunity {opp.id} price changed too much ({price_diff:.2%})")
            return False

    return True


def calculate_confidence(
    profit_cents: float,
    liquidity: float,
    risk_score: int,
    slippage_estimate: float
) -> float:
    """
    Calculate confidence score based on multiple factors

    Args:
        profit_cents: Profit in cents
        liquidity: Available liquidity
        risk_score: Risk score (1-10)
        slippage_estimate: Expected slippage in cents

    Returns:
        Confidence score (0-1)
    """
    confidence = 0.5  # Base confidence

    # Profit factor (higher profit = higher confidence)
    confidence += min(0.3, profit_cents * 0.02)

    # Liquidity factor (more liquidity = higher confidence)
    import math
    confidence += min(0.2, math.log10(max(liquidity, 1)) * 0.05)

    # Risk factor (lower risk = higher confidence)
    confidence += max(-0.3, (5 - risk_score) * 0.05)

    # Slippage factor (less slippage = higher confidence)
    confidence += max(-0.2, (0.5 - slippage_estimate) * 0.2)

    return max(0.0, min(1.0, confidence))
