/**
 * Arbitrage Analyzer
 * Cross-platform comparison and profit calculation utilities
 */

import { ArbitrageOpportunity } from '@/types/market-data';
import { 
  ProfitCalculatorInput, 
  ProfitCalculatorResult,
  ArbitrageConfig
} from '@/types/arbitrage';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ARBITRAGE_CONFIG: ArbitrageConfig = {
  min_spread_pct: 0.5,
  min_profit_usd: 1.0,
  max_risk_score: 8,
  min_trade_size_usd: 10.0,
  max_trade_size_usd: 10000.0,
  max_position_pct: 10,
  default_polymarket_fee: 0.3,
  default_limitless_fee: 0.3,
  default_slippage: 0.1,
  max_gas_price_gwei: 100,
  gas_buffer_pct: 20,
  signal_validity_seconds: 60,
  stale_data_threshold_ms: 5000,
  alert_on_opportunity: true,
  alert_on_high_spread: true,
  alert_sound_enabled: true,
  high_spread_threshold_pct: 2.0,
  auto_execute_enabled: false,
  auto_execute_min_confidence: 0.9
};

// ============================================================================
// Profit Calculation
// ============================================================================

/**
 * Calculate fee-adjusted profit for an arbitrage trade
 */
export function calculateProfit(input: ProfitCalculatorInput): ProfitCalculatorResult {
  const {
    entry_price,
    exit_price,
    trade_size_usd,
    polymarket_fee_pct,
    limitless_fee_pct,
    entry_gas_eth,
    exit_gas_eth,
    eth_price_usd,
    expected_slippage_pct
  } = input;
  
  // Gross calculations
  const gross_spread_pct = ((exit_price - entry_price) / entry_price) * 100;
  const gross_profit_usd = trade_size_usd * (gross_spread_pct / 100);
  
  // Fee breakdown
  const entry_fee_pct = input.entry_platform === 'polymarket' ? polymarket_fee_pct : limitless_fee_pct;
  const exit_fee_pct = input.exit_platform === 'polymarket' ? polymarket_fee_pct : limitless_fee_pct;
  
  const entry_platform_fee_usd = trade_size_usd * (entry_fee_pct / 100);
  const exit_platform_fee_usd = trade_size_usd * (exit_fee_pct / 100);
  const total_gas_cost_usd = (entry_gas_eth + exit_gas_eth) * eth_price_usd;
  const slippage_cost_usd = trade_size_usd * (expected_slippage_pct / 100);
  
  const total_fees_usd = entry_platform_fee_usd + exit_platform_fee_usd + total_gas_cost_usd + slippage_cost_usd;
  const total_fees_pct = (total_fees_usd / trade_size_usd) * 100;
  
  // Net calculations
  const net_profit_usd = gross_profit_usd - total_fees_usd;
  const net_profit_pct = (net_profit_usd / trade_size_usd) * 100;
  const return_on_capital = net_profit_pct;
  
  // Breakeven analysis
  const breakeven_spread_pct = total_fees_pct;
  const profit_margin_pct = gross_spread_pct - breakeven_spread_pct;
  
  // Risk-adjusted returns (simplified Sharpe estimate)
  const risk_adjusted_return = net_profit_pct / Math.max(expected_slippage_pct, 0.1);
  const sharpe_estimate = risk_adjusted_return * Math.sqrt(252); // Annualized
  
  // Size optimization
  const is_profitable = net_profit_usd > 0;
  const profitability_confidence = is_profitable ? Math.min(profit_margin_pct / 1.0, 1.0) : 0;
  
  // Minimum size for profit (when fixed costs dominate)
  const variable_cost_rate = (entry_fee_pct + exit_fee_pct + expected_slippage_pct) / 100;
  const gross_rate = gross_spread_pct / 100;
  const minimum_size_for_profit = gross_rate > variable_cost_rate 
    ? total_gas_cost_usd / (gross_rate - variable_cost_rate)
    : Infinity;
  
  // Optimal size (considering liquidity and diminishing returns)
  const optimal_size = Math.max(minimum_size_for_profit * 2, 100);
  
  return {
    gross_spread_pct,
    gross_profit_usd,
    fees: {
      entry_platform_fee_usd,
      exit_platform_fee_usd,
      total_gas_cost_usd,
      slippage_cost_usd,
      total_fees_usd,
      total_fees_pct
    },
    net_profit_usd,
    net_profit_pct,
    return_on_capital,
    breakeven_spread_pct,
    profit_margin_pct,
    risk_adjusted_return,
    sharpe_estimate,
    is_profitable,
    profitability_confidence,
    minimum_size_for_profit: isFinite(minimum_size_for_profit) ? minimum_size_for_profit : 0,
    optimal_size
  };
}

