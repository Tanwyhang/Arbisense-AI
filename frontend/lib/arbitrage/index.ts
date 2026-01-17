/**
 * Advanced Arbitrage Detection and Execution System
 *
 * Complete arbitrage system migrated from Polymarket-Kalshi-Arbitrage-bot
 * Integrates multi-strategy detection, L2 VWAP sizing, and risk management
 *
 * @module arbitrage
 */

// ============================================================================
// EXPORTS
// ============================================================================

// Core arbitrage analyzer (existing)
export * from './arbitrageAnalyzer';

// Advanced strategies (new)
export {
  // Strategy types
  ArbitrageStrategy,
  STRATEGY_CONFIGS,
  isStrategyEnabled,
  getEnabledStrategies,

  // Multi-outcome arbitrage
  detectMultiOutcomeArbitrage,
  type MultiOutcomeMarket,
  type MultiOutcome,

  // Three-way sports arbitrage
  detectThreeWayArbitrage,
  type ThreeWayMarket,

  // Single-market arbitrage
  detectSingleMarketArbitrage,
  type SingleMarket,

  // Cross-platform arbitrage
  detectCrossPlatformArbitrage,
  type CrossPlatformPair,

  // Validation and confidence
  validateOpportunity,
  calculateConfidence,
} from './advancedArbitrageStrategies';

// L2 orderbook calculations (new)
export {
  // VWAP calculations
  calculateBuyVWAP,
  calculateSellVWAP,
  calculateArbitrageVWAP,
  type VWAPResult,

  // Orderbook analysis
  calculateOrderbookImbalance,
  calculateSpread,
  calculateTotalLiquidity,
  estimatePriceImpact,

  // Validation
  validateOrderbook,
  type L2OrderBook,
  type OrderBookLevel,
  type OrderbookConfig,
  DEFAULT_ORDERBOOK_CONFIG,

  // Utilities
  formatVWAPResult,
} from './l2OrderbookCalculator';

