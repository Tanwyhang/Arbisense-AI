"""
Parameter Optimizer Engine
Tracks current bot parameters, performance metrics, and calculates sensitivity
"""
import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from dataclasses import dataclass, field

from app.models.optimizer import (
    ArbitrageParameters,
    PerformanceMetrics,
    ParameterConstraints,
    OptimizationRequest
)
from app.config import config


@dataclass
class ParameterHistory:
    """Historical parameter values and performance"""
    parameters: ArbitrageParameters
    metrics: PerformanceMetrics
    timestamp: datetime
    session_id: Optional[str] = None


class ParameterOptimizer:
    """
    Manages arbitrage bot parameters and tracks performance over time
    Provides parameter sensitivity analysis and trend detection
    """

    def __init__(self):
        # Current state
        self.current_parameters: Optional[ArbitrageParameters] = None
        self.current_metrics: Optional[PerformanceMetrics] = None

        # Historical tracking
        self.parameter_history: List[ParameterHistory] = []
        self.max_history_days = 90

        # Default parameters (from config.json defaults)
        self.default_parameters = ArbitrageParameters()

        # Parameter constraints
        self.constraints = ParameterConstraints()

        # Performance baselines
        self.baseline_metrics: Optional[PerformanceMetrics] = None

        # Lock for thread safety
        self._lock = asyncio.Lock()

    async def initialize(self, current_params: Optional[ArbitrageParameters] = None):
        """
        Initialize optimizer with current parameters

        Args:
            current_params: Current bot parameters (uses defaults if None)
        """
        async with self._lock:
            if current_params:
                self.current_parameters = current_params
            else:
                self.current_parameters = self.default_parameters

            # Initialize with zero metrics if not provided
            if not self.current_metrics:
                self.current_metrics = PerformanceMetrics()

            # Store initial state
            self._store_history(
                parameters=self.current_parameters,
                metrics=self.current_metrics
            )

    async def update_parameters(
        self,
        parameters: ArbitrageParameters,
        metrics: Optional[PerformanceMetrics] = None,
        session_id: Optional[str] = None
    ):
        """
        Update current parameters and metrics

        Args:
            parameters: New parameters
            metrics: Current performance metrics
            session_id: Optimization session ID (if from optimization)
        """
        async with self._lock:
            self.current_parameters = parameters
            if metrics:
                self.current_metrics = metrics

            # Store in history
            self._store_history(
                parameters=parameters,
                metrics=metrics or self.current_metrics,
                session_id=session_id
            )

            # Clean old history
            self._cleanup_old_history()

    def _store_history(
        self,
        parameters: ArbitrageParameters,
        metrics: PerformanceMetrics,
        session_id: Optional[str] = None
    ):
        """Store parameter history entry"""
        entry = ParameterHistory(
            parameters=parameters,
            metrics=metrics,
            timestamp=datetime.utcnow(),
            session_id=session_id
        )
        self.parameter_history.append(entry)

    def _cleanup_old_history(self):
        """Remove history entries older than max_history_days"""
        cutoff = datetime.utcnow() - timedelta(days=self.max_history_days)
        self.parameter_history = [
            h for h in self.parameter_history
            if h.timestamp > cutoff
        ]

    async def get_parameter_sensitivity(
        self,
        parameter_name: str,
        window_days: int = 30
    ) -> Dict[str, float]:
        """
        Analyze sensitivity of performance to a specific parameter

        Args:
            parameter_name: Name of parameter to analyze
            window_days: Lookback period in days

        Returns:
            Sensitivity metrics including correlation, elasticity
        """
        cutoff = datetime.utcnow() - timedelta(days=window_days)
        recent_history = [
            h for h in self.parameter_history
            if h.timestamp > cutoff and len(h.parameter_history) > 1
        ]

        if len(recent_history) < 2:
            return {
                "correlation": 0.0,
                "elasticity": 0.0,
                "sample_size": len(recent_history),
                "insufficient_data": True
            }

        # Extract parameter values and performance metric
        param_values = []
        performance_values = []

        for entry in recent_history:
            try:
                param_val = getattr(entry.parameters, parameter_name, None)
                if param_val is not None:
                    param_values.append(param_val)
                    # Use Sharpe ratio as performance metric
                    performance_values.append(entry.metrics.sharpe_ratio)
            except AttributeError:
                continue

        if len(param_values) < 2:
            return {
                "correlation": 0.0,
                "elasticity": 0.0,
                "sample_size": 0,
                "insufficient_data": True
            }

        # Calculate correlation
        correlation = np.corrcoef(param_values, performance_values)[0, 1]

        # Calculate elasticity (percentage change in performance / percentage change in parameter)
        param_pct_changes = np.diff(param_values) / param_values[:-1] * 100
        perf_pct_changes = np.diff(performance_values) / np.array(performance_values[:-1] + 1e-6) * 100

        # Avoid division by zero
        valid_indices = np.abs(param_pct_changes) > 1e-6
        if np.sum(valid_indices) > 0:
            elasticities = perf_pct_changes[valid_indices] / param_pct_changes[valid_indices]
            elasticity = np.mean(elasticities) if len(elasticities) > 0 else 0.0
        else:
            elasticity = 0.0

        return {
            "correlation": float(correlation) if not np.isnan(correlation) else 0.0,
            "elasticity": float(elasticity) if not np.isnan(elasticity) else 0.0,
            "sample_size": len(param_values),
            "insufficient_data": False
        }

    async def get_parameter_trends(
        self,
        window_days: int = 7
    ) -> Dict[str, Dict[str, float]]:
        """
        Get trends for all parameters over the specified window

        Args:
            window_days: Lookback period

        Returns:
            Dictionary of parameter trends (direction, magnitude, volatility)
        """
        cutoff = datetime.utcnow() - timedelta(days=window_days)
        recent_history = [
            h for h in self.parameter_history
            if h.timestamp > cutoff
        ]

        if len(recent_history) < 2:
            return {}

        trends = {}
        param_names = [
            "min_spread_pct",
            "min_profit_usd",
            "max_risk_score",
            "max_trade_size_usd",
            "gas_cost_threshold_pct",
            "position_sizing_cap"
        ]

        for param_name in param_names:
            values = []
            timestamps = []

            for entry in recent_history:
                try:
                    val = getattr(entry.parameters, param_name, None)
                    if val is not None:
                        values.append(val)
                        timestamps.append(entry.timestamp.timestamp())
                except AttributeError:
                    continue

            if len(values) >= 2:
                # Calculate trend direction and magnitude
                first_val = values[0]
                last_val = values[-1]
                change = last_val - first_val
                pct_change = (change / first_val) * 100 if first_val != 0 else 0.0

                # Calculate volatility (standard deviation)
                volatility = np.std(values)

                # Linear regression slope (trend per day)
                if len(values) >= 3:
                    coeffs = np.polyfit(range(len(values)), values, 1)
                    slope = coeffs[0]
                else:
                    slope = 0.0

                trends[param_name] = {
                    "direction": "increasing" if change > 0 else "decreasing" if change < 0 else "stable",
                    "change": float(change),
                    "pct_change": float(pct_change),
                    "volatility": float(volatility),
                    "slope_per_day": float(slope),
                    "sample_size": len(values)
                }

        return trends

    async def get_performance_baseline(
        self,
        window_days: int = 30
    ) -> PerformanceMetrics:
        """
        Calculate baseline performance metrics over the window

        Args:
            window_days: Lookback period

        Returns:
            Averaged performance metrics
        """
        cutoff = datetime.utcnow() - timedelta(days=window_days)
        recent_history = [
            h for h in self.parameter_history
            if h.timestamp > cutoff
        ]

        if not recent_history:
            return PerformanceMetrics()

        # Aggregate metrics
        total_trades = sum(h.metrics.total_trades for h in recent_history)
        total_profit = sum(h.metrics.total_profit_usd for h in recent_history)

        # Average metrics
        sharpe_ratios = [h.metrics.sharpe_ratio for h in recent_history if h.metrics.sharpe_ratio != 0]
        returns = [h.metrics.total_return_pct for h in recent_history if h.metrics.total_return_pct != 0]
        drawdowns = [h.metrics.max_drawdown_pct for h in recent_history if h.metrics.max_drawdown_pct != 0]
        win_rates = [h.metrics.win_rate for h in recent_history if h.metrics.win_rate > 0]

        baseline = PerformanceMetrics(
            sharpe_ratio=np.mean(sharpe_ratios) if sharpe_ratios else 0.0,
            total_return_pct=np.mean(returns) if returns else 0.0,
            max_drawdown_pct=np.mean(drawdowns) if drawdowns else 0.0,
            win_rate=np.mean(win_rates) if win_rates else 0.0,
            total_trades=int(total_trades / len(recent_history)),
            total_profit_usd=total_profit,
            average_profit_usd=total_profit / max(total_trades, 1)
        )

        return baseline

    async def validate_parameters(
        self,
        parameters: ArbitrageParameters
    ) -> Tuple[bool, List[str]]:
        """
        Validate parameters against constraints

        Args:
            parameters: Parameters to validate

        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations = []

        # Check spread constraints
        if not (self.constraints.min_spread_pct_range[0] <= parameters.min_spread_pct <= self.constraints.min_spread_pct_range[1]):
            violations.append(
                f"min_spread_pct {parameters.min_spread_pct} outside range {self.constraints.min_spread_pct_range}"
            )

        # Check profit constraints
        if not (self.constraints.min_profit_usd_range[0] <= parameters.min_profit_usd <= self.constraints.min_profit_usd_range[1]):
            violations.append(
                f"min_profit_usd {parameters.min_profit_usd} outside range {self.constraints.min_profit_usd_range}"
            )

        # Check risk score constraints
        if not (self.constraints.max_risk_score_range[0] <= parameters.max_risk_score <= self.constraints.max_risk_score_range[1]):
            violations.append(
                f"max_risk_score {parameters.max_risk_score} outside range {self.constraints.max_risk_score_range}"
            )

        # Check trade size constraints
        if not (self.constraints.max_trade_size_usd_range[0] <= parameters.max_trade_size_usd <= self.constraints.max_trade_size_usd_range[1]):
            violations.append(
                f"max_trade_size_usd {parameters.max_trade_size_usd} outside range {self.constraints.max_trade_size_usd_range}"
            )

        # Check gas threshold constraints
        if not (self.constraints.gas_cost_threshold_pct_range[0] <= parameters.gas_cost_threshold_pct <= self.constraints.gas_cost_threshold_pct_range[1]):
            violations.append(
                f"gas_cost_threshold_pct {parameters.gas_cost_threshold_pct} outside range {self.constraints.gas_cost_threshold_pct_range}"
            )

        # Check position sizing constraints
        if not (self.constraints.position_sizing_cap_range[0] <= parameters.position_sizing_cap <= self.constraints.position_sizing_cap_range[1]):
            violations.append(
                f"position_sizing_cap {parameters.position_sizing_cap} outside range {self.constraints.position_sizing_cap_range}"
            )

        # Logical consistency checks
        if parameters.min_trade_size_usd >= parameters.max_trade_size_usd:
            violations.append("min_trade_size_usd must be less than max_trade_size_usd")

        if parameters.polymarket_fee_pct + parameters.limitless_fee_pct > 2.0:
            violations.append("Combined fees exceed 2% (very conservative)")

        return len(violations) == 0, violations

    def get_current_state(self) -> Dict[str, any]:
        """Get current parameter and metrics state"""
        return {
            "parameters": self.current_parameters.dict() if self.current_parameters else {},
            "metrics": self.current_metrics.dict() if self.current_metrics else {},
            "history_count": len(self.parameter_history),
            "last_updated": max([h.timestamp for h in self.parameter_history]).isoformat() if self.parameter_history else None
        }


# Singleton instance
_parameter_optimizer: Optional[ParameterOptimizer] = None


def get_parameter_optimizer() -> ParameterOptimizer:
    """Get or create the singleton parameter optimizer"""
    global _parameter_optimizer
    if _parameter_optimizer is None:
        _parameter_optimizer = ParameterOptimizer()
    return _parameter_optimizer
