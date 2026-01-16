"""
Revenue Projection Engine with Stress Scenarios
"""
import time
import numpy as np
from typing import List

from app.models import RevenueScenario, RevenueProjection, OpportunityData, KellyResult


# Scenario parameters
SCENARIOS = {
    "Best Case": {
        "vol_multiplier": 0.6,
        "correlation_shock": -0.3,
        "gas_multiplier": 0.4,
        "probability": 0.15
    },
    "Average Case": {
        "vol_multiplier": 1.0,
        "correlation_shock": 0.0,
        "gas_multiplier": 1.0,
        "probability": 0.50
    },
    "Stress Case": {
        "vol_multiplier": 2.2,
        "correlation_shock": 0.5,
        "gas_multiplier": 1.8,
        "probability": 0.25
    },
    "Black Swan": {
        "vol_multiplier": 4.5,
        "correlation_shock": 0.9,
        "gas_multiplier": 3.0,
        "probability": 0.10
    }
}


def simulate_scenario(
    scenario_name: str,
    params: dict,
    opportunity: OpportunityData,
    kelly_result: KellyResult,
    num_days: int = 30,
    initial_capital: float = 10000.0
) -> RevenueScenario:
    """
    Simulate revenue for a single scenario
    
    Args:
        scenario_name: Name of the scenario
        params: Scenario parameters (vol_multiplier, etc.)
        opportunity: Arbitrage opportunity
        kelly_result: Kelly position sizing
        num_days: Number of days to simulate
        initial_capital: Starting capital
        
    Returns:
        RevenueScenario with daily revenue path
    """
    # Extract parameters
    vol_mult = params["vol_multiplier"]
    corr_shock = params["correlation_shock"]
    gas_mult = params["gas_multiplier"]
    prob_weight = params["probability"]
    
    # Adjust opportunity parameters for scenario
    adjusted_volatility = opportunity.volatility * vol_mult
    adjusted_gas = opportunity.gas_estimate * gas_mult
    adjusted_correlation = min(0.95, max(-0.95, corr_shock))
    
    # Position size as fraction of capital
    position_fraction = kelly_result.recommended_position_pct / 100
    
    # Daily revenue simulation
    daily_revenue = np.zeros(num_days)
    current_capital = initial_capital
    negative_days_streak = 0
    terminated_early = False
    
    for day in range(num_days):
        # Position size for this day
        position_size = current_capital * position_fraction
        
        # Daily return with scenario adjustments
        base_return = opportunity.expected_return / 100
        
        # Add volatility shock
        vol_shock = np.random.normal(0, adjusted_volatility / np.sqrt(252))  # Daily vol
        
        # Add correlation impact (reduces returns in high correlation scenarios)
        corr_impact = -abs(adjusted_correlation) * 0.01  # Negative impact from correlation
        
        # Calculate daily return
        daily_return = base_return + vol_shock + corr_impact
        
        # Subtract gas costs (as percentage of position)
        gas_cost_pct = adjusted_gas / position_size if position_size > 0 else 0
        daily_return -= gas_cost_pct
        
        # Calculate profit/loss
        daily_pnl = position_size * daily_return
        daily_revenue[day] = daily_pnl
        
        # Update capital
        current_capital += daily_pnl
        
        # Track negative days for termination condition
        if daily_pnl < 0:
            negative_days_streak += 1
        else:
            negative_days_streak = 0
        
        # Terminate after 15 consecutive negative days
        if negative_days_streak >= 15:
            terminated_early = True
            # Fill remaining days with zeros
            daily_revenue[day+1:] = 0
            break
    
    # Calculate metrics
    total_revenue = float(np.sum(daily_revenue))
    
    # Max drawdown
    cumulative = np.cumsum(daily_revenue)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = cumulative - running_max
    max_drawdown = float(np.min(drawdown))
    
    # Breakeven day (first day where cumulative > 0)
    breakeven_day = None
    for day, cum_rev in enumerate(cumulative):
        if cum_rev > 0:
            breakeven_day = day + 1  # 1-indexed
            break
    
    return RevenueScenario(
        scenario_name=scenario_name,
        daily_revenue=daily_revenue.tolist(),
        total_revenue=total_revenue,
        max_drawdown=max_drawdown,
        breakeven_day=breakeven_day,
        probability_weight=prob_weight
    )


def project_revenue(opportunity: OpportunityData, kelly_result: KellyResult) -> RevenueProjection:
    """
    Project 30-day revenue across all stress scenarios
    
    Args:
        opportunity: Arbitrage opportunity
        kelly_result: Kelly position sizing
        
    Returns:
        RevenueProjection with all scenarios
    """
    start_time = time.time()
    
    # Simulate all scenarios
    scenarios = []
    for scenario_name, params in SCENARIOS.items():
        scenario = simulate_scenario(
            scenario_name=scenario_name,
            params=params,
            opportunity=opportunity,
            kelly_result=kelly_result
        )
        scenarios.append(scenario)
    
    # Calculate expected value (probability-weighted)
    expected_value = sum(
        scenario.total_revenue * scenario.probability_weight
        for scenario in scenarios
    )
    
    # Calculate downside risk (probability of negative outcome)
    downside_risk_pct = sum(
        scenario.probability_weight
        for scenario in scenarios
        if scenario.total_revenue < 0
    ) * 100
    
    computation_time = (time.time() - start_time) * 1000  # Convert to ms
    
    return RevenueProjection(
        scenarios=scenarios,
        expected_value=expected_value,
        downside_risk_pct=downside_risk_pct,
        computation_time_ms=computation_time
    )
