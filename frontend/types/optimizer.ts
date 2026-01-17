/**
 * Type definitions for AI Parameter Optimizer
 * Matches backend Pydantic models
 */

// ============================================================================
// Enums
// ============================================================================

export enum AgentRole {
  PROFIT_MAX = 'profit_maximizer',
  RISK_AVERSE = 'risk_averse',
  GAS_EFFICIENT = 'gas_efficient',
  MARKET_ANALYST = 'market_analyst',
  META_LEARNER = 'meta_learner'
}

export enum OptimizationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  CONVERGED = 'converged',
  FAILED = 'failed',
  COMPLETED = 'completed'
}

export enum Recommendation {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  REVIEW = 'REVIEW'
}

// ============================================================================
// Agent & Parameter Types
// ============================================================================

export interface AgentPersona {
  name: string;
  emoji: string;
  color: string;
  system_prompt: string;
  parameter_bias: Record<string, number>;
}

export interface ArbitrageParameters {
  min_spread_pct: number;
  min_profit_usd: number;
  max_risk_score: number;
  min_trade_size_usd: number;
  max_trade_size_usd: number;
  polymarket_fee_pct: number;
  limitless_fee_pct: number;
  default_slippage_pct: number;
  base_gas_cost_usd: number;
  gas_cost_threshold_pct: number;
  position_sizing_cap: number;
  consensus_threshold: number;
  monte_carlo_levy_alpha: number;
}

export interface ParameterConstraints {
  min_spread_pct_range: [number, number];
  min_profit_usd_range: [number, number];
  max_risk_score_range: [number, number];
  max_trade_size_usd_range: [number, number];
  gas_cost_threshold_pct_range: [number, number];
  position_sizing_cap_range: [number, number];
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  sharpe_ratio: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  average_profit_usd: number;
  total_profit_usd: number;
  cvar_95: number;
  volatility_daily: number;
}

// ============================================================================
// Agent Communication Types
// ============================================================================

export interface AgentMessage {
  agent_id: AgentRole;
  agent_name: string;
  round_number: number;
  timestamp: string;
  content: string;
  parameter_suggestions: Record<string, number>;
  rationale: string;
  confidence_score: number;
  addressed_to?: AgentRole;
}

export interface AgentResponse {
  agent_id: AgentRole;
  suggested_parameters: ArbitrageParameters;
  confidence: number;
  reasoning: string;
  expected_improvement: string;
  concerns: string[];
}

// ============================================================================
// Consensus Types
// ============================================================================

export interface ConsensusState {
  round_number: number;
  total_rounds: number;
  convergence_score: number;
  has_converged: boolean;
  agreed_parameters: ArbitrageParameters | null;
  agent_agreements: Record<AgentRole, boolean>;
  confidence_scores: Record<AgentRole, number>;
  outstanding_disagreements: string[];
}

// ============================================================================
// Simulation Types
// ============================================================================

export interface SimulationConfig {
  use_historical_data: boolean;
  historical_days: number;
  monte_carlo_paths: number;
  monte_carlo_days: number;
  random_seed?: number;
}

export interface SimulationResult {
  simulation_id: string;
  proposed_parameters: ArbitrageParameters;
  baseline_metrics: PerformanceMetrics;
  proposed_metrics: PerformanceMetrics;
  improvement_summary: ImprovementSummary;
  monte_carlo_distribution: {
    final_values: number[];
    daily_returns: number[];
  } | null;
  backtest_trades: BacktestTrade[];
  recommendation: Recommendation;
  confidence: number;
  warnings: string[];
}

export interface ImprovementSummary {
  sharpe_ratio_change: number;
  sharpe_ratio_improvement_pct: number;
  return_change: number;
  drawdown_change: number;
  win_rate_change: number;
  profit_change_usd: number;
}

export interface BacktestTrade {
  timestamp: string;
  profit_usd: number;
  net_profit_usd: number;
  spread_pct: number;
}

// ============================================================================
// Optimization Session Types
// ============================================================================

export interface OptimizationRequest {
  current_parameters: ArbitrageParameters;
  current_metrics: PerformanceMetrics;
  constraints?: ParameterConstraints;
  optimization_goal: string;
  max_iterations: number;
  agent_count: number;
}