// ============================================================================
// Asset Matching
// ============================================================================

interface PolymarketAsset {
  market_id: string;
  question: string;
  yes_price: number;
  no_price: number;
  liquidity: number;
}

interface LimitlessAsset {
  pool_address: string;
  pair: string;
  price: number;
  liquidity: number;
}

interface AssetMatch {
  polymarket: PolymarketAsset;
  limitless: LimitlessAsset;
  match_confidence: number;
  keywords: string[];
}

/**
 * Match assets between Polymarket and Limitless based on keywords
 */
export function matchAssets(
  polymarketAssets: PolymarketAsset[],
  limitlessAssets: LimitlessAsset[]
): AssetMatch[] {
  const matches: AssetMatch[] = [];
  
  for (const poly of polymarketAssets) {
    // Extract keywords from question
    const keywords = extractKeywords(poly.question);
    
    for (const limitless of limitlessAssets) {
      const pairKeywords = extractKeywords(limitless.pair);
      
      // Calculate match score
      const matchScore = calculateMatchScore(keywords, pairKeywords);
      
      if (matchScore > 0.3) { // Threshold for match
        matches.push({
          polymarket: poly,
          limitless,
          match_confidence: matchScore,
          keywords: [...new Set([...keywords, ...pairKeywords])]
        });
      }
    }
  }
  
  // Sort by confidence and deduplicate
  return matches
    .sort((a, b) => b.match_confidence - a.match_confidence)
    .slice(0, 50); // Limit results
}

/**
 * Extract relevant keywords from a string
 */
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'will', 'be', 'to', 'of', 'in', 'for'];
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Calculate similarity score between two keyword sets
 */
function calculateMatchScore(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let matches = 0;
  for (const word of set1) {
    if (set2.has(word)) matches++;
  }
  
  // Jaccard similarity
  const union = new Set([...keywords1, ...keywords2]);
  return matches / union.size;
}

// ============================================================================
// Spread Analysis
// ============================================================================

export interface SpreadAnalysis {
  spread_pct: number;
  spread_absolute: number;
  direction: 'poly_higher' | 'limitless_higher' | 'equal';
  is_actionable: boolean;
  recommended_action: 'buy_poly' | 'buy_limitless' | 'hold';
  profit_potential_usd: number;
}

/**
 * Analyze spread between two prices
 */
export function analyzeSpread(
  polyPrice: number,
  limitlessPrice: number,
  tradeSize: number = 100,
  config: ArbitrageConfig = DEFAULT_ARBITRAGE_CONFIG
): SpreadAnalysis {
  const spread_absolute = Math.abs(polyPrice - limitlessPrice);
  const avgPrice = (polyPrice + limitlessPrice) / 2;
  const spread_pct = (spread_absolute / avgPrice) * 100;
  
  let direction: SpreadAnalysis['direction'];
  let recommended_action: SpreadAnalysis['recommended_action'];
  
  if (polyPrice > limitlessPrice + 0.001) {
    direction = 'poly_higher';
    recommended_action = 'buy_limitless';
  } else if (limitlessPrice > polyPrice + 0.001) {
    direction = 'limitless_higher';
    recommended_action = 'buy_poly';
  } else {
    direction = 'equal';
    recommended_action = 'hold';
  }
  
  const is_actionable = spread_pct >= config.min_spread_pct;
  
  // Simplified profit calculation
  const fees_pct = config.default_polymarket_fee + config.default_limitless_fee + config.default_slippage;
  const net_spread_pct = spread_pct - fees_pct;
  const profit_potential_usd = tradeSize * (net_spread_pct / 100);
  
  return {
    spread_pct,
    spread_absolute,
    direction,
    is_actionable,
    recommended_action: is_actionable ? recommended_action : 'hold',
    profit_potential_usd: Math.max(0, profit_potential_usd)
  };
}

