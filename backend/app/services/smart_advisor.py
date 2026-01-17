"""
Smart Advisor Service for interactive bot configuration.

An AI-powered conversational agent that assesses user preferences
and builds customized arbitrage bot configurations.
"""

import json
import re
import uuid
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

from app.models.chatbot import (
    AssessmentSession,
    UserPreferences,
    ChatResponse,
    MessageType,
    AssessmentStep
)
from app.services.openrouter_service import OpenRouterService


class SmartAdvisorService:
    """
    Manages conversational assessment for arbitrage bot configuration.

    This service:
    - Tracks conversation state and gathered preferences
    - Generates contextual responses using AI
    - Extracts preferences from natural language
    - Detects when assessment is complete
    - Provides conversation guidance
    """

    # Required fields for complete assessment
    REQUIRED_FIELDS = [
        "risk_tolerance",
        "initial_capital_usd",
        "trading_experience",
        "primary_goal",
        "preferred_markets",
        "monitoring_frequency",
        "gas_sensitivity"
    ]

    # Optional fields
    OPTIONAL_FIELDS = [
        "max_drawdown_tolerance_pct",
        "position_sizing_preference",
        "excluded_markets",
        "additional_notes"
    ]

    def __init__(self, openrouter_service: OpenRouterService):
        self.openrouter = openrouter_service
        self.sessions: Dict[str, AssessmentSession] = {}

        # Conversation templates for different stages
        self.initial_greeting = (
            "Hello! I'm your Arbitrage Bot Configuration Advisor. 🤖\n\n"
            "I'll help you set up a customized bot that matches your trading style and risk preferences. "
            "This should take about 5-10 minutes.\n\n"
            "Let's start with your risk tolerance. On a scale of 1-10, how comfortable are you with market volatility? "
            "(1 = very conservative, 10 = very aggressive)\n\n"
            "Feel free to ask me questions at any point if you need clarification!"
        )

    def create_session(self, user_id: Optional[str] = None) -> AssessmentSession:
        """Create a new assessment session."""
        session_id = str(uuid.uuid4())
        session = AssessmentSession(
            id=session_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            current_step=AssessmentStep.ASSESSMENT,
            preferences=UserPreferences(),
            required_fields_collected=0,
            total_required_fields=len(self.REQUIRED_FIELDS)
        )
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[AssessmentSession]:
        """Get an existing session."""
        return self.sessions.get(session_id)

    def _extract_preferences_from_message(
        self,
        message: str,
        current_preferences: UserPreferences
    ) -> Tuple[UserPreferences, List[str]]:
        """
        Extract trading preferences from user message using NLP.

        Returns:
            Tuple of (updated_preferences, fields_extracted)
        """
        updated_prefs = current_preferences.copy()
        extracted_fields = []

        # Convert to lowercase for easier matching
        msg_lower = message.lower()

        # Extract risk tolerance (1-10 scale)
        risk_match = re.search(r'risk.*?(\d+)', msg_lower)
        if risk_match:
            risk_value = int(risk_match.group(1))
            if 1 <= risk_value <= 10:
                updated_prefs.risk_tolerance = risk_value
                extracted_fields.append("risk_tolerance")

        # Look for risk tolerance keywords
        if any(word in msg_lower for word in ['conservative', 'cautious', 'safe']):
            updated_prefs.risk_tolerance = 3
            extracted_fields.append("risk_tolerance")
        elif any(word in msg_lower for word in ['aggressive', 'bold', 'risky']):
            updated_prefs.risk_tolerance = 8
            extracted_fields.append("risk_tolerance")
        elif any(word in msg_lower for word in ['moderate', 'balanced', 'middle']):
            updated_prefs.risk_tolerance = 5
            extracted_fields.append("risk_tolerance")

        # Extract capital amounts (look for $ signs and numbers)
        capital_matches = re.finditer(r'\$?(\d{3,}(?:,\d{3})*(?:\.\d+)?)\s*(?:usd|dollars?)?', message)
        for match in capital_matches:
            try:
                amount_str = match.group(1).replace(',', '')
                amount = float(amount_str)
                if amount > 0:
                    # Distinguish between initial capital and trade size
                    if any(word in msg_lower for word in ['trade', 'per trade', 'position']):
                        updated_prefs.max_trade_size_usd = min(amount, amount * 0.2)  # Heuristic
                        extracted_fields.append("max_trade_size_usd")
                    else:
                        updated_prefs.initial_capital_usd = amount
                        extracted_fields.append("initial_capital_usd")
                        # Set default trade size if not specified
                        if not updated_prefs.max_trade_size_usd:
                            updated_prefs.max_trade_size_usd = amount * 0.1
                            extracted_fields.append("max_trade_size_usd")
            except (ValueError, AttributeError):
                continue

        # Extract trading experience
        if any(word in msg_lower for word in ['beginner', 'new', 'just starting', 'first time']):
            updated_prefs.trading_experience = "beginner"
            extracted_fields.append("trading_experience")
        elif any(word in msg_lower for word in ['intermediate', 'some experience', 'been trading']):
            updated_prefs.trading_experience = "intermediate"
            extracted_fields.append("trading_experience")
        elif any(word in msg_lower for word in ['advanced', 'expert', 'professional', 'years']):
            updated_prefs.trading_experience = "advanced"
            extracted_fields.append("trading_experience")

        # Extract primary goal
        if any(word in msg_lower for word in ['maximize profit', 'aggressive growth', 'high returns']):
            updated_prefs.primary_goal = "max_profit"
            extracted_fields.append("primary_goal")
        elif any(word in msg_lower for word in ['steady', 'consistent', 'passive income', 'regular']):
            updated_prefs.primary_goal = "steady_income"
            extracted_fields.append("primary_goal")
        elif any(word in msg_lower for word in ['learn', 'experiment', 'test', 'understand']):
            updated_prefs.primary_goal = "learning"
            extracted_fields.append("primary_goal")

        # Extract market preferences
        markets = []
        if 'crypto' in msg_lower or 'cryptocurrency' in msg_lower:
            markets.append('cryptocurrency')
        if 'prediction' in msg_lower or 'prediction market' in msg_lower:
            markets.append('prediction_markets')
        if 'defi' in msg_lower or 'dex' in msg_lower:
            markets.append('defi')

        if markets:
            updated_prefs.preferred_markets = list(set(updated_prefs.preferred_markets + markets))
            if "preferred_markets" not in extracted_fields:
                extracted_fields.append("preferred_markets")

        # Extract monitoring frequency
        if any(word in msg_lower for word in ['real time', 'realtime', 'constantly', 'always']):
            updated_prefs.monitoring_frequency = "realtime"
            extracted_fields.append("monitoring_frequency")
        elif any(word in msg_lower for word in ['daily', 'every day', 'once a day']):
            updated_prefs.monitoring_frequency = "daily"
            extracted_fields.append("monitoring_frequency")
        elif any(word in msg_lower for word in ['weekly', 'once a week', 'occasionally']):
            updated_prefs.monitoring_frequency = "weekly"
            extracted_fields.append("monitoring_frequency")

        # Extract gas sensitivity
        if any(word in msg_lower for word in ['gas is important', 'care about gas', 'gas costs', 'high gas sensitivity']):
            updated_prefs.gas_sensitivity = "high"
            extracted_fields.append("gas_sensitivity")
        elif any(word in msg_lower for word in ['gas is okay', 'moderate gas', 'dont care about gas']):
            updated_prefs.gas_sensitivity = "medium"
            extracted_fields.append("gas_sensitivity")
        elif any(word in msg_lower for word in ['gas doesnt matter', 'ignore gas', 'low gas sensitivity']):
            updated_prefs.gas_sensitivity = "low"
            extracted_fields.append("gas_sensitivity")

        # Extract max drawdown tolerance
        drawdown_match = re.search(r'(\d+)%?\s*(?:drawdown|loss|drop)', msg_lower)
        if drawdown_match:
            try:
                drawdown = float(drawdown_match.group(1))
                updated_prefs.max_drawdown_tolerance_pct = drawdown
                extracted_fields.append("max_drawdown_tolerance_pct")
            except (ValueError, AttributeError):
                pass

        # Extract position sizing preference
        if any(word in msg_lower for word in ['conservative sizing', 'small positions', 'careful sizing']):
            updated_prefs.position_sizing_preference = "conservative"
            extracted_fields.append("position_sizing_preference")
        elif any(word in msg_lower for word in ['moderate sizing', 'medium positions']):
            updated_prefs.position_sizing_preference = "moderate"
            extracted_fields.append("position_sizing_preference")
        elif any(word in msg_lower for word in ['aggressive sizing', 'large positions', 'maximize size']):
            updated_prefs.position_sizing_preference = "aggressive"
            extracted_fields.append("position_sizing_preference")

        # Store additional notes
        if len(extracted_fields) == 0 and len(message.strip()) > 10:
            # If we didn't extract anything specific, save as notes
            notes = updated_prefs.additional_notes or ""
            updated_prefs.additional_notes = f"{notes}\n{message}".strip()

        return updated_prefs, extracted_fields

    def _count_required_fields(self, preferences: UserPreferences) -> int:
        """Count how many required fields have been filled."""
        count = 0
        for field in self.REQUIRED_FIELDS:
            value = getattr(preferences, field)
            if value is not None and value != [] and value != "":
                count += 1
        return count

    def _get_next_question(self, preferences: UserPreferences) -> str:
        """Generate the next question based on missing fields."""
        missing_fields = []

        for field in self.REQUIRED_FIELDS:
            value = getattr(preferences, field)
            if value is None or value == [] or value == "":
                missing_fields.append(field)

        if not missing_fields:
            return None  # Assessment complete

        # Priority order for questions
        question_priority = {
            "risk_tolerance": (
                "Let's talk about risk. On a scale of 1-10, how would you describe your risk tolerance? "
                "(1 = very conservative, 10 = very aggressive)"
            ),
            "initial_capital_usd": (
                "How much capital are you looking to deploy initially? "
                "This will help me configure appropriate position sizes."
            ),
            "trading_experience": (
                "What's your trading experience level?\n"
                "- Beginner: New to trading\n"
                "- Intermediate: Some experience with trading\n"
                "- Advanced: Experienced trader"
            ),
            "primary_goal": (
                "What's your primary goal with this arbitrage bot?\n"
                "- Maximize profit: Aggressive returns\n"
                "- Steady income: Consistent, lower-risk returns\n"
                "- Learning: Experiment and understand the strategy"
            ),
            "preferred_markets": (
                "Which markets are you interested in trading?\n"
                "- Cryptocurrency exchanges\n"
                "- Prediction markets\n"
                "- DeFi protocols\n"
                "- All of the above"
            ),
            "monitoring_frequency": (
                "How often will you monitor the bot's performance?\n"
                "- Real-time: Constant monitoring\n"
                "- Daily: Check once a day\n"
                "- Weekly: Check periodically"
            ),
            "gas_sensitivity": (
                "How important are gas costs to you?\n"
                "- High: Avoid high-gas periods, prioritize efficiency\n"
                "- Medium: Balance gas and opportunity costs\n"
                "- Low: Execute profitable trades regardless of gas"
            )
        }

        # Return the first missing question
        for field in missing_fields:
            if field in question_priority:
                return question_priority[field]

        return "Tell me more about your trading preferences..."

    def _build_conversation_context(
        self,
        session: AssessmentSession,
        conversation_history: List[Dict[str, str]],
        user_message: str
    ) -> str:
        """Build context for AI model."""
        prefs = session.preferences

        context = f"""You are an Arbitrage Bot Configuration Advisor having a conversation with a user.

CURRENT PREFERENCES GATHERED:
- Risk Tolerance: {prefs.risk_tolerance if prefs.risk_tolerance else 'Not specified'}
- Initial Capital: ${prefs.initial_capital_usd if prefs.initial_capital_usd else 'Not specified'}
- Trading Experience: {prefs.trading_experience if prefs.trading_experience else 'Not specified'}
- Primary Goal: {prefs.primary_goal if prefs.primary_goal else 'Not specified'}
- Preferred Markets: {', '.join(prefs.preferred_markets) if prefs.preferred_markets else 'Not specified'}
- Monitoring Frequency: {prefs.monitoring_frequency if prefs.monitoring_frequency else 'Not specified'}
- Gas Sensitivity: {prefs.gas_sensitivity if prefs.gas_sensitivity else 'Not specified'}

PROGRESS: {session.required_fields_collected}/{session.total_required_fields} required fields collected

YOUR ROLE:
- Be conversational but focused on gathering the remaining preferences
- Acknowledge what the user has shared
- Ask natural follow-up questions
- Explain concepts if the user asks (e.g., "What's a spread?")
- Be encouraging and supportive
- Don't sound robotic or overly scripted

CONVERSATION HISTORY:
"""

        for msg in conversation_history[-5:]:  # Last 5 messages for context
            role = "User" if msg["role"] == "user" else "Advisor"
            context += f"\n{role}: {msg['content']}"

        context += f"\n\nUser: {user_message}\n\nRespond naturally as the advisor:"

        return context

    async def process_message(
        self,
        session_id: str,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> ChatResponse:
        """
        Process a user message and generate a response.

        Args:
            session_id: Session identifier
            user_message: User's message text
            conversation_history: Previous conversation for context

        Returns:
            ChatResponse with advisor's message and updates
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if conversation_history is None:
            conversation_history = []

        # Extract preferences from message
        updated_prefs, extracted_fields = self._extract_preferences_from_message(
            user_message,
            session.preferences
        )

        # Update session
        session.preferences = updated_prefs
        session.updated_at = datetime.utcnow()
        session.required_fields_collected = self._count_required_fields(updated_prefs)

        # Build AI context
        ai_context = self._build_conversation_context(
            session,
            conversation_history,
            user_message
        )

        # Check if user is asking for an explanation
        is_question = '?' in user_message or any(
            word in user_message.lower() for word in
            ['what', 'how', 'why', 'explain', 'tell me', 'describe']
        )

        # Generate AI response
        try:
            ai_response = await self.openrouter.chat_completion(
                messages=[{"role": "user", "content": ai_context}],
                system_prompt=(
                    "You are a friendly, knowledgeable arbitrage bot advisor. "
                    "Keep responses concise (2-3 sentences) unless explaining a concept. "
                    "Focus on gathering preferences naturally through conversation."
                ),
                temperature=0.7
            )

            advisor_response = ai_response.get("content", "").strip()

        except Exception as e:
            # Fallback to simpler logic if AI fails
            if is_question:
                advisor_response = "I'd be happy to explain! Could you clarify what you'd like to know more about?"
            else:
                next_question = self._get_next_question(updated_prefs)
                advisor_response = f"Thanks for sharing that! {next_question}"

        # Check if assessment is complete
        is_complete = session.required_fields_collected >= session.total_required_fields

        if is_complete and not session.preferences.assessment_complete:
            session.preferences.assessment_complete = True

            # Add completion message
            completion_msg = (
                "\n\n🎉 Excellent! I've gathered all the key information. Here's what I understand:\n\n"
                f"• Risk Tolerance: {updated_prefs.risk_tolerance}/10\n"
                f"• Initial Capital: ${updated_prefs.initial_capital_usd}\n"
                f"• Trading Experience: {updated_prefs.trading_experience}\n"
                f"• Primary Goal: {updated_prefs.primary_goal}\n"
                f"• Markets: {', '.join(updated_prefs.preferred_markets)}\n\n"
                "Ready to move to the next step? I'll have our AI agents optimize your bot parameters "
                "based on these preferences. Just let me know when you're ready to proceed!"
            )
            advisor_response += completion_msg

        return ChatResponse(
            session_id=session_id,
            message_id=str(uuid.uuid4()),
            response=advisor_response,
            preferences_updated=len(extracted_fields) > 0,
            new_preferences=updated_prefs,
            assessment_complete=is_complete,
            suggested_next_step=AssessmentStep.OPTIMIZATION if is_complete else None,
            progress=f"{session.required_fields_collected}/{session.total_required_fields} fields collected"
        )

    def generate_initial_message(self, session: AssessmentSession) -> str:
        """Generate the initial greeting for a new session."""
        return self.initial_greeting
