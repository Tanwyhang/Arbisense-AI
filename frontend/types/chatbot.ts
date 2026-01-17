/**
 * Chatbot type definitions for arbitrage bot configuration.
 *
 * These types mirror the backend Pydantic models in backend/app/models/chatbot.py
 */

/**
 * Message types in the conversation
 */
export enum MessageType {
  USER = "user",
  ADVISOR = "advisor",
  SYSTEM = "system",
}

/**
 * Steps in the assessment workflow
 */
export enum AssessmentStep {
  ASSESSMENT = "assessment",
  OPTIMIZATION = "optimization",
  TESTING = "testing",
  CONFIGURATION = "configuration",
  ACTIVATION = "activation",
}

/**
 * A single message in the chat conversation
 */
export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageType;
  content: string;
  timestamp: string; // ISO datetime
  metadata?: Record<string, any>;
}

/**
 * User preferences gathered during assessment
 */
export interface UserPreferences {
  // Core trading parameters
  risk_tolerance?: number; // 1-10
  initial_capital_usd?: number;
  max_trade_size_usd?: number;

  // Experience and goals
  trading_experience?: "beginner" | "intermediate" | "advanced";
  primary_goal?: "max_profit" | "steady_income" | "learning";

  // Market preferences
  preferred_markets?: string[]; // e.g., ["cryptocurrency", "prediction_markets"]
  excluded_markets?: string[];

  // Operational constraints
  monitoring_frequency?: "realtime" | "daily" | "weekly";
  gas_sensitivity?: "low" | "medium" | "high";

  // Risk management
  max_drawdown_tolerance_pct?: number;
  position_sizing_preference?: "conservative" | "moderate" | "aggressive";

  // Additional context
  additional_notes?: string;
  assessment_complete?: boolean;
}

/**
 * An active assessment session
 */
export interface AssessmentSession {
  id: string;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  current_step: AssessmentStep;
  preferences: UserPreferences;

  // Workflow tracking
  optimizer_session_id?: string;
  is_complete?: boolean;

  // Progress tracking
  required_fields_collected: number;
  total_required_fields: number;
}

/**
 * Request to send a message to the chatbot
 */
export interface ChatRequest {
  session_id: string;
  message: string;
  context_updates?: Record<string, any>;
}

/**
 * Response from the chatbot
 */
export interface ChatResponse {
  session_id: string;
  message_id: string;
  response: string;
  preferences_updated: boolean;
  new_preferences?: UserPreferences;
  assessment_complete: boolean;
  suggested_next_step?: AssessmentStep;
  progress?: string; // e.g., "5/7 fields collected"
}

/**
 * Context information for a session
 */
export interface SessionContext {
  session: AssessmentSession;
  current_parameters?: Record<string, any>;
  baseline_metrics?: Record<string, number>;
  conversation_summary?: string;
}

/**
 * Request to start a new session
 */
export interface StartSessionRequest {
  user_id?: string;
}

/**
 * Response when starting a new session
 */
export interface StartSessionResponse {
  session_id: string;
  initial_message: string;
  current_step: AssessmentStep;
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: "connected"; data: ConnectedData }
  | { type: "advisor_message"; data: AdvisorMessageData }
  | { type: "assessment_complete"; data: AssessmentCompleteData }
  | { type: "context_update"; data: ContextUpdateData }
  | { type: "error"; data: ErrorData }
  | { type: "ping" }
  | { type: "pong" };

export interface ConnectedData {
  session_id: string;
  current_step: AssessmentStep;
  progress: string;
}

export interface AdvisorMessageData {
  response: string;
  preferences_updated: boolean;
  new_preferences?: UserPreferences;
  assessment_complete: boolean;
  progress?: string;
}

export interface AssessmentCompleteData {
  session_id: string;
  preferences: UserPreferences;
  next_step: string;
}

export interface ContextUpdateData {
  preferences: UserPreferences;
  conversation_history: ChatMessage[];
  progress: string;
}

export interface ErrorData {
  message: string;
}

/**
 * Quick action button configuration
 */
export interface QuickAction {
  label: string;
  value: string;
  category: "risk" | "experience" | "goal" | "market" | "general";
}

/**
 * Step panel props
 */
export interface StepPanelProps {
  sessionId: string;
  onNextStep: () => void;
  onPreviousStep: () => void;
  currentStep: AssessmentStep;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  currentStep: AssessmentStep;
  sessionId: string | null;
  preferences: UserPreferences | null;
  optimizerSessionId?: string;
  isLoading: boolean;
  error?: string;
}
