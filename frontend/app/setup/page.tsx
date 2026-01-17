"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AssessmentStep,
  ChatMessage,
  MessageType,
  UserPreferences,
  QuickAction,
  WorkflowState,
  WebSocketMessage,
} from "@/types/chatbot";
import { ProgressBar } from "@/components/setup/ProgressBar";
import { ChatInterface } from "@/components/setup/ChatInterface";
import { ContextPanel } from "@/components/setup/ContextPanel";
import { Step1Assessment } from "@/components/setup/step-panels/Step1Assessment";
import { Step2Optimization } from "@/components/setup/step-panels/Step2Optimization";
import { Step3Testing } from "@/components/setup/step-panels/Step3Testing";
import { Step4Configuration } from "@/components/setup/step-panels/Step4Configuration";
import { Step5Activation } from "@/components/setup/step-panels/Step5Activation";

export default function SetupPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId?.toString() || null;

  const [state, setState] = useState<WorkflowState>({
    currentStep: AssessmentStep.ASSESSMENT,
    sessionId: null,
    preferences: null,
    isLoading: false,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<string>("0/7 fields collected");

  const wsRef = useRef<WebSocket | null>(null);

  // Quick action buttons for the chat
  const quickActions: QuickAction[] = [
    { label: "Conservative (1-3)", value: "I'm conservative, around 2-3 on the risk scale", category: "risk" },
    { label: "Moderate (4-7)", value: "I'm moderate, around 5-6 on the risk scale", category: "risk" },
    { label: "Aggressive (8-10)", value: "I'm aggressive, around 8-9 on the risk scale", category: "risk" },
    { label: "Beginner", value: "I'm a beginner trader", category: "experience" },
    { label: "Experienced", value: "I have trading experience", category: "experience" },
    { label: "Maximize profit", value: "I want to maximize profit", category: "goal" },
    { label: "Steady income", value: "I prefer steady income", category: "goal" },
  ];

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chatbot/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: "user" }),
        });

        if (!response.ok) throw new Error("Failed to start session");

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          sessionId: data.session_id,
          isLoading: false,
        }));

        // Add initial advisor message
        const initialMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          session_id: data.session_id,
          role: MessageType.ADVISOR,
          content: data.initial_message,
          timestamp: new Date().toISOString(),
        };

        setMessages([initialMessage]);

        // Connect WebSocket
        connectWebSocket(data.session_id);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setState((prev) => ({ ...prev, isLoading: false, error: "Failed to start session" }));
      }
    };

    if (!sessionId) {
      initSession();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // WebSocket connection
  const connectWebSocket = (sid: string) => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/api/chatbot/ws/${sid}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "connected":
            console.log("WebSocket acknowledged");
            break;

          case "advisor_message":
            const advisorMsg: ChatMessage = {
              id: `msg-${Date.now()}`,
              session_id: sid,
              role: MessageType.ADVISOR,
              content: message.data.response,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, advisorMsg]);

            if (message.data.new_preferences) {
              setState((prev) => ({ ...prev, preferences: message.data.new_preferences }));
            }

            if (message.data.progress) {
              setProgress(message.data.progress);
            }
            break;

          case "assessment_complete":
            setState((prev) => ({ ...prev, preferences: message.data.preferences }));
            break;

          case "error":
            console.error("WebSocket error:", message.data.message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
  };

  // Send message to chatbot
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!state.sessionId || state.isLoading) return;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        session_id: state.sessionId,
        role: MessageType.USER,
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chatbot/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: state.sessionId,
            message: messageText,
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const data = await response.json();

        // Add advisor response
        const advisorMessage: ChatMessage = {
          id: data.message_id,
          session_id: state.sessionId,
          role: MessageType.ADVISOR,
          content: data.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, advisorMessage]);

        if (data.new_preferences) {
          setState((prev) => ({ ...prev, preferences: data.new_preferences }));
        }

        if (data.progress) {
          setProgress(data.progress);
        }

        // Auto-transition to optimization if assessment complete
        if (data.assessment_complete && data.suggested_next_step === AssessmentStep.OPTIMIZATION) {
          setTimeout(() => {
            setState((prev) => ({ ...prev, currentStep: AssessmentStep.OPTIMIZATION }));
            // Trigger optimization
            triggerOptimization();
          }, 2000);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [state.sessionId, state.isLoading]
  );

  // Trigger optimization step
  const triggerOptimization = async () => {
    if (!state.sessionId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/optimizer/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_preferences: state.preferences,
          goal: "custom",
        }),
      });

      if (!response.ok) throw new Error("Failed to start optimization");

      const data = await response.json();
      setState((prev) => ({ ...prev, optimizerSessionId: data.session_id }));

      // TODO: Handle optimization progress via WebSocket
    } catch (error) {
      console.error("Failed to trigger optimization:", error);
    }
  };

  // Step navigation
  const handleNextStep = () => {
    const stepOrder = [
      AssessmentStep.ASSESSMENT,
      AssessmentStep.OPTIMIZATION,
      AssessmentStep.TESTING,
      AssessmentStep.CONFIGURATION,
      AssessmentStep.ACTIVATION,
    ];

    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setState((prev) => ({ ...prev, currentStep: stepOrder[currentIndex + 1] }));
    }
  };

  const handlePreviousStep = () => {
    const stepOrder = [
      AssessmentStep.ASSESSMENT,
      AssessmentStep.OPTIMIZATION,
      AssessmentStep.TESTING,
      AssessmentStep.CONFIGURATION,
      AssessmentStep.ACTIVATION,
    ];

    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState((prev) => ({ ...prev, currentStep: stepOrder[currentIndex - 1] }));
    }
  };

  const handleStepClick = (step: AssessmentStep) => {
    // Only allow navigating back to completed steps
    const stepOrder = [
      AssessmentStep.ASSESSMENT,
      AssessmentStep.OPTIMIZATION,
      AssessmentStep.TESTING,
      AssessmentStep.CONFIGURATION,
      AssessmentStep.ACTIVATION,
    ];

    const currentIndex = stepOrder.indexOf(state.currentStep);
    const targetIndex = stepOrder.indexOf(step);

    if (targetIndex <= currentIndex) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  };

  // Render current step panel
  const renderStepPanel = () => {
    const stepProps = {
      sessionId: state.sessionId || "",
      onNextStep: handleNextStep,
      onPreviousStep: handlePreviousStep,
      currentStep: state.currentStep,
    };

    switch (state.currentStep) {
      case AssessmentStep.ASSESSMENT:
        return (
          <div className="flex gap-4 h-full">
            {/* Center: Chat Interface */}
            <div className="flex-1">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={state.isLoading}
                disabled={!state.sessionId}
                quickActions={quickActions}
                assessmentComplete={state.preferences?.assessment_complete}
              />
            </div>

            {/* Right: Context Panel */}
            <div className="w-80">
              <ContextPanel preferences={state.preferences} progress={progress} />
            </div>
          </div>
        );

      case AssessmentStep.OPTIMIZATION:
        return <Step2Optimization {...stepProps} optimizerStatus="pending" />;

      case AssessmentStep.TESTING:
        return <Step3Testing {...stepProps} simulationStatus="pending" />;

      case AssessmentStep.CONFIGURATION:
        return <Step4Configuration {...stepProps} />;

      case AssessmentStep.ACTIVATION:
        return <Step5Activation {...stepProps} />;

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-terminal-black p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-accent-cyan mb-2">Bot Setup Wizard</h1>
        <p className="text-gray-400">
          Follow the steps to configure your personalized arbitrage bot
        </p>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left: Progress bar */}
        <div className="w-64 flex-shrink-0">
          <ProgressBar
            currentStep={state.currentStep}
            onStepClick={handleStepClick}
            canNavigateBack={true}
          />
        </div>

        {/* Center/Right: Step panels */}
        <div className="flex-1 overflow-hidden">{renderStepPanel()}</div>
      </div>

      {/* Error display */}
      {state.error && (
        <div className="fixed bottom-4 right-4 bg-alert-signal-red/20 border border-alert-signal-red/50 text-alert-signal-red px-4 py-2 rounded">
          {state.error}
        </div>
      )}
    </div>
  );
}
