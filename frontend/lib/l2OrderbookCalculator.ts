/**
 * L2 Orderbook VWAP Calculator
 *
 * Migrated from Polymarket-Kalshi-Arbitrage-bot execution.rs
 * Implements Volume-Weighted Average Price (VWAP) calculations using full orderbook depth
 *
 * Key Features (AUDIT-0045):
 * - L2-aware sizing: Uses full book depth instead of just top-of-book
 * - Slippage estimation: Calculates expected slippage for target order sizes
 * - Optimal sizing: Finds maximum size that stays within slippage tolerance
 * - Conservative execution: Uses only 50% of displayed liquidity by default
 */

// ============================================================================
// ORDERBOOK TYPES
// ============================================================================

export interface OrderBookLevel {
  price: number; // Price in cents (0-99 for prediction markets)
  size: number; // Available size at this level (in dollars)
}

export interface L2OrderBook {
  bids: OrderBookLevel[]; // Orders to buy (sorted descending by price)
  asks: OrderBookLevel[]; // Orders to sell (sorted ascending by price)
  last_update: number; // Unix timestamp ms
}

export interface VWAPResult {
  optimal_size: number; // Optimal order size in dollars
  vwap_cents: number; // Volume-weighted average price in cents
  slippage_cents: number; // Expected slippage in cents
  total_liquidity: number; // Total liquidity considered
  levels_used: number; // Number of orderbook levels used
  execution_cost_usd: number; // Total cost including slippage
}

// ============================================================================
// CONFIGURATION (Migrated from Rust AUDIT-0045)
// ============================================================================

export interface OrderbookConfig {
  /// Conservative sizing factor (0.1-1.0)
  /// Default: 0.5 (use only 50% of displayed liquidity)
  liquidity_factor: number;

  /// Maximum allowed slippage in cents
  /// Default: 2 cents
  max_slippage_cents: number;

  /// Maximum orderbook depth to consider
  /// Default: 5 levels
  max_depth: number;

  /// Minimum liquidity threshold (in dollars)
  /// Default: $50
  min_liquidity: number;
}

export const DEFAULT_ORDERBOOK_CONFIG: OrderbookConfig = {
  liquidity_factor: 0.5,
  max_slippage_cents: 2,
  max_depth: 5,
  min_liquidity: 50,
};

// ============================================================================
// VWAP CALCULATIONS
// ============================================================================

/**
 * Calculate VWAP for a buy order walking up the ask side
 *
 * Algorithm:
 * 1. Start at best ask (lowest price)
 * 2. Accumulate size until we reach target_size or slippage limit
 * 3. Calculate volume-weighted average price
 * 4. Return optimal size that stays within slippage tolerance
 *
 * @param orderbook L2 orderbook with full depth
 * @param target_size_dollars Target order size in dollars
 * @param config Configuration parameters
 * @returns VWAP calculation result
 */
export function calculateBuyVWAP(
  orderbook: L2OrderBook,
  target_size_dollars: number,
  config: OrderbookConfig = DEFAULT_ORDERBOOK_CONFIG
): VWAPResult {
  if (orderbook.asks.length === 0) {
    return {
      optimal_size: 0,
      vwap_cents: 0,
      slippage_cents: 0,
      total_liquidity: 0,
      levels_used: 0,
      execution_cost_usd: 0,
    };
  }

  const best_ask = orderbook.asks[0].price;
  if (best_ask === 0) {
    return {
      optimal_size: 0,
      vwap_cents: 0,
      slippage_cents: 0,
      total_liquidity: 0,
      levels_used: 0,
      execution_cost_usd: 0,
    };
  }

  // Walk through ask levels
  let accumulated_size: number = 0;
  let cost_sum: number = 0;
  let vwap: number = best_ask;
  let levels_used = 0;

  for (let i = 0; i < Math.min(orderbook.asks.length, config.max_depth); i++) {
    const level = orderbook.asks[i];
    if (level.price === 0 || level.size === 0) break;

    // Calculate VWAP if we add this level
    const new_size = accumulated_size + level.size * config.liquidity_factor;
    const new_cost = cost_sum + (level.price * level.size * config.liquidity_factor);
    const new_vwap = new_cost / new_size;

    // Calculate slippage from best price
    const slippage = new_vwap - best_ask;

    // Check if we've exceeded slippage tolerance
    if (slippage > config.max_slippage_cents) {
      // Don't add this level - stop here
      break;
    }

    // Accept this level
    accumulated_size = new_size;
    cost_sum = new_cost;
    vwap = new_vwap;
    levels_used++;

    // Check if we've reached target size
    if (accumulated_size >= target_size_dollars) {
      break;
    }
  }

  // Calculate final slippage
  const slippage_cents = vwap - best_ask;

  // Optimal size is min of accumulated and target
  const optimal_size = Math.min(accumulated_size, target_size_dollars);

  // Calculate execution cost
  const execution_cost_usd = (optimal_size * vwap) / 100;

  return {
    optimal_size,
    vwap_cents: Math.round(vwap),
    slippage_cents: Math.round(slippage_cents),
    total_liquidity: accumulated_size,
    levels_used,
    execution_cost_usd,
  };
}

