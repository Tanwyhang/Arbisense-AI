"use client";

import React from "react";
import { Brain, CheckCircle, Loader2 } from "lucide-react";
import { StepPanelProps, AssessmentStep } from "@/types/chatbot";

interface Step2OptimizationProps extends StepPanelProps {
  optimizerStatus?: "pending" | "running" | "completed" | "failed";
  agentMessages?: Array<{
    agent_name: string;
    agent_role: string;
    message: string;
    confidence: number;
  }>;
  convergence?: number;
  currentRound?: number;
  totalRounds?: number;
}

export function Step2Optimization({
  sessionId,
  onNextStep,
  currentStep,
  optimizerStatus = "pending",
  agentMessages = [],
  convergence = 0,
  currentRound = 0,
  totalRounds = 3,
}: Step2OptimizationProps) {
  const isRunning = optimizerStatus === "running";
  const isCompleted = optimizerStatus === "completed";

  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="bg-terminal-dark-blue/30 border border-terminal-dark-blue rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-accent-cyan mb-1">
              Step 2: AI Ring Consensus Optimization
            </h2>
            <p className="text-sm text-gray-400">
              Our specialized AI agents are debating optimal parameters for your configuration
            </p>
          </div>
          <div className="bg-accent-cyan/20 border border-accent-cyan/50 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-accent-cyan">2/5</span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-4">
        {isRunning && (
          <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded p-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />
            <div>
              <p className="text-sm font-semibold text-accent-cyan">Optimization in Progress</p>
              <p className="text-xs text-gray-400">
                Round {currentRound}/{totalRounds} • Convergence: {(convergence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}
        {isCompleted && (
          <div className="bg-success-ag-green/10 border border-success-ag-green/30 rounded p-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success-ag-green" />
            <div>
              <p className="text-sm font-semibold text-success-ag-green">Optimization Complete</p>
              <p className="text-xs text-gray-400">
                Consensus reached at {(convergence * 100).toFixed(0)}% agreement
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Agent conversation */}
      <div className="flex-1 bg-terminal-black border border-terminal-dark-blue rounded-lg p-4 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
          <Brain className="w-5 h-5 text-accent-financial-blue" />
          <h3 className="font-semibold text-gray-300">Agent Debate</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm">
          {agentMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Waiting for optimization to start...</p>
              <p className="text-xs mt-1">The agents will debate here once you proceed.</p>
            </div>
          ) : (
            agentMessages.map((msg, index) => (
              <div
                key={index}
                className="bg-terminal-dark-blue/50 border border-terminal-dark-blue rounded p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-accent-financial-blue">
                      {msg.agent_name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">({msg.agent_role})</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence: {Math.round(msg.confidence * 100)}%
                  </div>
                </div>
                <div className="text-gray-300 text-xs leading-relaxed">{msg.message}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Continue button */}
      {isCompleted && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onNextStep}
            className="px-6 py-2 bg-success-ag-green/20 border border-success-ag-green/50 text-success-ag-green rounded hover:bg-success-ag-green/30 transition-all duration-200 font-semibold"
          >
            Continue to Testing →
          </button>
        </div>
      )}
    </div>
  );
}
