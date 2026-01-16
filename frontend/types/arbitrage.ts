/**
 * Arbitrage Types
 * Cross-platform arbitrage monitoring, signals, and profit calculations
 */

// Re-export ArbitrageOpportunity from market-data for convenience
export type { ArbitrageOpportunity } from './market-data';
import type { ArbitrageOpportunity } from './market-data';

// ============================================================================
// SPREAD MONITORING
// ============================================================================

export interface SpreadMonitor {
  id: string;
  name: string;
  
  // Asset pair being monitored
  asset: {
    polymarket_market_id: string;
    polymarket_question: string;
    limitless_pool_address?: string;
    limitless_pair?: string;
  };
  
  // Current spread data
  current_spread: {
    value_pct: number;
    value_absolute: number;
    direction: 'positive' | 'negative' | 'neutral';
    polymarket_price: number;
    limitless_price: number;
    updated_at: number;
  };
  
  // Historical spread (last 24h)
  spread_history: {
    timestamp: number;
    spread_pct: number;
  }[];
  
  // Statistics
  stats: {
    avg_spread_24h: number;
    max_spread_24h: number;
    min_spread_24h: number;
    std_dev_24h: number;
    correlation: number; // Price correlation between platforms
  };
  
  // Alert configuration
  alert_threshold_pct: number;
  is_alerting: boolean;
  last_alert_at?: number;
  
  // Status
  monitoring_active: boolean;
  data_quality: 'good' | 'stale' | 'missing';
}

// ============================================================================
// ARBITRAGE SIGNALS
// ============================================================================

export type SignalStrength = 'weak' | 'moderate' | 'strong' | 'very_strong';
export type SignalType = 'entry' | 'exit' | 'hold' | 'warning';

export interface ArbitrageSignal {
  id: string;
  opportunity_id: string;
  
  // Signal properties
  type: SignalType;
  strength: SignalStrength;
  confidence_score: number; // 0-100
  
  // Entry/Exit details
  entry_price?: number;
  exit_price?: number;
  target_profit_pct?: number;
  stop_loss_pct?: number;
  
  // Execution recommendation
  recommendation: {
    action: 'execute' | 'wait' | 'skip' | 'close';
    urgency: 'immediate' | 'soon' | 'monitor';
    rationale: string;
  };
  
  // Risk assessment
  risk_assessment: {
    overall_risk: 'low' | 'medium' | 'high' | 'extreme';
    liquidity_risk: number; // 1-10
    execution_risk: number; // 1-10
    timing_risk: number; // 1-10
    slippage_risk: number; // 1-10
  };
  
  // Timing
  generated_at: number;
  valid_until: number;
  time_window_seconds: number;
  
  // Status
  status: 'active' | 'executed' | 'expired' | 'invalidated';
}

// ============================================================================
// PROFIT CALCULATOR
// ============================================================================

export interface ProfitCalculatorInput {
  // Trade parameters
  entry_platform: 'polymarket' | 'limitless';
  exit_platform: 'polymarket' | 'limitless';
  
  entry_price: number;
  exit_price: number;
  trade_size_usd: number;
  
  // Fee parameters
  polymarket_fee_pct: number; // Default: 0.3%
  limitless_fee_pct: number; // Variable
  
  // Gas estimates
  entry_gas_eth: number;
  exit_gas_eth: number;
  eth_price_usd: number;
  
  // Slippage
  expected_slippage_pct: number;
}

export interface ProfitCalculatorResult {
  // Gross calculations
  gross_spread_pct: number;
  gross_profit_usd: number;
  
  // Fee breakdown
  fees: {
    entry_platform_fee_usd: number;
    exit_platform_fee_usd: number;
    total_gas_cost_usd: number;
    slippage_cost_usd: number;
    total_fees_usd: number;
    total_fees_pct: number;
  };
  
  // Net calculations
  net_profit_usd: number;
  net_profit_pct: number;
  return_on_capital: number;
  
  // Breakeven analysis
  breakeven_spread_pct: number;
  profit_margin_pct: number;
  