/**
 * Calculate VWAP for a sell order walking down the bid side
 *
 * Algorithm:
 * 1. Start at best bid (highest price)
 * 2. Accumulate size until we reach target_size or slippage limit
 * 3. Calculate volume-weighted average price
 * 4. Return optimal size that stays within slippage tolerance
 *
 * @param orderbook L2 orderbook with full depth
 * @param target_size_dollars Target order size in dollars
 * @param config Configuration parameters
 * @returns VWAP calculation result
 */
export function calculateSellVWAP(
  orderbook: L2OrderBook,
  target_size_dollars: number,
  config: OrderbookConfig = DEFAULT_ORDERBOOK_CONFIG
): VWAPResult {
  if (orderbook.bids.length === 0) {
    return {
      optimal_size: 0,
      vwap_cents: 0,
      slippage_cents: 0,
      total_liquidity: 0,
      levels_used: 0,
      execution_cost_usd: 0,
    };
  }

  const best_bid = orderbook.bids[0].price;
  if (best_bid === 0) {
    return {
      optimal_size: 0,
      vwap_cents: 0,
      slippage_cents: 0,
      total_liquidity: 0,
      levels_used: 0,
      execution_cost_usd: 0,
    };
  }

  // Walk through bid levels
  let accumulated_size: number = 0;
  let cost_sum: number = 0;
  let vwap: number = best_bid;
  let levels_used = 0;

  for (let i = 0; i < Math.min(orderbook.bids.length, config.max_depth); i++) {
    const level = orderbook.bids[i];
    if (level.price === 0 || level.size === 0) break;

    // Calculate VWAP if we add this level
    const new_size = accumulated_size + level.size * config.liquidity_factor;
    const new_cost = cost_sum + (level.price * level.size * config.liquidity_factor);
    const new_vwap = new_cost / new_size;

    // Calculate slippage from best price (negative for sells)
    const slippage = best_bid - new_vwap;

    // Check if we've exceeded slippage tolerance
    if (slippage > config.max_slippage_cents) {
      // Don't add this level - stop here
      break;
    }

    // Accept this level
    accumulated_size = new_size;
    cost_sum = new_cost;
    vwap = new_vwap;
    levels_used++;

    // Check if we've reached target size
    if (accumulated_size >= target_size_dollars) {
      break;
    }
  }

  // Calculate final slippage (positive value)
  const slippage_cents = Math.round(best_bid - vwap);

  // Optimal size is min of accumulated and target
  const optimal_size = Math.min(accumulated_size, target_size_dollars);

  // Calculate execution cost
  const execution_cost_usd = (optimal_size * vwap) / 100;

  return {
    optimal_size,
    vwap_cents: Math.round(vwap),
    slippage_cents,
    total_liquidity: accumulated_size,
    levels_used,
    execution_cost_usd,
  };
}

/**
 * Calculate optimal order size for both legs of an arbitrage
 *
 * For arbitrage, we need to ensure both legs can be executed within slippage limits
 * This function calculates the minimum optimal size across both legs
 *
 * @param yes_orderbook Orderbook for YES token
 * @param no_orderbook Orderbook for NO token
 * @param target_size_dollars Target order size in dollars
 * @param config Configuration parameters
 * @returns Combined VWAP result for both legs
 */
export function calculateArbitrageVWAP(
  yes_orderbook: L2OrderBook,
  no_orderbook: L2OrderBook,
  target_size_dollars: number,
  config: OrderbookConfig = DEFAULT_ORDERBOOK_CONFIG
): {
  yes_leg: VWAPResult;
  no_leg: VWAPResult;
  combined_optimal_size: number;
  total_slippage_cents: number;
  can_execute: boolean;
} {
  // Calculate VWAP for both legs
  const yes_leg = calculateBuyVWAP(yes_orderbook, target_size_dollars, config);
  const no_leg = calculateBuyVWAP(no_orderbook, target_size_dollars, config);

  // Combined optimal size is limited by the smaller leg
  const combined_optimal_size = Math.min(yes_leg.optimal_size, no_leg.optimal_size);

  // Total slippage is sum of both legs
  const total_slippage_cents = yes_leg.slippage_cents + no_leg.slippage_cents;

  // Check if execution is feasible
  const can_execute =
    combined_optimal_size >= config.min_liquidity &&
    total_slippage_cents <= config.max_slippage_cents * 2; // Allow 2x for two legs

  return {
    yes_leg,
    no_leg,
    combined_optimal_size,
    total_slippage_cents,
    can_execute,
  };
}

