"""
Synthetic arbitrage opportunity generator
"""
import random
from app.models import OpportunityData


def generate_opportunity(pair: str, dex_a: str, dex_b: str) -> OpportunityData:
    """
    Generate realistic synthetic arbitrage opportunity data
    
    Args:
        pair: Trading pair (e.g., "USDC-USDT")
        dex_a: First DEX name
        dex_b: Second DEX name
        
    Returns:
        OpportunityData with realistic parameters
    """
    # Base price around 1.0 for stablecoin pairs
    base_price = 1.0
    
    # Realistic spread: 0.3% - 2.5%
    spread_pct = random.uniform(0.3, 2.5)
    
    # Calculate prices with spread
    price_a = base_price
    price_b = base_price * (1 + spread_pct / 100)
    
    # Volatility: 5% - 40% annualized
    volatility = random.uniform(0.05, 0.40)
    
    # Liquidity: $10k - $500k
    liquidity = random.uniform(10000, 500000)
    
    # Gas fees on L2: $0.10 - $2.00
    gas_estimate = random.uniform(0.10, 2.00)
    
    # Expected return: spread minus slippage and fees
    slippage_estimate = spread_pct * 0.2  # Assume 20% slippage
    expected_return = spread_pct - slippage_estimate - (gas_estimate / liquidity * 100)
    
    # Win probability: higher for larger spreads, lower for higher volatility
    base_win_prob = 0.65
    spread_bonus = (spread_pct - 1.0) * 0.05  # +5% per 1% spread above 1%
    volatility_penalty = (volatility - 0.20) * 0.3  # -30% per 0.1 vol above 20%
    win_probability = max(0.45, min(0.85, base_win_prob + spread_bonus - volatility_penalty))
    
    return OpportunityData(
        pair=pair,
        dex_a=dex_a,
        dex_b=dex_b,
        price_a=price_a,
        price_b=price_b,
        spread_pct=spread_pct,
        volatility=volatility,
        liquidity=liquidity,
        gas_estimate=gas_estimate,
        expected_return=expected_return,
        win_probability=win_probability
    )
