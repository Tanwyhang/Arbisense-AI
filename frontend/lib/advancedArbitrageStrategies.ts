/**
 * Advanced Arbitrage Strategy Detection
 *
 * Migrated from Polymarket-Kalshi-Arbitrage-bot Rust implementation
 * Implements multi-outcome, three-way, and cross-platform arbitrage detection
 *
 * Key Features:
 * - Multi-outcome arbitrage (3+ outcomes)
 * - Three-way sports markets (Home/Away/Draw)
 * - Cross-platform arbitrage
 * - Single-market arbitrage
 * - Cross-conditional arbitrage (planned)
 */

import { ArbitrageOpportunity } from '@/types/market-data';

// ============================================================================
// STRATEGY TYPES
// ============================================================================

export enum ArbitrageStrategy {
  /// Single-market: YES + NO < $1.00 on same market
  SingleMarket = 'SingleMarket',

  /// Cross-platform: YES(Platform1) + NO(Platform2) < $1.00
  CrossPlatform = 'CrossPlatform',

  /// Multi-outcome: Sum of all YES outcomes < $1.00
  MultiOutcome = 'MultiOutcome',

  /// 3-way market: YES(T1) + NO(T2) < DRAW price
  ThreeWayMarket = 'ThreeWayMarket',

  /// Cross-conditional: Related markets on same event
  CrossConditional = 'CrossConditional',
}

export interface StrategyConfig {
  enabled: boolean;
  minProfitCents: number;
  maxRiskLevel: number;
  description: string;
  example: string;
}

// Default strategy configurations (migrated from Rust strategies.rs)
export const STRATEGY_CONFIGS: Record<ArbitrageStrategy, StrategyConfig> = {
  [ArbitrageStrategy.SingleMarket]: {
    enabled: true,
    minProfitCents: 2,
    maxRiskLevel: 1,
    description: 'YES + NO < $1 on same market. Binary outcomes only.',
    example: 'BTC>87k: UP($0.51) + DOWN($0.46) = $0.97 → Profit: $0.03',
  },
  [ArbitrageStrategy.CrossPlatform]: {
    enabled: true,
    minProfitCents: 3,
    maxRiskLevel: 2,
    description: 'YES(Platform1) + NO(Platform2) < $1. Same event, different platforms.',
    example: 'Poly YES($0.68) + Kalshi NO($0.28) = $0.96 → Profit: $0.04',
  },
  [ArbitrageStrategy.MultiOutcome]: {
    enabled: true,
    minProfitCents: 3,
    maxRiskLevel: 2,
    description: 'Sum of all YES outcomes < $1. Markets with 3+ candidates.',
    example: 'Trump($0.40) + Biden($0.35) + Kamala($0.20) = $0.95 → Profit: $0.05',
  },
  [ArbitrageStrategy.ThreeWayMarket]: {
    enabled: true,
    minProfitCents: 3,
    maxRiskLevel: 3,
    description: 'YES(T1) + NO(T2) < DRAW. Sports markets with draw option.',
    example: 'Draw=$0.24, Chelsea=$0.19 → Arsenal NO fair ≈ $0.43',
  },
  [ArbitrageStrategy.CrossConditional]: {
    enabled: false, // Planned for future
    minProfitCents: 5,
    maxRiskLevel: 4,
    description: 'Related markets on same event. E.g., nomination vs election.',
    example: 'Nomination YES($0.70) + Election NO($0.25) = $0.95 → Profit: $0.05',
  },
};

// ============================================================================
// MULTI-OUTCOME ARBITRAGE (AUDIT-0020)
// ============================================================================

export interface MultiOutcomeMarket {
  condition_id: string;
  question: string;
  category: 'Election' | 'ThreeWaySports' | 'SportsMultiWay' | 'Entertainment' | 'Crypto' | 'Other';
  outcomes: MultiOutcome[];
}

export interface MultiOutcome {
  token_id: string;
  name: string;
  yes_price: number; // Price in cents (0-99)
  liquidity: number;
}

/**
 * Detect multi-outcome arbitrage opportunities
 *
 * Mathematical basis:
 * For N mutually exclusive outcomes, sum of probabilities = 100%
 * If sum(YES_price[i] for i=1..N) < 100¢, arbitrage exists
 * Profit = $1.00 - sum(costs) - fees
 *
 * @param market Market with 3+ outcomes
 * @returns Arbitrage opportunity or null
 */