// ============================================================================
// Risk Assessment
// ============================================================================

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'extreme';
  risk_score: number; // 1-10
  factors: {
    liquidity_risk: number;
    execution_risk: number;
    timing_risk: number;
    slippage_risk: number;
  };
  warnings: string[];
  recommendations: string[];
}

/**
 * Assess risk for an arbitrage opportunity
 */
export function assessRisk(
  opportunity: Partial<ArbitrageOpportunity>,
  config: ArbitrageConfig = DEFAULT_ARBITRAGE_CONFIG
): RiskAssessment {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Liquidity risk (1-10)
  let liquidity_risk = 5;
  if (opportunity.available_liquidity !== undefined) {
    if (opportunity.available_liquidity < 1000) {
      liquidity_risk = 8;
      warnings.push('Low liquidity - high slippage expected');
    } else if (opportunity.available_liquidity < 10000) {
      liquidity_risk = 5;
    } else {
      liquidity_risk = 2;
    }
  }
  
  // Execution risk (1-10)
  let execution_risk = 5;
  if (opportunity.time_sensitive) {
    execution_risk = 7;
    warnings.push('Time-sensitive opportunity - requires fast execution');
  }
  
  // Timing risk (1-10)
  let timing_risk = 5;
  if (opportunity.spread_pct !== undefined && opportunity.spread_pct > 5) {
    timing_risk = 8;
    warnings.push('Very high spread may indicate stale data');
  }
  
  // Slippage risk (1-10)
  let slippage_risk = 4;
  if (opportunity.slippage_estimate !== undefined && opportunity.slippage_estimate > 0.5) {
    slippage_risk = 7;
    warnings.push('High expected slippage');
    recommendations.push('Consider reducing trade size');
  }
  
  // Overall risk calculation
  const risk_score = Math.round(
    (liquidity_risk * 0.3 + execution_risk * 0.25 + timing_risk * 0.25 + slippage_risk * 0.2)
  );
  
  let overall_risk: RiskAssessment['overall_risk'];
  if (risk_score <= 3) overall_risk = 'low';
  else if (risk_score <= 5) overall_risk = 'medium';
  else if (risk_score <= 7) overall_risk = 'high';
  else overall_risk = 'extreme';
  
  // Recommendations based on risk
  if (overall_risk === 'low') {
    recommendations.push('Opportunity looks favorable');
  } else if (overall_risk === 'medium') {
    recommendations.push('Proceed with caution');
    recommendations.push('Consider smaller position size');
  } else if (overall_risk === 'high') {
    recommendations.push('High risk - only for experienced traders');
    recommendations.push('Use strict stop-loss');
  } else {
    recommendations.push('Not recommended for execution');
    warnings.push('Extreme risk detected');
  }
  
  return {
    overall_risk,
    risk_score,
    factors: {
      liquidity_risk,
      execution_risk,
      timing_risk,
      slippage_risk
    },
    warnings,
    recommendations
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format currency value
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(decimals)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format time difference
 */
export function formatTimeDiff(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const seconds = Math.floor(diffMs / 1000);
  
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Check if data is stale
 */
export function isDataStale(
  timestampMs: number, 
  thresholdMs: number = DEFAULT_ARBITRAGE_CONFIG.stale_data_threshold_ms
): boolean {
  return (Date.now() - timestampMs) > thresholdMs;
}
