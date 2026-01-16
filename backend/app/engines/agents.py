"""
Multi-Agent Judge System with Consensus Protocol
"""
import time
from typing import List

from app.models import AgentVerdict, ConsensusResult, OpportunityData, MonteCarloResult


class RiskAgent:
    """Evaluates tail risk using CVaR"""
    
    CVAR_THRESHOLD = -0.15  # -15%
    
    @staticmethod
    def evaluate(opportunity: OpportunityData, mc_result: MonteCarloResult) -> AgentVerdict:
        """
        Evaluate risk using Conditional Value at Risk
        
        Args:
            opportunity: Arbitrage opportunity
            mc_result: Monte Carlo simulation results
            
        Returns:
            AgentVerdict with risk assessment
        """
        cvar = mc_result.cvar_95
        
        if cvar < RiskAgent.CVAR_THRESHOLD:
            verdict = "REJECT"
            rationale = f"CVaR ({cvar:.2%}) exceeds risk threshold ({RiskAgent.CVAR_THRESHOLD:.2%}). Tail risk too high."
        else:
            verdict = "APPROVE"
            rationale = f"CVaR ({cvar:.2%}) within acceptable range. Tail risk manageable."
        
        return AgentVerdict(
            agent_name="RiskAgent",
            verdict=verdict,
            rationale=rationale,
            metric_value=cvar,
            threshold=RiskAgent.CVAR_THRESHOLD
        )


class GasAgent:
    """Evaluates gas cost efficiency"""
    
    GAS_THRESHOLD = 0.35  # 35% of profit
    
    @staticmethod
    def evaluate(opportunity: OpportunityData, mc_result: MonteCarloResult) -> AgentVerdict:
        """
        Evaluate gas cost as percentage of expected profit
        
        Args:
            opportunity: Arbitrage opportunity
            mc_result: Monte Carlo simulation results
            
        Returns:
            AgentVerdict with gas cost assessment
        """
        # Calculate expected profit in dollars
        expected_profit = opportunity.liquidity * (opportunity.expected_return / 100)
        
        # Gas as percentage of profit
        if expected_profit > 0:
            gas_pct = opportunity.gas_estimate / expected_profit
        else:
            gas_pct = 1.0  # If no profit, gas is 100%
        
        if gas_pct > GasAgent.GAS_THRESHOLD:
            verdict = "REJECT"
            rationale = f"Gas costs ({gas_pct:.1%}) exceed {GasAgent.GAS_THRESHOLD:.1%} of expected profit. Not cost-efficient."
        else:
            verdict = "APPROVE"
            rationale = f"Gas costs ({gas_pct:.1%}) acceptable relative to profit. Cost-efficient execution."
        
        return AgentVerdict(
            agent_name="GasAgent",
            verdict=verdict,
            rationale=rationale,
            metric_value=gas_pct,
            threshold=GasAgent.GAS_THRESHOLD
        )


class AlphaAgent:
    """Evaluates edge quality and win probability"""
    
    MIN_EDGE = 0.005  # 0.5%
    MIN_WIN_PROB = 0.55  # 55%
    
    @staticmethod
    def evaluate(opportunity: OpportunityData, mc_result: MonteCarloResult) -> AgentVerdict:
        """
        Evaluate statistical edge quality
        
        Args:
            opportunity: Arbitrage opportunity
            mc_result: Monte Carlo simulation results
            
        Returns:
            AgentVerdict with alpha assessment
        """
        edge = opportunity.expected_return / 100
        win_prob = opportunity.win_probability
        
        # Check both edge and win probability
        if edge < AlphaAgent.MIN_EDGE:
            verdict = "REJECT"
            rationale = f"Edge ({edge:.2%}) below minimum threshold ({AlphaAgent.MIN_EDGE:.2%}). Insufficient alpha."
        elif win_prob < AlphaAgent.MIN_WIN_PROB:
            verdict = "REJECT"
            rationale = f"Win probability ({win_prob:.1%}) below threshold ({AlphaAgent.MIN_WIN_PROB:.1%}). Low confidence."
        else:
            verdict = "APPROVE"
            rationale = f"Strong edge ({edge:.2%}) with high win probability ({win_prob:.1%}). Quality opportunity."
        
        return AgentVerdict(
            agent_name="AlphaAgent",
            verdict=verdict,
            rationale=rationale,
            metric_value=edge,
            threshold=AlphaAgent.MIN_EDGE
        )


def run_consensus(opportunity: OpportunityData, mc_result: MonteCarloResult) -> ConsensusResult:
    """
    Run multi-agent consensus protocol
    
    Args:
        opportunity: Arbitrage opportunity
        mc_result: Monte Carlo simulation results
        
    Returns:
        ConsensusResult with all verdicts and consensus decision
    """
    start_time = time.time()
    
    # Get verdicts from all agents
    verdicts = [
        RiskAgent.evaluate(opportunity, mc_result),
        GasAgent.evaluate(opportunity, mc_result),
        AlphaAgent.evaluate(opportunity, mc_result)
    ]
    
    # Count approvals
    approvals = sum(1 for v in verdicts if v.verdict == "APPROVE")
    total_agents = len(verdicts)
    
    # Consensus requires 2/3 approval
    consensus = "APPROVE" if approvals >= 2 else "REJECT"
    
    # Confidence score as percentage
    confidence_score = (approvals / total_agents) * 100
    
    computation_time = (time.time() - start_time) * 1000  # Convert to ms
    
    return ConsensusResult(
        verdicts=verdicts,
        consensus=consensus,
        confidence_score=confidence_score,
        computation_time_ms=computation_time
    )