// Circuit breaker and risk management (new)
export {
  CircuitBreaker,
  CircuitBreakerState,
  createCircuitBreaker,
  validateConfig,
  type CircuitBreakerConfig,
  type Position,
  type TradeResult,
  type DailyMetrics,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuitBreaker';

// Position tracking (new)
export {
  PositionTracker,
  createPositionTracker,
  calculateExpectedProfit,
  type Position as TrackedPosition,
  type ArbitragePositionPair,
  type FillRecord,
  type SettlementRecord,
} from './positionTracker';

// ============================================================================
// INTEGRATION UTILITIES
// ============================================================================

import { ArbitrageOpportunity } from '@/types/market-data';
import { L2OrderBook } from './l2OrderbookCalculator';
import { CircuitBreaker } from './circuitBreaker';
import { PositionTracker } from './positionTracker';
import { calculateArbitrageVWAP, DEFAULT_ORDERBOOK_CONFIG } from './l2OrderbookCalculator';

/**
 * Complete arbitrage analysis pipeline
 *
 * Combines all advanced features into a unified analysis workflow:
 * 1. Detect opportunity using strategy-specific logic
 * 2. Calculate optimal sizing using L2 VWAP
 * 3. Validate against circuit breaker limits
 * 4. Calculate confidence score
 * 5. Return enriched opportunity with execution plan
 */
export interface ArbitrageAnalysisResult {
  opportunity: ArbitrageOpportunity;
  can_execute: boolean;
  optimal_size_usd: number;
  expected_slippage_cents: number;
  vwap_yes: number;
  vwap_no: number;
  confidence_score: number;
  risk_assessment: {
    overall_risk: 'low' | 'medium' | 'high' | 'extreme';
    liquidity_risk: number;
    execution_risk: number;
    timing_risk: number;
    warnings: string[];
  };
  execution_plan?: {
    yes_leg_size: number;
    no_leg_size: number;
    total_cost_usd: number;
    expected_profit_usd: number;
    gas_estimate_usd: number;
  };
  validation_errors: string[];
}

/**
 * Analyze arbitrage opportunity with full execution planning
 *
 * @param opportunity Detected arbitrage opportunity
 * @param yes_orderbook L2 orderbook for YES token
 * @param no_orderbook L2 orderbook for NO token
 * @param circuit_breaker Circuit breaker instance
 * @param target_size_usd Desired trade size
 * @returns Complete analysis result
 */
export function analyzeArbitrageOpportunity(
  opportunity: ArbitrageOpportunity,
  yes_orderbook: L2OrderBook | null,
  no_orderbook: L2OrderBook | null,
  circuit_breaker: CircuitBreaker | null,
  target_size_usd: number = 100
): ArbitrageAnalysisResult {
  const validation_errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Calculate optimal size using L2 VWAP
  let optimal_size = target_size_usd;
  let vwap_yes = opportunity.polymarket_yes_price * 100; // Convert to cents
  let vwap_no = opportunity.polymarket_no_price * 100;
  let expected_slippage_cents = 0;

  if (yes_orderbook && no_orderbook) {
    const vwap_result = calculateArbitrageVWAP(
      yes_orderbook,
      no_orderbook,
      target_size_usd,
      DEFAULT_ORDERBOOK_CONFIG
    );

    if (vwap_result.can_execute) {
      optimal_size = vwap_result.combined_optimal_size;
      vwap_yes = vwap_result.yes_leg.vwap_cents;
      vwap_no = vwap_result.no_leg.vwap_cents;
      expected_slippage_cents = vwap_result.total_slippage_cents;

      warnings.push(`Using L2 VWAP: ${vwap_result.yes_leg.levels_used} + ${vwap_result.no_leg.levels_used} levels`);
    } else {
      validation_errors.push(`Insufficient liquidity for target size`);
      optimal_size = 0;
    }
  } else {
    warnings.push(`L2 orderbook data not available, using top-of-book prices`);
  }

  // Step 2: Validate against circuit breaker
  let can_execute = optimal_size > 0;

  if (circuit_breaker && can_execute) {
    const validation = circuit_breaker.validateTrade(
      opportunity.polymarket_market_id,
      optimal_size,
      opportunity.max_loss_usd || 5 // Default max loss
    );

    if (!validation.canExecute) {
      validation_errors.push(validation.reason || 'Circuit breaker validation failed');
      can_execute = false;
    }
  }

  // Step 3: Calculate confidence score
  const confidence_score = calculateConfidence(
    opportunity.spread_pct,
    opportunity.available_liquidity,
    opportunity.risk_score,
    expected_slippage_cents / 100 // Convert to percentage
  );

  // Step 4: Risk assessment
  const liquidity_risk = opportunity.available_liquidity < 1000 ? 8 : 3;
  const execution_risk = expected_slippage_cents > 2 ? 7 : 3;
  const timing_risk = opportunity.time_sensitive ? 6 : 2;

  const overall_risk_score = (liquidity_risk * 0.3 + execution_risk * 0.4 + timing_risk * 0.3);

  let overall_risk: 'low' | 'medium' | 'high' | 'extreme';
  if (overall_risk_score <= 3) overall_risk = 'low';
  else if (overall_risk_score <= 5) overall_risk = 'medium';
  else if (overall_risk_score <= 7) overall_risk = 'high';
  else overall_risk = 'extreme';

  // Step 5: Build execution plan
  let execution_plan: ArbitrageAnalysisResult['execution_plan'] | undefined;

  if (can_execute) {
    const yes_cost = (optimal_size * vwap_yes) / 100;
    const no_cost = (optimal_size * vwap_no) / 100;
    const total_cost = yes_cost + no_cost;
    const expected_profit = optimal_size - total_cost; // Simplified (should be $1 per contract)
    const gas_estimate = (opportunity.estimated_gas_cost || 0.03) * 2; // 2 legs

    execution_plan = {
      yes_leg_size: optimal_size,
      no_leg_size: optimal_size,
      total_cost_usd: total_cost,
      expected_profit_usd: expected_profit,
      gas_estimate_usd: gas_estimate,
    };
  }

  return {
    opportunity,
    can_execute,
    optimal_size_usd: optimal_size,
    expected_slippage_cents,
    vwap_yes,
    vwap_no,
    confidence_score,
    risk_assessment: {
      overall_risk,
      liquidity_risk,
      execution_risk,
      timing_risk,
      warnings,
    },
    execution_plan,
    validation_errors,
  };
}

/**
 * Batch analyze multiple opportunities
 *
 * @param opportunities Array of detected opportunities
 * @param orderbooks Map of market_id to L2 orderbooks
 * @param circuit_breaker Circuit breaker instance
 * @param target_size_usd Desired trade size
 * @returns Array of analysis results, sorted by confidence
 */
export function batchAnalyzeOpportunities(
  opportunities: ArbitrageOpportunity[],
  orderbooks: Map<string, { yes?: L2OrderBook; no?: L2OrderBook }>,
  circuit_breaker: CircuitBreaker | null,
  target_size_usd: number = 100
): ArbitrageAnalysisResult[] {
  const results: ArbitrageAnalysisResult[] = [];

  for (const opportunity of opportunities) {
    const orderbook_data = orderbooks.get(opportunity.polymarket_market_id) || {};
    const analysis = analyzeArbitrageOpportunity(
      opportunity,
      orderbook_data.yes || null,
      orderbook_data.no || null,
      circuit_breaker,
      target_size_usd
    );

    results.push(analysis);
  }

  // Sort by confidence score, then by expected profit
  return results.sort((a, b) => {
    if (b.confidence_score !== a.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }
    return (b.opportunity.net_profit_usd || 0) - (a.opportunity.net_profit_usd || 0);
  });
}

/**
 * Create integrated arbitrage system
 *
 * Factory function that creates a complete arbitrage system with all components
 */
export function createArbitrageSystem(config?: {
  circuit_breaker?: Partial<typeof DEFAULT_CIRCUIT_BREAKER_CONFIG>;
  orderbook?: Partial<typeof DEFAULT_ORDERBOOK_CONFIG>;
}) {
  const { createCircuitBreaker } = require('./circuitBreaker');
  const { createPositionTracker } = require('./positionTracker');

  const circuit_breaker = createCircuitBreaker(config?.circuit_breaker);
  const position_tracker = createPositionTracker();

  return {
    circuit_breaker,
    position_tracker,
    analyzeOpportunity: (
      opportunity: ArbitrageOpportunity,
      yes_orderbook: L2OrderBook | null,
      no_orderbook: L2OrderBook | null,
      target_size_usd?: number
    ) =>
      analyzeArbitrageOpportunity(
        opportunity,
        yes_orderbook,
        no_orderbook,
        circuit_breaker,
        target_size_usd
      ),

    batchAnalyze: (
      opportunities: ArbitrageOpportunity[],
      orderbooks: Map<string, { yes?: L2OrderBook; no?: L2OrderBook }>,
      target_size_usd?: number
    ) =>
      batchAnalyzeOpportunities(
        opportunities,
        orderbooks,
        circuit_breaker,
        target_size_usd
      ),

    getCircuitBreakerStatus: () => circuit_breaker.getStatus(),
    getPortfolioPnL: () => position_tracker.calculatePortfolioPnL(),
    getPerformanceMetrics: () => position_tracker.getPerformanceMetrics(),
  };
}

// ============================================================================
// RE-EXPORT DEFAULT CONFIGS
// ============================================================================

import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from './circuitBreaker';

export const DEFAULT_CIRCUIT_BREAKER_CONFIG_TYPED = DEFAULT_CIRCUIT_BREAKER_CONFIG;
