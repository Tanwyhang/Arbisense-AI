"""
Ring Consensus Engine
Implements multi-agent ring topology for parameter optimization
5 specialized agents debate and reach consensus on optimal parameters
"""
import asyncio
import json
from typing import List, Dict, Optional, Callable
from datetime import datetime
import uuid

from app.models.optimizer import (
    AgentRole,
    AgentMessage,
    AgentResponse,
    ArbitrageParameters,
    PerformanceMetrics,
    ConsensusState,
    OptimizationRequest,
    OptimizationStatus
)
from app.services.openrouter_service import OpenRouterService, ChatMessage, get_openrouter_service
from app.config import config


class RingConsensusEngine:
    """
    Orchestrates 5 specialized AI agents in a ring topology to reach consensus
    on optimal arbitrage parameters through iterative debate
    """

    # Agent system prompts
    AGENT_PERSONAS = {
        AgentRole.PROFIT_MAX: {
            "name": "Profit Maximizer",
            "emoji": "🟢",
            "color": "#22c55e",
            "system_prompt": """You are the Profit Maximizer Agent. Your goal is to maximize expected returns.

            Your philosophy:
            - Aggressive on capturing opportunities (lower spread thresholds)
            - Higher position sizes to maximize profit per trade
            - Willing to accept moderate risk for higher returns
            - Focus on edge and win probability

            You prioritize: Expected value, total return, win rate
            You are skeptical of: Overly conservative risk limits, missed opportunities""",
            "parameter_bias": {
                "min_spread_pct": -0.2,  # Bias towards lower
                "max_trade_size_usd": +5000,  # Bias towards higher
                "position_sizing_cap": +1.0  # Bias towards higher
            }
        },
        AgentRole.RISK_AVERSE: {
            "name": "Risk Averse Agent",
            "emoji": "🔴",
            "color": "#ef4444",
            "system_prompt": """You are the Risk Averse Agent. Your goal is to minimize downside risk and protect capital.

            Your philosophy:
            - Conservative risk limits (lower max_risk_score)
            - Smaller position sizes to limit exposure
            - Higher spread thresholds for only high-confidence trades
            - Focus on drawdown prevention and tail risk

            You prioritize: Max drawdown, CVaR, risk-adjusted returns (Sharpe)
            You are skeptical of: Aggressive position sizing, loose risk limits""",
            "parameter_bias": {
                "min_spread_pct": +0.2,  # Bias towards higher
                "max_risk_score": -2,  # Bias towards lower
                "position_sizing_cap": -2.0  # Bias towards lower
            }
        },
        AgentRole.GAS_EFFICIENT: {
            "name": "Gas Efficient Agent",
            "emoji": "🔵",
            "color": "#3b82f6",
            "system_prompt": """You are the Gas Efficient Agent. Your goal is to minimize transaction costs and maximize net profit.

            Your philosophy:
            - Larger trade sizes to amortize fixed gas costs
            - Stricter gas cost thresholds (reject high gas trades)
            - Fewer but more profitable trades
            - Focus on net profit after all costs

            You prioritize: Gas cost as % of profit, profit factor, net returns
            You are skeptical of: Small trades, high gas environments, overtrading""",
            "parameter_bias": {
                "min_profit_usd": +2.0,  # Bias towards higher
                "gas_cost_threshold_pct": -10,  # Bias towards lower (more strict)
                "max_trade_size_usd": +10000  # Bias towards higher
            }
        },
        AgentRole.MARKET_ANALYST: {
            "name": "Market Analyst Agent",
            "emoji": "🟡",
            "color": "#eab308",
            "system_prompt": """You are the Market Analyst Agent. Your goal is to adapt parameters to current market conditions.

            Your philosophy:
            - Regime-aware parameter adjustments
            - Consider volatility and market liquidity
            - Balance aggression based on market opportunity
            - Focus on adaptive strategies

            You prioritize: Market regime detection, volatility-adjusted parameters, liquidity
            You are skeptical of: Static parameters, one-size-fits-all approaches""",
            "parameter_bias": {
                # Market analyst adapts based on conditions
                "min_spread_pct": 0.0,  # Neutral
                "max_risk_score": 0,  # Neutral
                "position_sizing_cap": 0.0  # Neutral
            }
        },
        AgentRole.META_LEARNER: {
            "name": "Meta Learner Agent",
            "emoji": "🟣",
            "color": "#a855f7",
            "system_prompt": """You are the Meta Learner Agent. Your goal is to synthesize insights from other agents and historical data.

            Your philosophy:
            - Evidence-based decision making
            - Learn from past parameter changes and performance
            - Integrate perspectives from all agents
            - Focus on consensus and long-term stability

            You prioritize: Historical backtesting, consensus building, stability
            You are skeptical of: Extreme positions, insufficient evidence, radical changes""",
            "parameter_bias": {
                # Meta learner balances all views
                "min_spread_pct": 0.0,  # Neutral
                "max_risk_score": 0,  # Neutral
                "position_sizing_cap": 0.0  # Neutral
            }
        }
    }

    # Ring order (Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5 → Agent 1)
    RING_ORDER = [
        AgentRole.PROFIT_MAX,
        AgentRole.RISK_AVERSE,
        AgentRole.GAS_EFFICIENT,
        AgentRole.MARKET_ANALYST,
        AgentRole.META_LEARNER
    ]

    def __init__(self, llm_service: Optional[OpenRouterService] = None):
        """
        Initialize ring consensus engine

        Args:
            llm_service: OpenRouter service (uses singleton if None)
        """
        self.llm_service = llm_service or get_openrouter_service()
        self.agent_count = len(self.RING_ORDER)

    async def run_consensus(
        self,
        request: OptimizationRequest,
        on_message_callback: Optional[Callable[[AgentMessage], None]] = None
    ) -> ConsensusState:
        """
        Run the ring consensus process

        Args:
            request: Optimization request with current parameters and metrics
            on_message_callback: Async callback for each agent message

        Returns:
            Consensus state with agreed parameters
        """
        current_params = request.current_parameters
        current_metrics = request.current_metrics
        max_iterations = request.max_iterations

        # Initialize consensus state
        consensus_state = ConsensusState(
            round_number=0,
            total_rounds=max_iterations,
            convergence_score=0.0,
            has_converged=False,
            agent_agreements={},
            confidence_scores={}
        )

        # Build context for agents
        context = self._build_agent_context(current_params, current_metrics)

        # Track parameter proposals from each agent
        all_proposals: Dict[AgentRole, ArbitrageParameters] = {}
        all_messages: List[AgentMessage] = []

        # Run iterative consensus rounds
        for round_num in range(1, max_iterations + 1):
            consensus_state.round_number = round_num

            # Run ring: each agent responds to previous agent's argument
            for i, agent_role in enumerate(self.RING_ORDER):
                # Previous agent in ring (with wraparound)
                prev_agent = self.RING_ORDER[(i - 1) % self.agent_count]

                # Get previous agent's proposal (if available)
                prev_proposal = all_proposals.get(prev_agent)
                prev_messages = [m for m in all_messages if m.agent_id == prev_agent]

                # Get agent response
                agent_response = await self._get_agent_response(
                    agent_role=agent_role,
                    context=context,
                    current_params=current_params,
                    prev_proposal=prev_proposal,
                    prev_messages=prev_messages,
                    round_number=round_num
                )

                # Store proposal
                all_proposals[agent_role] = agent_response.suggested_parameters

                # Create agent message
                message = AgentMessage(
                    agent_id=agent_role,
                    agent_name=self.AGENT_PERSONAS[agent_role]["name"],
                    round_number=round_num,
                    timestamp=datetime.utcnow(),
                    content=agent_response.reasoning,
                    parameter_suggestions=agent_response.suggested_parameters.dict(),
                    rationale=agent_response.reasoning,
                    confidence_score=agent_response.confidence,
                    addressed_to=prev_agent
                )

                all_messages.append(message)
                consensus_state.agent_agreements[agent_role] = True  # Temporary
                consensus_state.confidence_scores[agent_role] = agent_response.confidence

                # Send message via callback if provided
                if on_message_callback:
                    await on_message_callback(message)

                # Small delay to prevent rate limiting
                await asyncio.sleep(0.5)

            # Calculate convergence after each round
            convergence = self._calculate_convergence(all_proposals)
            consensus_state.convergence_score = convergence

            # Check for convergence
            if convergence >= config.optimizer_convergence_threshold:
                consensus_state.has_converged = True
                consensus_state.agreed_parameters = self._aggregate_proposals(all_proposals)
                break

        # If not converged, aggregate all proposals
        if not consensus_state.has_converged:
            consensus_state.agreed_parameters = self._aggregate_proposals(all_proposals)

        return consensus_state

    def _build_agent_context(
        self,
        params: ArbitrageParameters,
        metrics: PerformanceMetrics
    ) -> str:
        """Build context string for agents"""
        return f"""
CURRENT BOT STATE:
Parameters:
- Min Spread: {params.min_spread_pct}%
- Min Profit: ${params.min_profit_usd}
- Max Risk Score: {params.max_risk_score}/10
- Max Trade Size: ${params.max_trade_size_usd}
- Gas Threshold: {params.gas_cost_threshold_pct}% of profit
- Position Cap: {params.position_sizing_cap}%

Performance Metrics:
- Sharpe Ratio: {metrics.sharpe_ratio:.2f}
- Total Return: {metrics.total_return_pct:.1f}%
- Max Drawdown: {metrics.max_drawdown_pct:.1f}%
- Win Rate: {metrics.win_rate:.1%}
- Total Trades: {metrics.total_trades}
- Total Profit: ${metrics.total_profit_usd:.2f}

OPTIMIZATION GOAL:
Propose parameter adjustments to improve performance. Consider the trade-offs between
profit maximization, risk management, and cost efficiency.
"""

    async def _get_agent_response(
        self,
        agent_role: AgentRole,
        context: str,
        current_params: ArbitrageParameters,
        prev_proposal: Optional[ArbitrageParameters],
        prev_messages: List[AgentMessage],
        round_number: int
    ) -> AgentResponse:
        """Get response from a single agent"""

        persona = self.AGENT_PERSONAS[agent_role]

        # Build prompt
        prompt = self._build_agent_prompt(
            agent_role=agent_role,
            persona=persona,
            context=context,
            current_params=current_params,
            prev_proposal=prev_proposal,
            prev_messages=prev_messages,
            round_number=round_number
        )

        # Call LLM
        messages = [
            ChatMessage(role="system", content=persona["system_prompt"]),
            ChatMessage(role="user", content=prompt)
        ]

        try:
            llm_response = await self.llm_service.chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )

            # Parse structured response
            response = self._parse_agent_response(
                llm_response.content,
                agent_role,
                current_params
            )

            return response

        except Exception as e:
            # Fallback: return current params with low confidence
            print(f"Error getting response from {agent_role}: {e}")
            return AgentResponse(
                agent_id=agent_role,
                suggested_parameters=current_params,
                confidence=0.3,
                reasoning=f"Agent unavailable: {str(e)}",
                expected_improvement="Unknown",
                concerns=["LLM error"]
            )

    def _build_agent_prompt(
        self,
        agent_role: AgentRole,
        persona: Dict,
        context: str,
        current_params: ArbitrageParameters,
        prev_proposal: Optional[ArbitrageParameters],
        prev_messages: List[AgentMessage],
        round_number: int
    ) -> str:
        """Build prompt for an agent"""

        prompt = f"{context}\n\n"

        prompt += f"YOUR ROLE: {persona['name']} ({agent_role.value})\n"
        prompt += f"{persona['system_prompt']}\n\n"

        # Add previous agent's proposal if available
        if prev_proposal and round_number > 1:
            prompt += f"PREVIOUS AGENT'S PROPOSAL:\n"
            prompt += f"{self._format_parameters(prev_proposal)}\n\n"

            if prev_messages:
                last_msg = prev_messages[-1]
                prompt += f"THEIR ARGUMENT:\n{last_msg.content}\n\n"

        prompt += f"ROUND {round_number} of {self.agent_count}\n\n"

        prompt += """INSTRUCTIONS:
1. Analyze the current bot performance and parameters
2. Consider the previous agent's proposal (if provided)
3. Propose specific parameter adjustments that align with your role's philosophy
4. Provide your reasoning and confidence level (0.0-1.0)
5. Respond in the following JSON format:

{
    "suggested_parameters": {
        "min_spread_pct": <float>,
        "min_profit_usd": <float>,
        "max_risk_score": <int>,
        "max_trade_size_usd": <float>,
        "gas_cost_threshold_pct": <float>,
        "position_sizing_cap": <float>
    },
    "confidence": <float 0.0-1.0>,
    "reasoning": "<your detailed reasoning>",
    "expected_improvement": "<expected impact on metrics>",
    "concerns": ["<list of concerns or trade-offs>"]
}

Be specific and justify your recommendations. Consider trade-offs.
"""

        return prompt

    def _format_parameters(self, params: ArbitrageParameters) -> str:
        """Format parameters for display"""
        return f"""Parameters:
- min_spread_pct: {params.min_spread_pct}%
- min_profit_usd: ${params.min_profit_usd}
- max_risk_score: {params.max_risk_score}
- max_trade_size_usd: ${params.max_trade_size_usd}
- gas_cost_threshold_pct: {params.gas_cost_threshold_pct}%
- position_sizing_cap: {params.position_sizing_cap}%"""

    def _parse_agent_response(
        self,
        content: str,
        agent_role: AgentRole,
        current_params: ArbitrageParameters
    ) -> AgentResponse:
        """Parse LLM response into AgentResponse"""

        try:
            # Try to extract JSON from content
            json_start = content.find("{")
            json_end = content.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)

                # Extract suggested parameters
                suggested_dict = data.get("suggested_parameters", {})
                suggested_params = current_params.copy()
                for key, value in suggested_dict.items():
                    if hasattr(suggested_params, key):
                        setattr(suggested_params, key, value)

                return AgentResponse(
                    agent_id=agent_role,
                    suggested_parameters=suggested_params,
                    confidence=float(data.get("confidence", 0.5)),
                    reasoning=data.get("reasoning", content),
                    expected_improvement=data.get("expected_improvement", "Unknown"),
                    concerns=data.get("concerns", [])
                )
            else:
                raise ValueError("No JSON found in response")

        except Exception as e:
            # Fallback: return current params with low confidence
            print(f"Error parsing agent response: {e}")
            return AgentResponse(
                agent_id=agent_role,
                suggested_parameters=current_params,
                confidence=0.4,
                reasoning=content,
                expected_improvement="Unknown",
                concerns=["Parsing error"]
            )

    def _calculate_convergence(
        self,
        proposals: Dict[AgentRole, ArbitrageParameters]
    ) -> float:
        """
        Calculate convergence score (0-1) based on parameter variance

        Higher score = more agreement among agents
        """
        if len(proposals) < 2:
            return 0.0

        # Calculate coefficient of variation for each parameter
        param_names = [
            "min_spread_pct",
            "min_profit_usd",
            "max_risk_score",
            "max_trade_size_usd",
            "gas_cost_threshold_pct",
            "position_sizing_cap"
        ]

        cvs = []
        for param_name in param_names:
            values = []
            for proposal in proposals.values():
                try:
                    val = getattr(proposal, param_name)
                    values.append(float(val))
                except AttributeError:
                    continue

            if len(values) >= 2:
                mean_val = sum(values) / len(values)
                if mean_val > 0:
                    std_val = (sum((v - mean_val) ** 2 for v in values) / len(values)) ** 0.5
                    cv = std_val / mean_val
                    cvs.append(cv)

        # Convert CVs to convergence score (lower CV = higher convergence)
        if not cvs:
            return 0.0

        avg_cv = sum(cvs) / len(cvs)
        convergence = max(0.0, 1.0 - avg_cv)  # CV of 0 = perfect convergence

        return convergence

    def _aggregate_proposals(
        self,
        proposals: Dict[AgentRole, ArbitrageParameters]
    ) -> ArbitrageParameters:
        """
        Aggregate agent proposals into final parameters
        Uses weighted average based on agent confidence and role
        """
        if not proposals:
            return ArbitrageParameters()

        # Simple average for now (can be enhanced with confidence weighting)
        param_names = [
            "min_spread_pct",
            "min_profit_usd",
            "max_risk_score",
            "max_trade_size_usd",
            "gas_cost_threshold_pct",
            "position_sizing_cap"
        ]

        aggregated = ArbitrageParameters()

        for param_name in param_names:
            values = []
            for proposal in proposals.values():
                try:
                    val = getattr(proposal, param_name)
                    values.append(float(val))
                except AttributeError:
                    continue

            if values:
                avg_val = sum(values) / len(values)
                setattr(aggregated, param_name, avg_val)

        return aggregated


# Singleton instance
_ring_consensus_engine: Optional[RingConsensusEngine] = None


def get_ring_consensus_engine() -> RingConsensusEngine:
    """Get or create the singleton ring consensus engine"""
    global _ring_consensus_engine
    if _ring_consensus_engine is None:
        _ring_consensus_engine = RingConsensusEngine()
    return _ring_consensus_engine
