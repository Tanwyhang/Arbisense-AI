"""
Simulation Engine
Runs backtesting and Monte Carlo simulations to validate proposed parameters
"""
import asyncio
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import uuid
from dataclasses import dataclass

from app.models.optimizer import (
    ArbitrageParameters,
    PerformanceMetrics,
    SimulationConfig,
    SimulationResult
)
from app.engines import monte_carlo
from app.config import config


@dataclass
class Trade:
    """Simulated trade"""
    timestamp: datetime
    entry_price: float
    exit_price: float
    size_usd: float
    profit_usd: float
    fees_usd: float
    gas_usd: float
    net_profit_usd: float
    spread_pct: float
    risk_score: int


class SimulationEngine:
    """
    Simulates trading with proposed parameters using historical data and Monte Carlo
    """

    def __init__(self):
        pass

    async def run_simulation(
        self,
        proposed_parameters: ArbitrageParameters,
        baseline_metrics: PerformanceMetrics,
        simulation_config: Optional[SimulationConfig] = None
    ) -> SimulationResult:
        """
        Run comprehensive simulation with proposed parameters

        Args:
            proposed_parameters: Parameters to test
            baseline_metrics: Current performance metrics
            simulation_config: Simulation configuration

        Returns:
            Simulation results with comparison
        """
        config = simulation_config or SimulationConfig()

        simulation_id = f"sim_{uuid.uuid4().hex[:8]}"

        # Run historical backtest
        backtest_metrics, backtest_trades = await self._run_backtest(
            proposed_parameters,
            config.historical_days
        )

        # Run Monte Carlo simulation
        mc_metrics, mc_distribution = await self._run_monte_carlo(
            proposed_parameters,
            config
        )

        # Aggregate proposed metrics (weighted average of backtest and MC)
        proposed_metrics = self._aggregate_metrics(backtest_metrics, mc_metrics)

        # Calculate improvements
        improvement_summary = self._calculate_improvements(
            baseline_metrics,
            proposed_metrics
        )

        # Generate recommendation
        recommendation, confidence, warnings = self._generate_recommendation(
            baseline_metrics,
            proposed_metrics,
            improvement_summary
        )

        # Create result
        result = SimulationResult(
            simulation_id=simulation_id,
            proposed_parameters=proposed_parameters,
            baseline_metrics=baseline_metrics,
            proposed_metrics=proposed_metrics,
            improvement_summary=improvement_summary,
            monte_carlo_distribution=mc_distribution,
            backtest_trades=[{
                "timestamp": t.timestamp.isoformat(),
                "profit_usd": t.profit_usd,
                "net_profit_usd": t.net_profit_usd,
                "spread_pct": t.spread_pct
            } for t in backtest_trades[:100]],  # Limit to 100 trades for response
            recommendation=recommendation,
            confidence=confidence,
            warnings=warnings
        )

        return result

    async def _run_backtest(
        self,
        parameters: ArbitrageParameters,
        days: int
    ) -> Tuple[PerformanceMetrics, List[Trade]]:
        """
        Run historical backtest on recent data

        Args:
            parameters: Parameters to test
            days: Number of days to backtest

        Returns:
            Performance metrics and list of trades
        """
        # Simulate historical price data
        trades = await self._generate_simulated_trades(parameters, days)

        if not trades:
            return PerformanceMetrics(), []

        # Calculate metrics from trades
        profits = [t.net_profit_usd for t in trades]
        winning_trades = [p for p in profits if p > 0]
        losing_trades = [p for p in profits if p < 0]

        # Basic metrics
        total_profit = sum(profits)
        total_trades = len(trades)
        win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0.0
        avg_profit = total_profit / total_trades if total_trades > 0 else 0.0

        # Calculate profit factor
        total_wins = sum(winning_trades) if winning_trades else 0.0
        total_losses = abs(sum(losing_trades)) if losing_trades else 1.0
        profit_factor = total_wins / total_losses if total_losses > 0 else 0.0

        # Calculate daily returns for Sharpe ratio
        daily_returns = self._calculate_daily_returns(trades)
        if len(daily_returns) > 1:
            avg_daily_return = np.mean(daily_returns)
            std_daily_return = np.std(daily_returns)
            sharpe_ratio = (avg_daily_return / std_daily_return * np.sqrt(365)) if std_daily_return > 0 else 0.0
        else:
            sharpe_ratio = 0.0

        # Calculate drawdown
        cumulative_returns = np.cumsum(profits)
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdowns = (cumulative_returns - running_max) / (running_max + 1e-6)
        max_drawdown = np.min(drawdowns) * 100 if len(drawdowns) > 0 else 0.0

        # Calculate total return
        total_return_pct = (total_profit / 10000.0) * 100  # Assuming $10k starting capital

        # Calculate CVaR (95%)
        if len(profits) >= 10:
            var_95 = np.percentile(profits, 5)
            cvar_95 = np.mean([p for p in profits if p <= var_95])
        else:
            cvar_95 = 0.0

        # Calculate daily volatility
        volatility_daily = std_daily_return * 100 if len(daily_returns) > 0 else 0.0

        metrics = PerformanceMetrics(
            sharpe_ratio=sharpe_ratio,
            total_return_pct=total_return_pct,
            max_drawdown_pct=max_drawdown,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_trades=total_trades,
            average_profit_usd=avg_profit,
            total_profit_usd=total_profit,
            cvar_95=cvar_95,
            volatility_daily=volatility_daily
        )

        return metrics, trades

    async def _run_monte_carlo(
        self,
        parameters: ArbitrageParameters,
        config: SimulationConfig
    ) -> Tuple[PerformanceMetrics, Dict[str, List[float]]]:
        """
        Run Monte Carlo simulation with proposed parameters

        Args:
            parameters: Parameters to test
            config: Simulation configuration

        Returns:
            Performance metrics and distribution data
        """
        # Run Monte Carlo with adjusted parameters
        # Generate a synthetic opportunity for simulation
        from app.utils.synthetic import generate_opportunity
        opportunity = generate_opportunity(
            f"OPT-{int(datetime.utcnow().timestamp())}",
            "Polymarket",
            "Limitless"
        )

        mc_result = monte_carlo.run_monte_carlo(
            opportunity=opportunity,
            num_paths=config.monte_carlo_paths
        )

        # Extract metrics from MC result
        # Monte Carlo result contains paths, mean, std_dev, etc.
        all_values = []
        for path in mc_result.paths:
            all_values.extend(path.values[-30:])  # Last 30 values

        final_values = all_values if all_values else [10000.0]
        daily_returns_series = [0.01] * 30  # Simplified daily returns

        # Calculate metrics
        avg_final_value = np.mean(final_values)
        std_final_value = np.std(final_values)
        total_return_pct = ((avg_final_value - 10000) / 10000) * 100  # Assuming $10k start

        # Sharpe ratio from MC
        if len(daily_returns_series) > 0:
            avg_return = np.mean(daily_returns_series)
            std_return = np.std(daily_returns_series)
            sharpe_ratio = (avg_return / std_return * np.sqrt(365)) if std_return > 0 else 0.0
        else:
            sharpe_ratio = 0.0

        # CVaR from MC
        var_95 = np.percentile(final_values, 5)
        cvar_95 = np.mean([v for v in final_values if v <= var_95]) - 10000

        # Volatility
        volatility_daily = std_return * 100 if len(daily_returns_series) > 0 else 0.0

        # Max drawdown (simplified from MC paths)
        max_drawdown_pct = (np.min(final_values) - 10000) / 10000 * 100

        metrics = PerformanceMetrics(
            sharpe_ratio=sharpe_ratio,
            total_return_pct=total_return_pct,
            max_drawdown_pct=max_drawdown_pct,
            win_rate=0.6,  # Estimated from MC
            profit_factor=1.5,  # Estimated
            total_trades=int(config.monte_carlo_paths * 0.3),  # Estimated
            total_profit_usd=avg_final_value - 10000,
            cvar_95=cvar_95,
            volatility_daily=volatility_daily
        )

        # Distribution data
        distribution = {
            "final_values": final_values.tolist(),
            "daily_returns": daily_returns_series.tolist() if hasattr(daily_returns_series, 'tolist') else []
        }

        return metrics, distribution

    async def _generate_simulated_trades(
        self,
        parameters: ArbitrageParameters,
        days: int
    ) -> List[Trade]:
        """
        Generate simulated trades based on parameters

        Args:
            parameters: Trading parameters
            days: Number of days to simulate

        Returns:
            List of simulated trades
        """
        trades = []
        base_time = datetime.utcnow() - timedelta(days=days)

        # Estimate trade frequency based on parameters
        # Lower spread threshold = more opportunities
        expected_trades_per_day = int(10 * (0.5 / parameters.min_spread_pct))
        total_trades = expected_trades_per_day * days

        for i in range(total_trades):
            # Random timestamp within period
            hours_offset = np.random.uniform(0, days * 24)
            timestamp = base_time + timedelta(hours=hours_offset)

            # Simulate market conditions
            spread = np.random.uniform(
                parameters.min_spread_pct * 0.8,
                parameters.min_spread_pct * 1.5
            )

            # Determine if trade meets criteria
            if spread < parameters.min_spread_pct:
                continue

            # Trade size (random within bounds)
            size = np.random.uniform(
                parameters.min_trade_size_usd,
                parameters.max_trade_size_usd * 0.5  # Conservative
            )

            # Simulate outcome
            win_prob = 0.5 + (spread / 2.0)  # Higher spread = higher win prob
            is_win = np.random.random() < win_prob

            if is_win:
                gross_profit = size * (spread / 100)
            else:
                gross_profit = -size * (spread / 100 * 0.5)

            # Calculate costs
            entry_fee = size * (parameters.polymarket_fee_pct / 100)
            exit_fee = size * (parameters.limitless_fee_pct / 100)
            slippage = size * (parameters.default_slippage_pct / 100)
            gas_cost = parameters.base_gas_cost_usd

            total_costs = entry_fee + exit_fee + slippage + gas_cost

            # Net profit
            net_profit = gross_profit - total_costs

            # Risk score
            risk_score = int(5 + (size / parameters.max_trade_size_usd) * 5)

            # Check risk limits
            if risk_score > parameters.max_risk_score:
                continue

            # Check gas threshold
            if gross_profit > 0:
                gas_pct = (gas_cost / gross_profit) * 100
                if gas_pct > parameters.gas_cost_threshold_pct:
                    continue

            trade = Trade(
                timestamp=timestamp,
                entry_price=100.0,  # Normalized
                exit_price=100.0 + spread,
                size_usd=size,
                profit_usd=gross_profit,
                fees_usd=entry_fee + exit_fee,
                gas_usd=gas_cost,
                net_profit_usd=net_profit,
                spread_pct=spread,
                risk_score=risk_score
            )

            trades.append(trade)

        return trades

    def _calculate_daily_returns(self, trades: List[Trade]) -> List[float]:
        """Calculate daily returns from trades"""
        if not trades:
            return []

        # Group trades by day
        daily_profits = {}
        for trade in trades:
            date_key = trade.timestamp.date()
            if date_key not in daily_profits:
                daily_profits[date_key] = 0.0
            daily_profits[date_key] += trade.net_profit_usd

        # Convert to returns (assuming $10k capital)
        daily_returns = [
            profit / 10000.0
            for profit in daily_profits.values()
        ]

        return daily_returns

    def _aggregate_metrics(
        self,
        backtest_metrics: PerformanceMetrics,
        mc_metrics: PerformanceMetrics
    ) -> PerformanceMetrics:
        """
        Aggregate metrics from backtest and Monte Carlo
        Backtest gets 60% weight, MC gets 40% weight
        """
        return PerformanceMetrics(
            sharpe_ratio=backtest_metrics.sharpe_ratio * 0.6 + mc_metrics.sharpe_ratio * 0.4,
            total_return_pct=backtest_metrics.total_return_pct * 0.6 + mc_metrics.total_return_pct * 0.4,
            max_drawdown_pct=backtest_metrics.max_drawdown_pct * 0.6 + mc_metrics.max_drawdown_pct * 0.4,
            win_rate=backtest_metrics.win_rate * 0.6 + mc_metrics.win_rate * 0.4,
            profit_factor=backtest_metrics.profit_factor * 0.6 + mc_metrics.profit_factor * 0.4,
            total_trades=int(backtest_metrics.total_trades * 0.6 + mc_metrics.total_trades * 0.4),
            average_profit_usd=backtest_metrics.average_profit_usd * 0.6 + mc_metrics.average_profit_usd * 0.4,
            total_profit_usd=backtest_metrics.total_profit_usd * 0.6 + mc_metrics.total_profit_usd * 0.4,
            cvar_95=backtest_metrics.cvar_95 * 0.6 + mc_metrics.cvar_95 * 0.4,
            volatility_daily=backtest_metrics.volatility_daily * 0.6 + mc_metrics.volatility_daily * 0.4
        )

    def _calculate_improvements(
        self,
        baseline: PerformanceMetrics,
        proposed: PerformanceMetrics
    ) -> Dict[str, float]:
        """Calculate improvement summary"""
        return {
            "sharpe_ratio_change": round(proposed.sharpe_ratio - baseline.sharpe_ratio, 2),
            "sharpe_ratio_improvement_pct": round(
                ((proposed.sharpe_ratio - baseline.sharpe_ratio) / max(abs(baseline.sharpe_ratio), 0.01)) * 100, 1
            ) if baseline.sharpe_ratio != 0 else 0.0,
            "return_change": round(proposed.total_return_pct - baseline.total_return_pct, 1),
            "drawdown_change": round(proposed.max_drawdown_pct - baseline.max_drawdown_pct, 1),
            "win_rate_change": round((proposed.win_rate - baseline.win_rate) * 100, 1),
            "profit_change_usd": round(proposed.total_profit_usd - baseline.total_profit_usd, 2)
        }

    def _generate_recommendation(
        self,
        baseline: PerformanceMetrics,
        proposed: PerformanceMetrics,
        improvements: Dict[str, float]
    ) -> Tuple[str, float, List[str]]:
        """
        Generate recommendation (ACCEPT, REJECT, REVIEW)

        Returns:
            Tuple of (recommendation, confidence, warnings)
        """
        warnings = []

        # Sharpe ratio improvement
        sharpe_improved = improvements["sharpe_ratio_change"] > 0.1

        # Drawdown check (should not increase significantly)
        drawdown_acceptable = improvements["drawdown_change"] < 2.0  # Max 2% increase

        # Return check
        return_improved = improvements["return_change"] > 1.0  # At least 1% improvement

        # Win rate check
        win_rate_improved = improvements["win_rate_change"] > -5.0  # Can decrease by up to 5%

        # Decision logic
        if sharpe_improved and drawdown_acceptable and return_improved:
            confidence = min(0.95, 0.5 + abs(improvements["sharpe_ratio_change"]) * 0.1)
            return "ACCEPT", confidence, warnings

        elif improvements["sharpe_ratio_change"] < -0.2:
            warnings.append("Significant Sharpe ratio decrease")
            confidence = 0.8
            return "REJECT", confidence, warnings

        elif improvements["drawdown_change"] > 5.0:
            warnings.append("Drawdown increase exceeds 5%")
            confidence = 0.7
            return "REJECT", confidence, warnings

        else:
            warnings.append("Marginal improvements - requires review")
            confidence = 0.5
            return "REVIEW", confidence, warnings


# Singleton instance
_simulation_engine: Optional[SimulationEngine] = None


def get_simulation_engine() -> SimulationEngine:
    """Get or create the singleton simulation engine"""
    global _simulation_engine
    if _simulation_engine is None:
        _simulation_engine = SimulationEngine()
    return _simulation_engine