// ============================================================================
// ORDERBOOK ANALYSIS
// ============================================================================

/**
 * Calculate orderbook imbalance
 *
 * Imbalance = (bid_liquidity - ask_liquidity) / (bid_liquidity + ask_liquidity)
 * Values range from -1 (bearish) to +1 (bullish)
 *
 * @param orderbook L2 orderbook
 * @param depth Number of levels to consider
 * @returns Imbalance score from -1 to +1
 */
export function calculateOrderbookImbalance(
  orderbook: L2OrderBook,
  depth: number = 3
): number {
  let bid_liquidity = 0;
  let ask_liquidity = 0;

  for (let i = 0; i < Math.min(depth, orderbook.bids.length); i++) {
    bid_liquidity += orderbook.bids[i].size;
  }

  for (let i = 0; i < Math.min(depth, orderbook.asks.length); i++) {
    ask_liquidity += orderbook.asks[i].size;
  }

  if (bid_liquidity + ask_liquidity === 0) {
    return 0;
  }

  return (bid_liquidity - ask_liquidity) / (bid_liquidity + ask_liquidity);
}

/**
 * Calculate spread in cents
 *
 * @param orderbook L2 orderbook
 * @returns Spread in cents
 */
export function calculateSpread(orderbook: L2OrderBook): number {
  if (orderbook.bids.length === 0 || orderbook.asks.length === 0) {
    return 0;
  }

  const best_bid = orderbook.bids[0].price;
  const best_ask = orderbook.asks[0].price;

  if (best_bid === 0 || best_ask === 0) {
    return 0;
  }

  return best_ask - best_bid;
}

/**
 * Calculate total liquidity available in orderbook
 *
 * @param orderbook L2 orderbook
 * @param depth Maximum depth to consider
 * @returns Total liquidity in dollars
 */
export function calculateTotalLiquidity(
  orderbook: L2OrderBook,
  depth: number = 5
): number {
  let total = 0;

  for (let i = 0; i < Math.min(depth, orderbook.bids.length); i++) {
    total += orderbook.bids[i].size;
  }

  for (let i = 0; i < Math.min(depth, orderbook.asks.length); i++) {
    total += orderbook.asks[i].size;
  }

  return total;
}

/**
 * Estimate price impact of an order
 *
 * @param orderbook L2 orderbook
 * @param order_size_dollars Size of order to execute
 * @param is_buy True for buy, false for sell
 * @returns Estimated price impact in cents
 */
export function estimatePriceImpact(
  orderbook: L2OrderBook,
  order_size_dollars: number,
  is_buy: boolean
): number {
  const vwap = is_buy
    ? calculateBuyVWAP(orderbook, order_size_dollars)
    : calculateSellVWAP(orderbook, order_size_dollars);

  return vwap.slippage_cents;
}

// ============================================================================
// ORDERBOOK VALIDATION
// ============================================================================

/**
 * Validate orderbook data quality
 *
 * @param orderbook L2 orderbook to validate
 * @param max_age_ms Maximum age for orderbook to be considered fresh
 * @returns Validation result
 */
export function validateOrderbook(
  orderbook: L2OrderBook,
  max_age_ms: number = 5000
): {
  is_valid: boolean;
  is_fresh: boolean;
  has_liquidity: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const now = Date.now();

  // Check freshness
  const is_fresh = (now - orderbook.last_update) < max_age_ms;
  if (!is_fresh) {
    issues.push(`Orderbook is stale: ${Math.round((now - orderbook.last_update) / 1000)}s old`);
  }

  // Check liquidity
  const total_liquidity = calculateTotalLiquidity(orderbook);
  const has_liquidity = total_liquidity >= DEFAULT_ORDERBOOK_CONFIG.min_liquidity;
  if (!has_liquidity) {
    issues.push(`Insufficient liquidity: $${total_liquidity.toFixed(2)}`);
  }

  // Check for valid prices
  let has_valid_prices = true;
  if (orderbook.bids.length > 0 && orderbook.bids[0].price === 0) {
    has_valid_prices = false;
    issues.push('Best bid price is 0');
  }
  if (orderbook.asks.length > 0 && orderbook.asks[0].price === 0) {
    has_valid_prices = false;
    issues.push('Best ask price is 0');
  }

  const is_valid = is_fresh && has_liquidity && has_valid_prices;

  return {
    is_valid,
    is_fresh,
    has_liquidity,
    issues,
  };
}

/**
 * Format VWAP result for display
 */
export function formatVWAPResult(result: VWAPResult): string {
  return `Size: $${result.optimal_size.toFixed(2)} | VWAP: ${result.vwap_cents}¢ | Slippage: ${result.slippage_cents}¢ | Levels: ${result.levels_used}`;
}
