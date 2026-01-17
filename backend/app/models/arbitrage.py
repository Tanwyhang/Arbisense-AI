"""
Arbitrage Data Models
Migrated from Rust bot with production-grade types
"""

from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class ArbitrageStrategy(Enum):
    """Arbitrage strategy types"""
    SINGLE_MARKET = "single_market"
    CROSS_PLATFORM = "cross_platform"
    MULTI_OUTCOME = "multi_outcome"
    THREE_WAY_MARKET = "three_way_market"
    CROSS_CONDITIONAL = "cross_conditional"


class MultiOutcomeCategory(Enum):
    """Multi-outcome market categories"""
    ELECTION = "election"
    THREE_WAY_SPORTS = "three_way_sports"
    SPORTS_MULTI_WAY = "sports_multi_way"
    ENTERTAINMENT = "entertainment"
    CRYPTO = "crypto"
    OTHER = "other"


class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Trading enabled
    OPEN = "open"  # Trading disabled (tripped)
    HALF_OPEN = "half_open"  # Testing if conditions improved


class SignalType(Enum):
    """Trading signal types"""
    ENTRY = "entry"
    EXIT = "exit"
    HOLD = "hold"
    WARNING = "warning"


class SignalStrength(Enum):
    """Signal strength levels"""
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"
    VERY_STRONG = "very_strong"


