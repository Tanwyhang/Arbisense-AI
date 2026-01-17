"""
Pydantic models for ARBISENSE API
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# Request Models
class SimulationRequest(BaseModel):
    """Request parameters for arbitrage simulation"""
    pair: str = Field(default="USDC-USDT", description="Trading pair")
    dex_a: str = Field(default="Camelot", description="First DEX")
    dex_b: str = Field(default="Sushiswap", description="Second DEX")


# Opportunity Data
class OpportunityData(BaseModel):
    """Synthetic arbitrage opportunity"""
    pair: str
    dex_a: str
    dex_b: str
    price_a: float = Field(description="Price on DEX A")
    price_b: float = Field(description="Price on DEX B")
    spread_pct: float = Field(description="Price spread percentage")
    volatility: float = Field(description="Annualized volatility")
    liquidity: float = Field(description="Available liquidity in USD")
    gas_estimate: float = Field(description="Estimated gas cost in USD")
    expected_return: float = Field(description="Expected return percentage")
    win_probability: float = Field(description="Probability of profitable execution")


# Monte Carlo Results
class MonteCarloPath(BaseModel):
    """Single Monte Carlo simulation path"""
    values: List[float] = Field(description="Path values over time")
    is_levy: bool = Field(description="Whether this path uses Lévy flights")


class MonteCarloResult(BaseModel):
    """Monte Carlo simulation output"""
    paths: List[MonteCarloPath]
    mean_return: float
    std_dev: float
    skewness: float
    kurtosis: float
    var_95: float = Field(description="Value at Risk at 95% confidence")
    cvar_95: float = Field(description="Conditional VaR at 95% confidence")
    computation_time_ms: float


# Multi-Agent Judge Results
class AgentVerdict(BaseModel):
    """Individual agent decision"""
    agent_name: Literal["RiskAgent", "GasAgent", "AlphaAgent"]
    verdict: Literal["APPROVE", "REJECT"]
    rationale: str = Field(description="Quantitative reasoning for verdict")
    metric_value: float = Field(description="Key metric that drove decision")
    threshold: float = Field(description="Threshold for this metric")


class ConsensusResult(BaseModel):
    """Multi-agent consensus"""
    verdicts: List[AgentVerdict]
    consensus: Literal["APPROVE", "REJECT"]
    confidence_score: float = Field(description="Consensus confidence (0-100)")
    computation_time_ms: float


# Kelly Optimizer Results
class KellyResult(BaseModel):
    """Kelly Criterion position sizing"""
    kelly_fraction: float = Field(description="Raw Kelly fraction")
    adjusted_fraction: float = Field(description="Correlation-adjusted fraction")
    recommended_position_pct: float = Field(description="Recommended position size as % of portfolio")
    safety_capped: bool = Field(description="Whether position was capped at 5%")
    correlation_factor: float = Field(description="Correlation adjustment factor")
    computation_time_ms: float


# Revenue Projection Results
class RevenueScenario(BaseModel):
    """Single revenue projection scenario"""
    scenario_name: Literal["Best Case", "Average Case", "Stress Case", "Black Swan"]
    daily_revenue: List[float] = Field(description="Daily revenue over 30 days")
    total_revenue: float = Field(description="Total revenue at end of period")
    max_drawdown: float = Field(description="Maximum drawdown")
    breakeven_day: Optional[int] = Field(description="Day when breakeven occurs, None if never")
    probability_weight: float = Field(description="Probability weight for this scenario")


class RevenueProjection(BaseModel):
    """30-day revenue projection across all scenarios"""
    scenarios: List[RevenueScenario]
    expected_value: float = Field(description="Probability-weighted expected revenue")
    downside_risk_pct: float = Field(description="Probability of negative outcome")
    computation_time_ms: float


# Complete Simulation Response
class SimulationResponse(BaseModel):
    """Complete simulation results"""
    opportunity: OpportunityData
    monte_carlo: MonteCarloResult
    consensus: ConsensusResult
    kelly: KellyResult
    revenue_projection: RevenueProjection
    total_computation_time_ms: float
    performance_warning: Optional[str] = Field(
        default=None,
        description="Warning if computation exceeded target time"
    )
