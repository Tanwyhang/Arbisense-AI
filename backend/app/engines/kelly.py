"""
Kelly Criterion Optimizer with Correlation Adjustment
"""
import time
from app.models import KellyResult, OpportunityData


def calculate_kelly(opportunity: OpportunityData, correlation_factor: float = 0.3) -> KellyResult:
    """
    Calculate Kelly Criterion position sizing with correlation adjustment
    
    Args:
        opportunity: Arbitrage opportunity
        correlation_factor: Correlation adjustment factor (default 0.3)
        
    Returns:
        KellyResult with position sizing recommendation
    """
    start_time = time.time()
    
    # Extract parameters
    p = opportunity.win_probability  # Win probability
    edge = opportunity.expected_return / 100  # Expected return as decimal
    
    # Calculate odds (b = profit/loss ratio)
    # For arbitrage, assume loss is limited to gas + slippage
    potential_profit = edge
    potential_loss = 0.02  # Assume 2% max loss from slippage/fees
    
    if potential_loss > 0:
        b = potential_profit / potential_loss
    else:
        b = 1.0  # Default odds
    
    # Kelly formula: f* = (p*b - q) / b where q = 1 - p
    q = 1 - p
    
    # Prevent division by zero
    if b > 0:
        kelly_fraction = (p * b - q) / b
    else:
        kelly_fraction = 0.0
    
    # Ensure non-negative
    kelly_fraction = max(0.0, kelly_fraction)
    
    # Apply correlation adjustment: f_adjusted = f* / (1 + γ)
    adjusted_fraction = kelly_fraction / (1 + correlation_factor)
    
    # Apply 5% safety cap
    SAFETY_CAP = 0.05  # 5% of portfolio
    safety_capped = False
    
    if adjusted_fraction > SAFETY_CAP:
        recommended_position_pct = SAFETY_CAP * 100
        safety_capped = True
    else:
        recommended_position_pct = adjusted_fraction * 100
    
    computation_time = (time.time() - start_time) * 1000  # Convert to ms
    
    return KellyResult(
        kelly_fraction=kelly_fraction,
        adjusted_fraction=adjusted_fraction,
        recommended_position_pct=recommended_position_pct,
        safety_capped=safety_capped,
        correlation_factor=correlation_factor,
        computation_time_ms=computation_time
    )
