"""
Monte Carlo Engine with Non-Uniform Sampling and Lévy Flights
"""
import time
import numpy as np
from scipy import stats
from typing import List, Tuple

from app.models import MonteCarloPath, MonteCarloResult, OpportunityData


def run_monte_carlo(opportunity: OpportunityData, num_paths: int = 80) -> MonteCarloResult:
    """
    Run Monte Carlo simulation with NUS and Lévy flights for fat-tail modeling
    
    Args:
        opportunity: Arbitrage opportunity data
        num_paths: Total number of paths to simulate (default 80)
        
    Returns:
        MonteCarloResult with paths and statistics
    """
    start_time = time.time()
    
    # Simulation parameters
    num_steps = 30  # 30 days
    dt = 1.0  # Daily time steps
    initial_value = 100.0  # Start with $100
    
    # Extract opportunity parameters
    mu = opportunity.expected_return / 100  # Convert to decimal
    sigma = opportunity.volatility
    
    # Determine split: bottom 40% use Lévy, top 60% use normal
    num_levy_paths = int(num_paths * 0.4)
    num_normal_paths = num_paths - num_levy_paths
    
    # Pre-allocate arrays for efficiency
    all_paths = np.zeros((num_paths, num_steps + 1))
    all_paths[:, 0] = initial_value
    
    # Generate Lévy flight paths (bottom 40% - fat tails)
    levy_alpha = 1.7  # Stability parameter for fat tails
    levy_beta = 0.0   # Symmetry parameter
    
    for i in range(num_levy_paths):
        for t in range(1, num_steps + 1):
            # Lévy stable distribution
            levy_increment = stats.levy_stable.rvs(
                alpha=levy_alpha,
                beta=levy_beta,
                loc=mu * dt,
                scale=sigma * np.sqrt(dt),
                size=1
            )[0]
            
            # Apply increment with bounds to prevent extreme values
            increment = np.clip(levy_increment, -0.5, 0.5)
            all_paths[i, t] = all_paths[i, t-1] * (1 + increment)
    
    # Generate normal distribution paths (top 60%)
    for i in range(num_levy_paths, num_paths):
        for t in range(1, num_steps + 1):
            # Geometric Brownian Motion
            z = np.random.standard_normal()
            drift = (mu - 0.5 * sigma**2) * dt
            diffusion = sigma * np.sqrt(dt) * z
            all_paths[i, t] = all_paths[i, t-1] * np.exp(drift + diffusion)
    
    # Sort paths by final value to identify which are Lévy
    final_values = all_paths[:, -1]
    sorted_indices = np.argsort(final_values)
    
    # Create path objects
    paths = []
    for idx in sorted_indices:
        is_levy = idx < num_levy_paths
        paths.append(MonteCarloPath(
            values=all_paths[idx].tolist(),
            is_levy=is_levy
        ))
    
    # Calculate statistics
    returns = (final_values - initial_value) / initial_value
    mean_return = float(np.mean(returns))
    std_dev = float(np.std(returns))
    skewness = float(stats.skew(returns))
    kurtosis = float(stats.kurtosis(returns))
    
    # Value at Risk (VaR) and Conditional VaR (CVaR) at 95% confidence
    var_95 = float(np.percentile(returns, 5))  # 5th percentile for 95% VaR
    cvar_95 = float(np.mean(returns[returns <= var_95]))  # Mean of worst 5%
    
    computation_time = (time.time() - start_time) * 1000  # Convert to ms
    
    return MonteCarloResult(
        paths=paths,
        mean_return=mean_return,
        std_dev=std_dev,
        skewness=skewness,
        kurtosis=kurtosis,
        var_95=var_95,
        cvar_95=cvar_95,
        computation_time_ms=computation_time
    )