export interface OptimizationSession {
  session_id: string;
  status: OptimizationStatus;
  created_at: string;
  updated_at: string;
  request: OptimizationRequest;
  consensus_state: ConsensusState | null;
  agent_messages: AgentMessage[];
  simulation_result: SimulationResult | null;
  final_parameters: ArbitrageParameters | null;
  applied: boolean;
  error_message: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface StartOptimizationResponse {
  session_id: string;
  status: OptimizationStatus;
  message: string;
  estimated_time_seconds: number;
}

export interface OptimizationStatusResponse {
  session_id: string;
  status: OptimizationStatus;
  progress_percentage: number;
  current_round: number;
  total_rounds: number;
  consensus_score: number;
  agent_messages_count: number;
  simulation_complete: boolean;
  estimated_remaining_seconds: number | null;
}

export interface ApprovalRequest {
  session_id: string;
  approve: boolean;
  reason?: string;
}

export interface ApprovalResponse {
  success: boolean;
  message: string;
  applied_parameters: ArbitrageParameters | null;
  rollback_available: boolean;
  audit_log_id: string | null;
}

export interface CurrentParametersResponse {
  parameters: ArbitrageParameters;
  metrics: PerformanceMetrics;
  last_updated: string | null;
}

export interface SessionsListResponse {
  total: number;
  sessions: SessionSummary[];
}

export interface SessionSummary {
  session_id: string;
  status: OptimizationStatus;
  created_at: string;
  applied: boolean;
  final_parameters: ArbitrageParameters | null;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type OptimizerWebSocketMessage =
  | OptimizerStatusMessage
  | AgentMessageMessage
  | ConsensusUpdateMessage
  | OptimizerCompletedMessage
  | OptimizerFailedMessage;

export interface OptimizerStatusMessage {
  type: 'optimizer_status';
  session_id: string;
  status: OptimizationStatus;
}

export interface AgentMessageMessage {
  type: 'agent_message';
  session_id: string;
  message: AgentMessage;
}

export interface ConsensusUpdateMessage {
  type: 'consensus_update';
  session_id: string;
  consensus: ConsensusState;
}

export interface OptimizerCompletedMessage {
  type: 'optimizer_completed';
  session_id: string;
  result: SimulationResult;
}

export interface OptimizerFailedMessage {
  type: 'optimizer_failed';
  session_id: string;
  error: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface OptimizerUIState {
  currentSession: OptimizationSession | null;
  isOptimizing: boolean;
  selectedRound: number;
  highlightedAgent: AgentRole | null;
  showParameterDiff: boolean;
  simulationView: 'comparison' | 'distribution' | 'trades';
}

export interface AgentVisualConfig {
  [key: string]: {
    name: string;
    emoji: string;
    color: string;
    description: string;
  };
}

export const AGENT_CONFIGS: AgentVisualConfig = {
  [AgentRole.PROFIT_MAX]: {
    name: 'Profit Maximizer',
    emoji: '🟢',
    color: '#22c55e',
    description: 'Maximizes expected returns with aggressive parameters'
  },
  [AgentRole.RISK_AVERSE]: {
    name: 'Risk Averse',
    emoji: '🔴',
    color: '#ef4444',
    description: 'Minimizes downside risk and protects capital'
  },
  [AgentRole.GAS_EFFICIENT]: {
    name: 'Gas Efficient',
    emoji: '🔵',
    color: '#3b82f6',
    description: 'Minimizes transaction costs and maximizes net profit'
  },
  [AgentRole.MARKET_ANALYST]: {
    name: 'Market Analyst',
    emoji: '🟡',
    color: '#eab308',
    description: 'Adapts parameters to current market conditions'
  },
  [AgentRole.META_LEARNER]: {
    name: 'Meta Learner',
    emoji: '🟣',
    color: '#a855f7',
    description: 'Synthesizes insights and builds consensus'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getAgentConfig(role: AgentRole) {
  return AGENT_CONFIGS[role];
}

export function formatAgentRole(role: AgentRole): string {
  return AGENT_CONFIGS[role].name;
}

export function getAgentColor(role: AgentRole): string {
  return AGENT_CONFIGS[role].color;
}

export function formatParameterChange(
  before: number,
  after: number,
  decimals: number = 2
): { value: number; isPositive: boolean; formatted: string } {
  const change = after - before;
  const isPositive = change >= 0;
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(decimals)}`;
  return { value: change, isPositive, formatted };
}

export function getStatusColor(status: OptimizationStatus): string {
  switch (status) {
    case OptimizationStatus.PENDING:
      return '#6b7280';
    case OptimizationStatus.RUNNING:
      return '#3b82f6';
    case OptimizationStatus.COMPLETED:
    case OptimizationStatus.CONVERGED:
      return '#22c55e';
    case OptimizationStatus.FAILED:
      return '#ef4444';
    default:
      return '#6b7280';
  }
}
