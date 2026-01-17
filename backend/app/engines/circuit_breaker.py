"""
Circuit Breaker and Risk Management System
Migrated from Rust bot circuit_breaker.rs

Implements production-grade risk management with configurable limits and automatic shutoffs

Key Features:
- Position limits per market and total
- Daily loss limits with automatic trading halt
- Per-trade loss limits
- Consecutive error tracking
- Gas cost buffers
- Automatic circuit breaker trip and recovery
"""

import logging
from typing import Dict, Optional, List
from datetime import datetime, date
from dataclasses import dataclass, field

from app.models.arbitrage import (
    CircuitBreakerConfig,
    CircuitBreakerState,
    ValidationResult,
    TradeResult,
    DailyMetrics,
    CircuitBreakerStatus,
    Position,
)

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """
    Circuit breaker for trading risk management

    State transitions:
    - CLOSED: Trading enabled (normal operation)
    - OPEN: Trading disabled (circuit tripped)
    - HALF_OPEN: Testing if conditions improved

    Automatic transitions:
    - CLOSED → OPEN: When limits exceeded
    - OPEN → HALF_OPEN: After cooldown period
    - HALF_OPEN → CLOSED: When conditions improved
    """

    def __init__(self, config: Optional[CircuitBreakerConfig] = None):
        """
        Initialize circuit breaker

        Args:
            config: Circuit breaker configuration (uses defaults if None)
        """
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitBreakerState.CLOSED
        self.positions: Dict[str, Position] = {}
        self.daily_metrics = self._initialize_daily_metrics()
        self.trip_time: Optional[int] = None
        self.error_count = 0
        self.last_reset_time = int(datetime.now().timestamp() * 1000)

        logger.info(f"[CIRCUIT BREAKER] Initialized with state: {self.state.value}")

    # ========================================================================
    # STATE MANAGEMENT
    # ========================================================================

    def get_state(self) -> CircuitBreakerState:
        """
        Get current circuit breaker state with auto-transitions

        Returns:
            Current CircuitBreakerState
        """
        now_ms = int(datetime.now().timestamp() * 1000)

        # Auto-transition from HALF_OPEN to CLOSED
        if self.state == CircuitBreakerState.HALF_OPEN and self._can_reset():
            self.state = CircuitBreakerState.CLOSED
            self.error_count = 0
            self.trip_time = None
            logger.info("[CIRCUIT BREAKER] HALF_OPEN → CLOSED (conditions improved)")

        # Auto-transition from OPEN to HALF_OPEN after cooldown
        if (
            self.state == CircuitBreakerState.OPEN
            and self.trip_time
            and (now_ms - self.trip_time) > self.config.error_cooldown_ms
        ):
            self.state = CircuitBreakerState.HALF_OPEN
            self.error_count = max(1, self.error_count // 2)  # Reduce error count
            logger.info(f"[CIRCUIT BREAKER] OPEN → HALF_OPEN (cooldown elapsed)")

        return self.state

    def can_trade(self) -> bool:
        """
        Check if trading is allowed

        Returns:
            True if trading allowed, False otherwise
        """
        state = self.get_state()
        return state in [CircuitBreakerState.CLOSED, CircuitBreakerState.HALF_OPEN]

    def _can_reset(self) -> bool:
        """Check if circuit breaker can be reset to CLOSED"""
        return (
            self.error_count == 0
            and self.daily_metrics.consecutive_errors < self.config.max_consecutive_errors
            and self.daily_metrics.total_pnl_usd > -self.config.max_daily_loss_usd
        )

    def _trip(self, reason: str) -> None:
        """
        Trip the circuit breaker (halt trading)

        Args:
            reason: Reason for tripping
        """
        self.state = CircuitBreakerState.OPEN
        self.trip_time = int(datetime.now().timestamp() * 1000)
        logger.error(f"[CIRCUIT BREAKER] TRIPPED: {reason}")

    # ========================================================================
    # TRADE VALIDATION
    # ========================================================================

    def validate_trade(
        self,
        market_id: str,
        trade_size_usd: float,
        estimated_loss_usd: float,
    ) -> ValidationResult:
        """
        Validate if a trade can be executed

        Checks:
        1. Circuit breaker state
        2. Position limits (per market and total)
        3. Daily loss limit
        4. Per-trade loss limit

        Args:
            market_id: Market identifier
            trade_size_usd: Trade size in dollars
            estimated_loss_usd: Estimated maximum loss in dollars

        Returns:
            ValidationResult with can_execute flag and reason
        """
        # Check circuit breaker state
        if not self.can_trade():
            return ValidationResult(
                can_execute=False,
                reason=f"Circuit breaker is {self.state.value}",
            )

        # Check daily loss limit
        projected_loss = self.daily_metrics.total_pnl_usd - estimated_loss_usd
        if projected_loss < -self.config.max_daily_loss_usd:
            self._trip(f"Daily loss limit exceeded: ${projected_loss:.2f}")
            return ValidationResult(
                can_execute=False,
                reason="Daily loss limit would be exceeded",
            )

        # Check per-trade loss limit
        if estimated_loss_usd > self.config.max_loss_per_trade_usd:
            return ValidationResult(
                can_execute=False,
                reason=f"Per-trade loss limit exceeded: ${estimated_loss_usd:.2f}",
            )

        # Check position limits
        current_position = self.positions.get(market_id)
        current_position_size = (
            current_position.quantity if current_position else 0
        )
        new_position_size = current_position_size + trade_size_usd

        if new_position_size > self.config.max_position_per_market:
            return ValidationResult(
                can_execute=False,
                reason=f"Position limit for market would be exceeded: "
                f"{new_position_size:.0f} > {self.config.max_position_per_market}",
            )

        # Check total position limit
        total_position = self._calculate_total_position()
        if total_position + trade_size_usd > self.config.max_total_position:
            return ValidationResult(
                can_execute=False,
                reason="Total position limit would be exceeded",
            )

        return ValidationResult(can_execute=True)

    # ========================================================================
    # POSITION TRACKING
    # ========================================================================

    def update_position(self, market_id: str, result: TradeResult) -> None:
        """
        Update position after trade execution

        Args:
            market_id: Market identifier
            result: Trade execution result
        """
        if not result.success:
            self._handle_error(result.error_message or "Unknown error")
            return

        # Reset error count on success
        self.error_count = 0
        self.daily_metrics.consecutive_errors = 0

        # Update position (simplified - in real system would track actual fills)
        if result.position and not self.positions.get(market_id):
            self.positions[market_id] = result.position
            logger.info(f"[POSITION TRACKER] Added position: {result.position.id}")

    def get_position(self, market_id: str) -> Optional[Position]:
        """
        Get position for a market

        Args:
            market_id: Market identifier

        Returns:
            Position if exists, None otherwise
        """
        return self.positions.get(market_id)

    def get_all_positions(self) -> List[Position]:
        """Get all open positions"""
        return list(self.positions.values())

    def _calculate_total_position(self) -> float:
        """Calculate total position size across all markets"""
        total = 0.0
        for position in self.positions.values():
            total += position.quantity
        return total

    def calculate_unrealized_pnl(self) -> float:
        """
        Calculate unrealized P&L for all positions

        Returns:
            Total unrealized P&L in USD
        """
        total_pnl = 0.0
        for position in self.positions.values():
            total_pnl += position.unrealized_pnl_usd
        return total_pnl

    # ========================================================================
    # ERROR HANDLING
    # ========================================================================

    def _handle_error(self, error_message: str) -> None:
        """
        Handle trade execution error

        Args:
            error_message: Error description
        """
        self.error_count += 1
        self.daily_metrics.consecutive_errors += 1
        self.daily_metrics.failed_trades += 1

        logger.error(
                    f"[CIRCUIT BREAKER] Error ({self.error_count}/{self.config.max_consecutive_errors}): {error_message}"
        )

        # Trip circuit breaker if too many consecutive errors
        if self.error_count >= self.config.max_consecutive_errors:
            self._trip(f"Too many consecutive errors: {self.error_count}")

    def record_success(self, trade_result: TradeResult) -> None:
        """
        Record successful trade

        Args:
            trade_result: Trade execution result
        """
        self.daily_metrics.successful_trades += 1
        self.daily_metrics.total_trades += 1

        # Update P&L
        if trade_result.position:
            self.daily_metrics.total_pnl_usd += trade_result.position.unrealized_pnl_usd

        # Track gas costs
        if trade_result.gas_cost_usd:
            self.daily_metrics.total_gas_spent_usd += trade_result.gas_cost_usd

        # Reset error count on success
        self.error_count = 0
        self.daily_metrics.consecutive_errors = 0

        logger.info(f"[CIRCUIT BREAKER] Trade recorded successfully")

    # ========================================================================
    # METRICS AND REPORTING
    # ========================================================================

    def get_daily_metrics(self) -> DailyMetrics:
        """
        Get daily metrics

        Returns:
            Current DailyMetrics
        """
        # Reset if new day
        today = date.today().isoformat()
        if self.daily_metrics.date != today:
            self.daily_metrics = self._initialize_daily_metrics()

        return self.daily_metrics

    def _initialize_daily_metrics(self) -> DailyMetrics:
        """Initialize daily metrics for new day"""
        today = date.today().isoformat()
        logger.info(f"[CIRCUIT BREAKER] Initialized daily metrics for {today}")
        return DailyMetrics(
            date=today,
            total_trades=0,
            successful_trades=0,
            failed_trades=0,
            total_pnl_usd=0.0,
            max_drawdown_usd=0.0,
            consecutive_errors=0,
            total_gas_spent_usd=0.0,
        )

    def get_status(self) -> CircuitBreakerStatus:
        """
        Get circuit breaker status

        Returns:
            CircuitBreakerStatus with current state
        """
        metrics = self.get_daily_metrics()
        state = self.get_state()

        return CircuitBreakerStatus(
            state=state,
            can_trade=self.can_trade(),
            error_count=self.error_count,
            consecutive_errors=metrics.consecutive_errors,
            daily_pnl_usd=metrics.total_pnl_usd,
            daily_loss_remaining_usd=self.config.max_daily_loss_usd
            - abs(metrics.total_pnl_usd),
            total_positions=len(self.positions),
            trip_time=self.trip_time,
        )

    def get_diagnostics(self) -> dict:
        """
        Get detailed diagnostics

        Returns:
            Dictionary with diagnostic information
        """
        return {
            "config": {
                "max_position_per_market": self.config.max_position_per_market,
                "max_total_position": self.config.max_total_position,
                "max_daily_loss_usd": self.config.max_daily_loss_usd,
                "max_loss_per_trade_usd": self.config.max_loss_per_trade_usd,
                "max_consecutive_errors": self.config.max_consecutive_errors,
                "error_cooldown_ms": self.config.error_cooldown_ms,
                "gas_buffer_cents": self.config.gas_buffer_cents,
                "liquidity_factor": self.config.liquidity_factor,
            },
            "state": self.get_state().value,
            "positions": [p.__dict__ for p in self.get_all_positions()],
            "daily_metrics": {
                "date": self.daily_metrics.date,
                "total_trades": self.daily_metrics.total_trades,
                "successful_trades": self.daily_metrics.successful_trades,
                "failed_trades": self.daily_metrics.failed_trades,
                "total_pnl_usd": self.daily_metrics.total_pnl_usd,
                "consecutive_errors": self.daily_metrics.consecutive_errors,
                "total_gas_spent_usd": self.daily_metrics.total_gas_spent_usd,
            },
            "status": self.get_status().__dict__,
        }

    # ========================================================================
    # MANUAL CONTROLS
    # ========================================================================

    def manual_reset(self) -> None:
        """Manually reset circuit breaker (use with caution)"""
        logger.warning("[CIRCUIT BREAKER] Manual reset requested")
        self.state = CircuitBreakerState.CLOSED
        self.error_count = 0
        self.trip_time = None
        self.daily_metrics.consecutive_errors = 0
        logger.info("[CIRCUIT BREAKER] Manually reset to CLOSED")

    def manual_trip(self, reason: str = "Manual trip") -> None:
        """Manually trip circuit breaker (emergency stop)"""
        logger.warning(f"[CIRCUIT BREAKER] Manual trip requested: {reason}")
        self._trip(f"Manual: {reason}")

    def update_config(self, **kwargs) -> None:
        """
        Update configuration parameters

        Args:
            **kwargs: Configuration parameters to update
        """
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                logger.info(f"[CIRCUIT BREAKER] Updated config: {key} = {value}")
            else:
                logger.warning(f"[CIRCUIT BREAKER] Unknown config key: {key}")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_circuit_breaker(**kwargs) -> CircuitBreaker:
    """
    Create a circuit breaker instance

    Args:
        **kwargs: Configuration parameters

    Returns:
        CircuitBreaker instance
    """
    config = CircuitBreakerConfig(**kwargs)
    return CircuitBreaker(config)


def validate_config(config: CircuitBreakerConfig) -> dict:
    """
    Validate circuit breaker configuration

    Args:
        config: Configuration to validate

    Returns:
        Dictionary with is_valid flag and errors list
    """
    errors = []

    if config.max_position_per_market <= 0:
        errors.append("max_position_per_market must be positive")

    if config.max_total_position <= 0:
        errors.append("max_total_position must be positive")

    if config.max_total_position < config.max_position_per_market:
        errors.append("max_total_position must be >= max_position_per_market")

    if config.max_daily_loss_usd <= 0:
        errors.append("max_daily_loss_usd must be positive")

    if config.max_loss_per_trade_usd < 0:
        errors.append("max_loss_per_trade_usd must be non-negative")

    if config.max_consecutive_errors <= 0:
        errors.append("max_consecutive_errors must be positive")

    if config.gas_buffer_cents < 0:
        errors.append("gas_buffer_cents must be non-negative")

    if not (0 < config.liquidity_factor <= 1):
        errors.append("liquidity_factor must be in (0, 1]")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
    }