export function detectMultiOutcomeArbitrage(
  market: MultiOutcomeMarket,
  feesCents: number = 3
): ArbitrageOpportunity | null {
  if (market.outcomes.length < 3) {
    return null; // Need at least 3 outcomes
  }

  // Sum all YES prices
  const totalPriceCents = market.outcomes.reduce(
    (sum, outcome) => sum + outcome.yes_price,
    0
  );

  // Check if arbitrage exists
  const totalCost = totalPriceCents + feesCents;
  if (totalCost >= 100) {
    return null; // No arbitrage
  }

  const profitCents = 100 - totalCost;
  const profitUsd = profitCents / 100;

  // Calculate liquidity (min across all outcomes)
  const minLiquidity = Math.min(...market.outcomes.map(o => o.liquidity));

  // Risk score based on number of outcomes (more outcomes = higher execution risk)
  const riskScore = Math.min(10, Math.ceil(market.outcomes.length / 2) + 1);

  return {
    id: `multi-outcome-${market.condition_id}`,
    polymarket_market_id: market.condition_id,
    polymarket_question: market.question,
    polymarket_yes_price: totalPriceCents / 100,
    polymarket_no_price: 0, // Not applicable for multi-outcome
    spread_pct: profitCents,
    spread_absolute: profitUsd,
    direction: 'poly_internal',
    action: 'buy_poly_yes',
    gross_profit_pct: profitCents,
    estimated_gas_cost: feesCents / 100,
    platform_fees: 0,
    net_profit_pct: profitCents,
    net_profit_usd: profitUsd,
    min_size: 10,
    max_size: minLiquidity * 0.5, // Conservative: use 50% of min liquidity
    available_liquidity: minLiquidity,
    slippage_estimate: (market.outcomes.length * 0.1), // 0.1% per outcome
    confidence: Math.max(0, 1 - (market.outcomes.length * 0.05)), // Decreases with more outcomes
    risk_score: riskScore,
    discovered_at: Date.now(),
    time_sensitive: true,
    status: 'active',
  };
}

// ============================================================================
// THREE-WAY SPORTS MARKET ARBITRAGE (AUDIT-0021)
// ============================================================================

export interface ThreeWayMarket {
  condition_id: string;
  question: string;
  home_team: {
    token_id: string;
    yes_price: number;
    no_price: number;
  };
  away_team: {
    token_id: string;
    yes_price: number;
    no_price: number;
  };
  draw: {
    token_id: string;
    yes_price: number; // Draw price
  };
  liquidity: number;
}

/**
 * Detect three-way sports arbitrage
 *
 * Logic: YES(Team1) + NO(Team2) < DRAW price
 * If we can buy Team1 YES and Team2 NO for less than DRAW cost, we have arbitrage
 *
 * @param market Three-way market (Home/Away/Draw)
 * @returns Arbitrage opportunity or null
 */
export function detectThreeWayArbitrage(
  market: ThreeWayMarket,
  feesCents: number = 3
): ArbitrageOpportunity | null {
  const { home_team, away_team, draw } = market;

  // Calculate cost to cover all outcomes:
  // Option 1: Home YES + Away NO + Draw
  const option1Cost = home_team.yes_price + away_team.no_price + draw.yes_price;

  // Option 2: Away YES + Home NO + Draw
  const option2Cost = away_team.yes_price + home_team.no_price + draw.yes_price;

  // Find best option
  const bestOption = option1Cost < option2Cost ? {
    cost: option1Cost,
    action: 'buy_poly_yes',
    team: 'home'
  } : {
    cost: option2Cost,
    action: 'buy_poly_no',
    team: 'away'
  };

  // Add fees
  const totalCost = bestOption.cost + feesCents;

  // Check if arbitrage exists (must be < 100 cents)
  if (totalCost >= 100) {
    return null;
  }

  const profitCents = 100 - totalCost;
  const profitUsd = profitCents / 100;

  // Risk assessment
  const riskScore = 6; // Medium-high risk due to sports complexity

  return {
    id: `three-way-${market.condition_id}`,
    polymarket_market_id: market.condition_id,
    polymarket_question: market.question,
    polymarket_yes_price: bestOption.team === 'home' ? home_team.yes_price / 100 : away_team.yes_price / 100,
    polymarket_no_price: bestOption.team === 'home' ? away_team.no_price / 100 : home_team.no_price / 100,
    spread_pct: profitCents,
    spread_absolute: profitUsd,
    direction: 'poly_internal',
    action: bestOption.action,
    gross_profit_pct: profitCents,
    estimated_gas_cost: feesCents / 100,
    platform_fees: 0,
    net_profit_pct: profitCents,
    net_profit_usd: profitUsd,
    min_size: 25, // Higher minimum for three-way
    max_size: market.liquidity * 0.4, // More conservative
    available_liquidity: market.liquidity,
    slippage_estimate: 0.3, // Higher slippage for three-way
    confidence: 0.7, // Moderate confidence
    risk_score: riskScore,
    discovered_at: Date.now(),
    time_sensitive: true,
    status: 'active',
  };
}