class AlertPriority(Enum):
    """Alert priority levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Platform(Enum):
    """Trading platforms"""
    POLYMARKET = "polymarket"
    LIMITLESS = "limitless"


# ============================================================================
# ORDERBOOK MODELS
# ============================================================================


@dataclass
class OrderBookLevel:
    """Single level in orderbook"""
    price: float  # Price in cents (0-99 for prediction markets)
    size: float  # Available size in dollars


@dataclass
class L2OrderBook:
    """L2 orderbook with full depth"""
    market_id: str
    token_id: str
    outcome: str  # 'yes' or 'no'

    bids: List[OrderBookLevel] = field(default_factory=list)
    asks: List[OrderBookLevel] = field(default_factory=list)

    last_update: int = 0  # Unix timestamp ms

    @property
    def best_bid(self) -> Optional[float]:
        """Get best bid price"""
        return self.bids[0].price if self.bids else None

    @property
    def best_ask(self) -> Optional[float]:
        """Get best ask price"""
        return self.asks[0].price if self.asks else None

    @property
    def spread(self) -> float:
        """Calculate bid-ask spread in cents"""
        if self.best_bid and self.best_ask:
            return self.best_ask - self.best_bid
        return 0.0


@dataclass
class VWAPResult:
    """Volume-weighted average price calculation result"""
    optimal_size: float  # Optimal order size in dollars
    vwap_cents: float  # Volume-weighted average price in cents
    slippage_cents: float  # Expected slippage in cents
    total_liquidity: float  # Total liquidity considered
    levels_used: int  # Number of orderbook levels used
    execution_cost_usd: float  # Total cost including slippage

    def __repr__(self):
        return (f"VWAPResult(size=${self.optimal_size:.2f}, "
                f"vwap={self.vwap_cents:.1f}¢, "
                f"slippage={self.slippage_cents:.1f}¢, "
                f"levels={self.levels_used})")


# ============================================================================
# ARBITRAGE MODELS
# ============================================================================


@dataclass
class ArbitrageOpportunity:
    """Detected arbitrage opportunity"""
    id: str

    # Market identifiers
    polymarket_market_id: str
    polymarket_question: str
    limitless_pool: Optional[str] = None

    # Prices
    polymarket_yes_price: float = 0.0
    polymarket_no_price: float = 0.0
    limitless_price: Optional[float] = None

    # Spread analysis
    spread_pct: float = 0.0
    spread_absolute: float = 0.0
    direction: str = "poly_internal"  # poly_to_limitless, limitless_to_poly, poly_internal
    action: str = ""  # buy_poly_yes, buy_poly_no, buy_limitless, sell_limitless

    # Profit calculation
    gross_profit_pct: float = 0.0
    estimated_gas_cost: float = 0.0
    platform_fees: float = 0.0
    net_profit_pct: float = 0.0
    net_profit_usd: float = 0.0

    # Execution feasibility
    min_size: float = 10.0
    max_size: float = 1000.0
    available_liquidity: float = 0.0
    slippage_estimate: float = 0.0

    # Risk metrics
    confidence: float = 0.0
    risk_score: int = 5  # 1-10

    # Timing
    discovered_at: int = 0
    expires_at: Optional[int] = None
    time_sensitive: bool = False

    # Status
    status: str = "active"  # active, executing, expired, closed

    def __repr__(self):
        return (f"ArbitrageOpportunity(id={self.id[:12]}..., "
                f"profit=${self.net_profit_usd:.2f}, "
                f"confidence={self.confidence:.2f})")


@dataclass
class MultiOutcomeMarket:
    """Market with 3+ outcomes"""
    condition_id: str
    question: str
    category: MultiOutcomeCategory
    outcomes: List['MultiOutcome']
    is_three_way: bool = False
    event_id: Optional[str] = None


@dataclass
class MultiOutcome:
    """Single outcome in multi-outcome market"""
    token_id: str
    name: str
    yes_price: float  # Price in cents (0-99)
    liquidity: float
    index: int = 0


@dataclass
class ThreeWayMarket:
    """Three-way sports market (Home/Away/Draw)"""
    condition_id: str
    question: str

    home_team: 'TeamOutcome'
    away_team: 'TeamOutcome'
    draw: 'DrawOutcome'

    liquidity: float
    event_id: Optional[str] = None


@dataclass
class TeamOutcome:
    """Team outcome in three-way market"""
    token_id: str
    yes_price: float
    no_price: float


@dataclass
class DrawOutcome:
    """Draw outcome in three-way market"""
    token_id: str
    yes_price: float


@dataclass
class SingleMarket:
    """Single binary market"""
    condition_id: str
    question: str
    yes_price: float  # in cents
    no_price: float  # in cents
    liquidity: float


@dataclass
class CrossPlatformPair:
    """Market pair across platforms"""
    polymarket_market_id: str
    polymarket_question: str
    polymarket_yes_price: float  # in cents
    polymarket_no_price: float  # in cents
    polymarket_liquidity: float

    limitless_yes_price: Optional[float] = None  # in cents
    limitless_no_price: Optional[float] = None  # in cents
    limitless_liquidity: Optional[float] = None


# ============================================================================
# POSITION MODELS
# ============================================================================


@dataclass
class Position:
    """Trading position"""
    id: str
    market_id: str
    question: str

    platform: Platform
    outcome: str  # 'yes' or 'no'
    quantity: float  # Number of contracts
    avg_entry_price: float  # Average entry price in cents
    current_price: float  # Current market price in cents

    cost_basis_usd: float
    current_value_usd: float
    unrealized_pnl_usd: float
    unrealized_pnl_pct: float

    exposure_usd: float
    max_loss_usd: float
    max_gain_usd: float

    opened_at: int
    last_updated: int
    settled_at: Optional[int] = None


@dataclass
class ArbitragePositionPair:
    """Both legs of an arbitrage position"""
    id: str
    opportunity_id: str

    leg1: Position
    leg2: Position

    total_cost_usd: float
    current_value_usd: float
    net_pnl_usd: float
    net_pnl_pct: float

    status: str  # open, closed, settled, failed
    expected_payout_usd: float
    actual_payout_usd: Optional[float] = None
    settlement_date: Optional[int] = None


@dataclass
class FillRecord:
    """Trade execution record"""
    id: str
    position_id: str
    timestamp: int

    side: str  # 'buy' or 'sell'
    quantity: float
    price: float  # in cents
    platform: Platform

    fee_usd: float
    gas_usd: float
    total_cost_usd: float

    order_id: Optional[str] = None
    transaction_hash: Optional[str] = None
    execution_time_ms: Optional[int] = None


@dataclass
class SettlementRecord:
    """Settlement record"""
    position_id: str
    market_id: str
    outcome: str  # 'yes', 'no', 'draw'

    settled_price: float  # Final price (0 or 100 cents)
    settled_at: int
    payout_per_contract: float

    expected_payout: float
    actual_payout: float
    discrepancy: Optional[float] = None


# ============================================================================
# CIRCUIT BREAKER MODELS
# ============================================================================


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    max_position_per_market: int = 50000
    max_total_position: int = 100000
    max_daily_loss_usd: float = 500.0
    max_loss_per_trade_usd: float = 5.0
    max_consecutive_errors: int = 5
    error_cooldown_ms: int = 60000  # 1 minute
    gas_buffer_cents: int = 3
    liquidity_factor: float = 0.5


@dataclass
class ValidationResult:
    """Trade validation result"""
    can_execute: bool
    reason: Optional[str] = None


@dataclass
class TradeResult:
    """Trade execution result"""
    success: bool
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    actual_slippage_cents: Optional[float] = None
    gas_cost_usd: Optional[float] = None
    position: Optional[Position] = None


@dataclass
class DailyMetrics:
    """Daily trading metrics"""
    date: str  # YYYY-MM-DD
    total_trades: int = 0
    successful_trades: int = 0
    failed_trades: int = 0
    total_pnl_usd: float = 0.0
    max_drawdown_usd: float = 0.0
    consecutive_errors: int = 0
    total_gas_spent_usd: float = 0.0


@dataclass
class CircuitBreakerStatus:
    """Circuit breaker status"""
    state: CircuitBreakerState
    can_trade: bool
    error_count: int
    consecutive_errors: int
    daily_pnl_usd: float
    daily_loss_remaining_usd: float
    total_positions: int
    trip_time: Optional[int]


# ============================================================================
# ANALYSIS MODELS
# ============================================================================


@dataclass
class RiskAssessment:
    """Risk assessment for opportunity"""
    overall_risk: str  # low, medium, high, extreme
    liquidity_risk: int  # 1-10
    execution_risk: int  # 1-10
    timing_risk: int  # 1-10
    warnings: List[str] = field(default_factory=list)


@dataclass
class ExecutionPlan:
    """Execution plan for arbitrage"""
    yes_leg_size: float
    no_leg_size: float
    total_cost_usd: float
    expected_profit_usd: float
    gas_estimate_usd: float


@dataclass
class ArbitrageAnalysis:
    """Complete arbitrage analysis"""
    opportunity: ArbitrageOpportunity
    can_execute: bool
    optimal_size_usd: float
    expected_slippage_cents: float
    vwap_yes: float
    vwap_no: float
    confidence_score: float
    risk_assessment: RiskAssessment
    execution_plan: Optional[ExecutionPlan] = None
    validation_errors: List[str] = field(default_factory=list)


# ============================================================================
# SIGNAL MODELS
# ============================================================================


@dataclass
class ArbitrageSignal:
    """Trading signal for opportunity"""
    id: str
    opportunity_id: str

    type: SignalType
    strength: SignalStrength
    confidence_score: float

    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    target_profit_pct: Optional[float] = None
    stop_loss_pct: Optional[float] = None

    recommendation: str = ""
    urgency: str = "soon"  # immediate, soon, monitor

    risk_assessment: Optional[RiskAssessment] = None

    generated_at: int = 0
    valid_until: Optional[int] = None
    time_window_seconds: int = 60

    status: str = "active"  # active, executed, expired, invalidated


@dataclass
class ArbitrageAlert:
    """Alert for arbitrage event"""
    id: str

    priority: AlertPriority
    category: str  # opportunity, execution, risk, system, market

    title: str
    message: str
    details: Optional[dict] = None

    opportunity_id: Optional[str] = None
    signal_id: Optional[str] = None

    metrics: Optional[dict] = None

    status: str = "new"  # new, acknowledged, dismissed, actioned

    created_at: int = 0
    acknowledged_at: Optional[int] = None
    expires_at: Optional[int] = None

    sound_enabled: bool = True
    notification_sent: bool = False
