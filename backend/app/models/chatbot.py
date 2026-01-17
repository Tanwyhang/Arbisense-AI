"""
Chatbot data models for arbitrage bot configuration.

Defines schemas for assessment sessions, messages, and user preferences.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Types of messages in the conversation."""
    USER = "user"
    ADVISOR = "advisor"
    SYSTEM = "system"


class AssessmentStep(str, Enum):
    """Steps in the assessment workflow."""
    ASSESSMENT = "assessment"           # Step 1: Chat conversation
    OPTIMIZATION = "optimization"       # Step 2: Ring consensus
    TESTING = "testing"                 # Step 3: Monte Carlo simulation
    CONFIGURATION = "configuration"     # Step 4: Final approval
    ACTIVATION = "activation"           # Step 5: Bot is live


class ChatMessage(BaseModel):
    """A single message in the chat conversation."""
    id: str = Field(..., description="Unique message identifier")
    session_id: str = Field(..., description="Session this message belongs to")
    role: MessageType = Field(..., description="Who sent the message")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When message was sent")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional message data")


class UserPreferences(BaseModel):
    """User preferences gathered during assessment."""
    # Core trading parameters
    risk_tolerance: Optional[int] = Field(None, ge=1, le=10, description="Risk tolerance 1-10")
    initial_capital_usd: Optional[float] = Field(None, gt=0, description="Initial trading capital")
    max_trade_size_usd: Optional[float] = Field(None, gt=0, description="Maximum per-trade size")

    # Experience and goals
    trading_experience: Optional[str] = Field(None, description="Experience level: beginner/intermediate/advanced")
    primary_goal: Optional[str] = Field(None, description="Main goal: max_profit/steady_income/learning")

    # Market preferences
    preferred_markets: Optional[List[str]] = Field(default_factory=list, description="Markets to trade")
    excluded_markets: Optional[List[str]] = Field(default_factory=list, description="Markets to avoid")

    # Operational constraints
    monitoring_frequency: Optional[str] = Field(None, description="How often user checks: realtime/daily/weekly")
    gas_sensitivity: Optional[str] = Field(None, description="Gas cost concern: low/medium/high")

    # Risk management
    max_drawdown_tolerance_pct: Optional[float] = Field(None, ge=0, le=100, description="Max acceptable drawdown %")
    position_sizing_preference: Optional[str] = Field(None, description="Position sizing: conservative/moderate/aggressive")

    # Additional context
    additional_notes: Optional[str] = Field(None, description="Any extra information provided")
    assessment_complete: bool = Field(default=False, description="Whether assessment is complete")


class AssessmentSession(BaseModel):
    """An active assessment session."""
    id: str = Field(..., description="Unique session identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session start time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    current_step: AssessmentStep = Field(default=AssessmentStep.ASSESSMENT, description="Current workflow step")
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="Gathered preferences")

    # Workflow tracking
    optimizer_session_id: Optional[str] = Field(None, description="Linked optimizer session")
    is_complete: bool = Field(default=False, description="Whether entire workflow is complete")

    # Progress tracking
    required_fields_collected: int = Field(default=0, description="Number of required fields gathered")
    total_required_fields: int = Field(default=7, description="Total required fields to collect")


class ChatRequest(BaseModel):
    """Request to send a message to the chatbot."""
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="User's message content")
    context_updates: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any context updates")


class ChatResponse(BaseModel):
    """Response from the chatbot."""
    session_id: str = Field(..., description="Session identifier")
    message_id: str = Field(..., description="Response message identifier")
    response: str = Field(..., description="Advisor's response text")
    preferences_updated: bool = Field(default=False, description="Whether preferences were updated")
    new_preferences: Optional[UserPreferences] = Field(None, description="Updated preferences")
    assessment_complete: bool = Field(default=False, description="Whether assessment is now complete")
    suggested_next_step: Optional[AssessmentStep] = Field(None, description="Suggested next workflow step")
    progress: Optional[str] = Field(None, description="Progress indicator (e.g., '5/7 fields collected')")


class SessionContext(BaseModel):
    """Context information for a session."""
    session: AssessmentSession = Field(..., description="The session data")
    current_parameters: Optional[Dict[str, Any]] = Field(None, description="Current bot parameters")
    baseline_metrics: Optional[Dict[str, float]] = Field(None, description="Current performance metrics")
    conversation_summary: Optional[str] = Field(None, description="Summary of conversation so far")


class StartSessionRequest(BaseModel):
    """Request to start a new assessment session."""
    user_id: Optional[str] = Field(None, description="Optional user identifier")


class StartSessionResponse(BaseModel):
    """Response when starting a new session."""
    session_id: str = Field(..., description="New session identifier")
    initial_message: str = Field(..., description="First advisor message")
    current_step: AssessmentStep = Field(..., description="Current workflow step")


class TransitionRequest(BaseModel):
    """Request to transition to next step."""
    session_id: str = Field(..., description="Session identifier")
    target_step: AssessmentStep = Field(..., description="Step to transition to")


class TransitionResponse(BaseModel):
    """Response for step transition."""
    success: bool = Field(..., description="Whether transition succeeded")
    current_step: AssessmentStep = Field(..., description="New current step")
    message: str = Field(..., description="Transition message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data for the step")