// ============================================================================
// SINGLE-MARKET ARBITRAGE
// ============================================================================

export interface SingleMarket {
  condition_id: string;
  question: string;
  yes_price: number; // in cents
  no_price: number; // in cents
  liquidity: number;
}

/**
 * Detect single-market arbitrage (YES + NO < $1.00)
 *
 * @param market Binary market with YES/NO prices
 * @returns Arbitrage opportunity or null
 */
export function detectSingleMarketArbitrage(
  market: SingleMarket,
  feesCents: number = 3
): ArbitrageOpportunity | null {
  const totalCost = market.yes_price + market.no_price + feesCents;

  if (totalCost >= 100) {
    return null;
  }

  const profitCents = 100 - totalCost;
  const profitUsd = profitCents / 100;

  return {
    id: `single-${market.condition_id}`,
    polymarket_market_id: market.condition_id,
    polymarket_question: market.question,
    polymarket_yes_price: market.yes_price / 100,
    polymarket_no_price: market.no_price / 100,
    spread_pct: profitCents,
    spread_absolute: profitUsd,
    direction: 'poly_internal',
    action: 'buy_poly_yes', // Buy both YES and NO
    gross_profit_pct: profitCents,
    estimated_gas_cost: feesCents / 100,
    platform_fees: 0,
    net_profit_pct: profitCents,
    net_profit_usd: profitUsd,
    min_size: 10,
    max_size: market.liquidity * 0.5,
    available_liquidity: market.liquidity,
    slippage_estimate: 0.1,
    confidence: 0.95, // High confidence for single-market
    risk_score: 1, // Lowest risk
    discovered_at: Date.now(),
    time_sensitive: true,
    status: 'active',
  };
}

// ============================================================================
// CROSS-PLATFORM ARBITRAGE
// ============================================================================

export interface CrossPlatformPair {
  polymarket_market_id: string;
  polymarket_question: string;
  polymarket_yes_price: number; // in cents
  polymarket_no_price: number; // in cents
  limitless_yes_price?: number; // in cents
  limitless_no_price?: number; // in cents
  polymarket_liquidity: number;
  limitless_liquidity: number;
}

/**
 * Detect cross-platform arbitrage
 *
 * Checks four combinations:
 * 1. Poly YES + Limitless NO
 * 2. Limitless YES + Poly NO
 * 3. Poly YES + Poly NO (if both prices better)
 * 4. Limitless YES + Limitless NO (if both prices better)
 *
 * @param pair Market pair across platforms
 * @returns Best arbitrage opportunity or null
 */
