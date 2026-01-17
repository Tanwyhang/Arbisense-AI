"""
Pydantic models for AI Parameter Optimizer
Defines data structures for optimization requests, responses, and agent communications
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from enum import Enum
from datetime import datetime


class AgentRole(str, Enum):
    """Agent roles in the ring topology"""
    PROFIT_MAX = "profit_maximizer"
    RISK_AVERSE = "risk_averse"
    GAS_EFFICIENT = "gas_efficient"
    MARKET_ANALYST = "market_analyst"
    META_LEARNER = "meta_learner"


class OptimizationStatus(str, Enum):
    """Optimization session status"""
    PENDING = "pending"
    RUNNING = "running"
    CONVERGED = "converged"
    FAILED = "failed"
    COMPLETED = "completed"


# ============================================================================
# Parameter Models
# ============================================================================

class ArbitrageParameters(BaseModel):
    """Current arbitrage bot parameters"""
    min_spread_pct: float = Field(default=0.5, ge=0.1, le=2.0, description="Minimum spread % to trigger")
    min_profit_usd: float = Field(default=1.0, ge=0.5, le=10.0, description="Minimum profit in USD")
    max_risk_score: int = Field(default=8, ge=3, le=10, description="Maximum risk score (1-10)")
    min_trade_size_usd: float = Field(default=10.0, ge=1.0, le=100.0, description="Minimum trade size")
    max_trade_size_usd: float = Field(default=10000.0, ge=100.0, le=50000.0, description="Maximum trade size")
    polymarket_fee_pct: float = Field(default=0.3, ge=0.1, le=1.0, description="Polymarket fee %")
    limitless_fee_pct: float = Field(default=0.3, ge=0.1, le=1.0, description="Limitless fee %")
    default_slippage_pct: float = Field(default=0.1, ge=0.01, le=0.5, description="Default slippage %")
    base_gas_cost_usd: float = Field(default=0.50, ge=0.1, le=5.0, description="Base gas cost USD")
    gas_cost_threshold_pct: float = Field(default=35.0, ge=10.0, le=50.0, description="Max gas as % of profit")
    position_sizing_cap: float = Field(default=5.0, ge=1.0, le=10.0, description="Max position size %")
    consensus_threshold: float = Field(default=0.67, ge=0.5, le=1.0, description="Consensus threshold (0-1)")
    monte_carlo_levy_alpha: float = Field(default=1.7, ge=1.3, le=2.0, description="Lévy flight alpha")

    class Config:
        json_schema_extra = {
            "example": {
                "min_spread_pct": 0.5,
                "min_profit_usd": 1.0,
                "max_risk_score": 8,
                "gas_cost_threshold_pct": 35.0,
                "position_sizing_cap": 5.0
            }
        }


class ParameterConstraints(BaseModel):
    """Constraints for parameter optimization"""
    min_spread_pct_range: tuple = (0.1, 2.0)
    min_profit_usd_range: tuple = (0.5, 10.0)
    max_risk_score_range: tuple = (3, 10)
    max_trade_size_usd_range: tuple = (100.0, 50000.0)
    gas_cost_threshold_pct_range: tuple = (10.0, 50.0)
    position_sizing_cap_range: tuple = (1.0, 10.0)


# ============================================================================
# Performance Metrics
# ============================================================================

class PerformanceMetrics(BaseModel):
    """Current performance metrics"""
    sharpe_ratio: float = Field(default=0.0, description="Sharpe ratio")
    total_return_pct: float = Field(default=0.0, description="Total return %")
    max_drawdown_pct: float = Field(default=0.0, description="Maximum drawdown %")
    win_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Win rate (0-1)")
    profit_factor: float = Field(default=0.0, description="Profit factor (wins/losses)")
    total_trades: int = Field(default=0, ge=0, description="Total number of trades")
    average_profit_usd: float = Field(default=0.0, description="Average profit per trade")
    total_profit_usd: float = Field(default=0.0, description="Total profit in USD")
    cvar_95: float = Field(default=0.0, description="Conditional Value at Risk (95%)")
    volatility_daily: float = Field(default=0.0, description="Daily volatility")

    class Config:
        json_schema_extra = {
            "example": {
                "sharpe_ratio": 1.85,
                "total_return_pct": 12.5,
                "max_drawdown_pct": -8.3,
                "win_rate": 0.62,
                "total_trades": 145
            }
        }


# ============================================================================
# Agent Communication Models
# ============================================================================

class AgentMessage(BaseModel):
    """Message from an agent in the ring"""
    agent_id: AgentRole
    agent_name: str
    round_number: int
    timestamp: datetime
    content: str
    parameter_suggestions: Dict[str, float] = Field(default_factory=dict)
    rationale: str
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    addressed_to: Optional[AgentRole] = None

    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": "profit_maximizer",
                "agent_name": "Profit Maximizer",
                "round_number": 1,
                "content": "Current spread threshold is too conservative...",
                "parameter_suggestions": {"min_spread_pct": 0.3},
                "rationale": "Lower threshold captures more opportunities",
                "confidence_score": 0.8
            }
        }


class AgentResponse(BaseModel):
    """Structured response from an agent"""
    agent_id: AgentRole
    suggested_parameters: ArbitrageParameters
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    expected_improvement: str
    concerns: List[str] = Field(default_factory=list)


# ============================================================================
# Consensus Models
# ============================================================================

class ConsensusState(BaseModel):
    """Current state of consensus among agents"""
    round_number: int
    total_rounds: int
    convergence_score: float = Field(ge=0.0, le=1.0, description="Agreement level (0-1)")
    has_converged: bool = False
    agreed_parameters: Optional[ArbitrageParameters] = None
    agent_agreements: Dict[AgentRole, bool] = Field(default_factory=dict)
    confidence_scores: Dict[AgentRole, float] = Field(default_factory=dict)
    outstanding_disagreements: List[str] = Field(default_factory=list)


# ============================================================================
# Simulation Models
# ============================================================================

class SimulationConfig(BaseModel):
    """Configuration for simulation testing"""
    use_historical_data: bool = True
    historical_days: int = Field(default=30, ge=7, le=90)
    monte_carlo_paths: int = Field(default=150, ge=100, le=5000)
    monte_carlo_days: int = Field(default=30, ge=7, le=90)
    random_seed: Optional[int] = None


class SimulationResult(BaseModel):
    """Results from simulation testing"""
    simulation_id: str
    proposed_parameters: ArbitrageParameters
    baseline_metrics: PerformanceMetrics
    proposed_metrics: PerformanceMetrics
    improvement_summary: Dict[str, float] = Field(default_factory=dict)
    monte_carlo_distribution: Optional[Dict[str, List[float]]] = None
    backtest_trades: List[Dict[str, Any]] = Field(default_factory=list)
    recommendation: str = Field(description="ACCEPT, REJECT, or REVIEW")
    confidence: float = Field(ge=0.0, le=1.0)
    warnings: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "simulation_id": "sim_abc123",
                "recommendation": "ACCEPT",
                "confidence": 0.85,
                "improvement_summary": {
                    "sharpe_ratio_improvement": 0.23,
                    "drawdown_reduction": -2.5
                }
            }
        }


# ============================================================================
# Optimization Session Models
# ============================================================================

class OptimizationRequest(BaseModel):
    """Request to start optimization"""
    current_parameters: ArbitrageParameters
    current_metrics: PerformanceMetrics
    constraints: Optional[ParameterConstraints] = None
    optimization_goal: str = Field(
        default="balanced",
        description="Goal: profit, risk, gas, balanced"
    )
    max_iterations: int = Field(default=3, ge=1, le=5)
    agent_count: int = Field(default=5, ge=3, le=7)


class OptimizationSession(BaseModel):
    """Active optimization session"""
    session_id: str
    status: OptimizationStatus
    created_at: datetime
    updated_at: datetime
    request: OptimizationRequest
    consensus_state: Optional[ConsensusState] = None
    agent_messages: List[AgentMessage] = Field(default_factory=list)
    simulation_result: Optional[SimulationResult] = None
    final_parameters: Optional[ArbitrageParameters] = None
    applied: bool = False
    error_message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "opt_xyz789",
                "status": "completed",
                "created_at": "2025-01-17T10:30:00Z",
                "applied": False
            }
        }


# ============================================================================
# API Request/Response Models
# ============================================================================

class StartOptimizationResponse(BaseModel):
    """Response when starting optimization"""
    session_id: str
    status: OptimizationStatus
    message: str
    estimated_time_seconds: int


class OptimizationStatusResponse(BaseModel):
    """Response for status check"""
    session_id: str
    status: OptimizationStatus
    progress_percentage: float = Field(ge=0.0, le=100.0)
    current_round: int
    total_rounds: int
    consensus_score: float
    agent_messages_count: int
    simulation_complete: bool
    estimated_remaining_seconds: Optional[int] = None


class ApprovalRequest(BaseModel):
    """Request to apply optimized parameters"""
    session_id: str
    approve: bool
    reason: Optional[str] = None


class ApprovalResponse(BaseModel):
    """Response to parameter approval"""
    success: bool
    message: str
    applied_parameters: Optional[ArbitrageParameters] = None
    rollback_available: bool = True
    audit_log_id: Optional[str] = None