  // Risk-adjusted returns
  risk_adjusted_return: number;
  sharpe_estimate: number;
  
  // Recommendation
  is_profitable: boolean;
  profitability_confidence: number;
  minimum_size_for_profit: number;
  optimal_size: number;
}

// ============================================================================
// ARBITRAGE ALERT SYSTEM
// ============================================================================

export type AlertPriority = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'opportunity' | 'execution' | 'risk' | 'system' | 'market';

export interface ArbitrageAlert {
  id: string;
  
  // Alert classification
  priority: AlertPriority;
  category: AlertCategory;
  
  // Content
  title: string;
  message: string;
  details?: Record<string, unknown>;
  
  // Related opportunity
  opportunity_id?: string;
  signal_id?: string;
  
  // Metrics snapshot
  metrics?: {
    spread_pct: number;
    profit_potential_usd: number;
    time_remaining_seconds?: number;
  };
  
  // Status
  status: 'new' | 'acknowledged' | 'dismissed' | 'actioned';
  
  // Timestamps
  created_at: number;
  acknowledged_at?: number;
  expires_at?: number;
  
  // Audio/notification
  sound_enabled: boolean;
  notification_sent: boolean;
}

// ============================================================================
// ARBITRAGE STATE
// ============================================================================

export interface ArbitrageState {
  // Active opportunities
  opportunities: Map<string, ArbitrageOpportunity>;
  
  // Spread monitors
  monitors: Map<string, SpreadMonitor>;
  
  // Signals
  active_signals: ArbitrageSignal[];
  signal_history: ArbitrageSignal[];
  
  // Alerts
  alerts: ArbitrageAlert[];
  unread_alert_count: number;
  
  // Aggregate metrics
  metrics: {
    total_opportunities_24h: number;
    avg_spread_24h: number;
    max_spread_24h: number;
    total_potential_profit_24h: number;
    executed_trades_24h: number;
    executed_profit_24h: number;
    success_rate_24h: number;
  };
  
  // System status
  engine_status: 'running' | 'paused' | 'error';
  last_scan_at: number;
  scan_frequency_ms: number;
}

// ============================================================================
// ARBITRAGE CONFIGURATION
// ============================================================================

export interface ArbitrageConfig {
  // Thresholds
  min_spread_pct: number;
  min_profit_usd: number;
  max_risk_score: number;
  
  // Size limits
  min_trade_size_usd: number;
  max_trade_size_usd: number;
  max_position_pct: number; // % of available capital
  
  // Fee assumptions
  default_polymarket_fee: number;
  default_limitless_fee: number;
  default_slippage: number;
  
  // Gas settings
  max_gas_price_gwei: number;
  gas_buffer_pct: number;
  
  // Timing
  signal_validity_seconds: number;
  stale_data_threshold_ms: number;
  
  // Alerts
  alert_on_opportunity: boolean;
  alert_on_high_spread: boolean;
  alert_sound_enabled: boolean;
  high_spread_threshold_pct: number;
  
  // Auto-execution (future feature)
  auto_execute_enabled: boolean;
  auto_execute_min_confidence: number;
}

// ============================================================================
// EXECUTION TRACKING
// ============================================================================

export interface ArbitrageExecution {
  id: string;
  opportunity_id: string;
  signal_id?: string;
  
  // Trade details
  entry_platform: 'polymarket' | 'limitless';
  exit_platform: 'polymarket' | 'limitless';
  
  entry_price: number;
  exit_price: number;
  size_usd: number;
  
  // Actual costs
  actual_fees_usd: number;
  actual_gas_usd: number;
  actual_slippage_pct: number;
  
  // Results
  gross_profit_usd: number;
  net_profit_usd: number;
  net_profit_pct: number;
  
  // Status
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  
  // Timestamps
  initiated_at: number;
  entry_executed_at?: number;
  exit_executed_at?: number;
  completed_at?: number;
  
  // Transaction references
  entry_tx_hash?: string;
  exit_tx_hash?: string;
}