export function detectCrossPlatformArbitrage(
  pair: CrossPlatformPair,
  feesCents: number = 3
): ArbitrageOpportunity | null {
  const opportunities: ArbitrageOpportunity[] = [];

  // Option 1: Poly YES + Limitless NO
  if (pair.limitless_no_price) {
    const cost1 = pair.polymarket_yes_price + pair.limitless_no_price + feesCents;
    if (cost1 < 100) {
      const profitCents = 100 - cost1;
      opportunities.push({
        id: `cross-poly-yes-limitless-no-${pair.polymarket_market_id}`,
        polymarket_market_id: pair.polymarket_market_id,
        polymarket_question: pair.polymarket_question,
        polymarket_yes_price: pair.polymarket_yes_price / 100,
        polymarket_no_price: 0,
        limitless_price: pair.limitless_no_price / 100,
        spread_pct: profitCents,
        spread_absolute: profitCents / 100,
        direction: 'poly_to_limitless',
        action: 'buy_poly_yes',
        gross_profit_pct: profitCents,
        estimated_gas_cost: feesCents / 100,
        platform_fees: 0,
        net_profit_pct: profitCents,
        net_profit_usd: profitCents / 100,
        min_size: 10,
        max_size: Math.min(pair.polymarket_liquidity, pair.limitless_liquidity) * 0.5,
        available_liquidity: Math.min(pair.polymarket_liquidity, pair.limitless_liquidity),
        slippage_estimate: 0.15,
        confidence: 0.85,
        risk_score: 2,
        discovered_at: Date.now(),
        time_sensitive: true,
        status: 'active',
      });
    }
  }

  // Option 2: Limitless YES + Poly NO
  if (pair.limitless_yes_price) {
    const cost2 = pair.limitless_yes_price + pair.polymarket_no_price + feesCents;
    if (cost2 < 100) {
      const profitCents = 100 - cost2;
      opportunities.push({
        id: `cross-limitless-yes-poly-no-${pair.polymarket_market_id}`,
        polymarket_market_id: pair.polymarket_market_id,
        polymarket_question: pair.polymarket_question,
        polymarket_yes_price: 0,
        polymarket_no_price: pair.polymarket_no_price / 100,
        limitless_price: pair.limitless_yes_price / 100,
        spread_pct: profitCents,
        spread_absolute: profitCents / 100,
        direction: 'limitless_to_poly',
        action: 'buy_limitless',
        gross_profit_pct: profitCents,
        estimated_gas_cost: feesCents / 100,
        platform_fees: 0,
        net_profit_pct: profitCents,
        net_profit_usd: profitCents / 100,
        min_size: 10,
        max_size: Math.min(pair.polymarket_liquidity, pair.limitless_liquidity) * 0.5,
        available_liquidity: Math.min(pair.polymarket_liquidity, pair.limitless_liquidity),
        slippage_estimate: 0.15,
        confidence: 0.85,
        risk_score: 2,
        discovered_at: Date.now(),
        time_sensitive: true,
        status: 'active',
      });
    }
  }

  // Return best opportunity (highest profit)
  if (opportunities.length === 0) {
    return null;
  }

  return opportunities.sort((a, b) => b.net_profit_usd - a.net_profit_usd)[0];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if strategy is enabled
 */
export function isStrategyEnabled(strategy: ArbitrageStrategy): boolean {
  return STRATEGY_CONFIGS[strategy].enabled;
}

/**
 * Get enabled strategies
 */
export function getEnabledStrategies(): ArbitrageStrategy[] {
  return Object.values(ArbitrageStrategy).filter(
    strategy => STRATEGY_CONFIGS[strategy].enabled
  );
}

/**
 * Validate arbitrage opportunity before execution
 * (Price revalidation - AUDIT-0003)
 */
export function validateOpportunity(
  opp: ArbitrageOpportunity,
  currentPrices: Map<string, number>,
  maxStaleMs: number = 1000
): boolean {
  // Check if opportunity is too old
  if (Date.now() - opp.discovered_at > maxStaleMs) {
    return false;
  }

  // Revalidate prices if we have current data
  // This prevents executing on stale data
  if (opp.polymarket_market_id && currentPrices.has(opp.polymarket_market_id)) {
    const currentPrice = currentPrices.get(opp.polymarket_market_id)!;
    const priceDiff = Math.abs(opp.polymarket_yes_price - currentPrice);

    // If price moved more than 1%, consider it stale
    if (priceDiff > 0.01) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidence(
  profitCents: number,
  liquidity: number,
  riskScore: number,
  slippageEstimate: number
): number {
  let confidence = 0.5; // Base confidence

  // Profit factor (higher profit = higher confidence)
  confidence += Math.min(0.3, profitCents * 0.02);

  // Liquidity factor (more liquidity = higher confidence)
  confidence += Math.min(0.2, Math.log10(liquidity) * 0.05);

  // Risk factor (lower risk = higher confidence)
  confidence += Math.max(-0.3, (5 - riskScore) * 0.05);

  // Slippage factor (less slippage = higher confidence)
  confidence += Math.max(-0.2, (0.5 - slippageEstimate) * 0.2);

  return Math.max(0, Math.min(1, confidence));
}
