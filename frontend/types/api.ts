/**
 * API types matching backend Pydantic models
 */

export interface OpportunityData {
  pair: string;
  dex_a: string;
  dex_b: string;
  price_a: number;
  price_b: number;
  spread_pct: number;
  volatility: number;
  liquidity: number;
  gas_estimate: number;
  expected_return: number;
  win_probability: number;
}

export interface MonteCarloPath {
  values: number[];
  is_levy: boolean;
}

export interface MonteCarloResult {
  paths: MonteCarloPath[];
  mean_return: number;
  std_dev: number;
  skewness: number;
  kurtosis: number;
  var_95: number;
  cvar_95: number;
  computation_time_ms: number;
}

export interface AgentVerdict {
  agent_name: "RiskAgent" | "GasAgent" | "AlphaAgent";
  verdict: "APPROVE" | "REJECT";
  rationale: string;
  metric_value: number;
  threshold: number;
}

export interface ConsensusResult {
  verdicts: AgentVerdict[];
  consensus: "APPROVE" | "REJECT";
  confidence_score: number;
  computation_time_ms: number;
}

export interface KellyResult {
  kelly_fraction: number;
  adjusted_fraction: number;
  recommended_position_pct: number;
  safety_capped: boolean;
  correlation_factor: number;
  computation_time_ms: number;
}

export interface RevenueScenario {
  scenario_name: "Best Case" | "Average Case" | "Stress Case" | "Black Swan";
  daily_revenue: number[];
  total_revenue: number;
  max_drawdown: number;
  breakeven_day: number | null;
  probability_weight: number;
}

export interface RevenueProjection {
  scenarios: RevenueScenario[];
  expected_value: number;
  downside_risk_pct: number;
  computation_time_ms: number;
}

export interface SimulationResponse {
  opportunity: OpportunityData;
  monte_carlo: MonteCarloResult;
  consensus: ConsensusResult;
  kelly: KellyResult;
  revenue_projection: RevenueProjection;
  total_computation_time_ms: number;
  performance_warning: string | null;
}
