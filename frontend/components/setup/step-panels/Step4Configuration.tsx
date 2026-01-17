"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Settings, AlertTriangle } from "lucide-react";
import { StepPanelProps } from "@/types/chatbot";

interface BotParameters {
  min_spread_pct: number;
  min_profit_usd: number;
  max_risk_score: number;
  max_trade_size_usd: number;
  gas_cost_threshold_pct: number;
  position_sizing_cap: number;
}

interface Step4ConfigurationProps extends StepPanelProps {
  proposedParameters?: BotParameters;
  currentParameters?: BotParameters;
}

export function Step4Configuration({
  sessionId,
  onNextStep,
  currentStep,
  proposedParameters,
  currentParameters,
}: Step4ConfigurationProps) {
  const [userDecision, setUserDecision] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    // TODO: Call API to approve and apply parameters
    setTimeout(() => {
      setIsSubmitting(false);
      onNextStep();
    }, 1000);
  };

  const handleReject = () => {
    // TODO: Handle rejection - restart optimization or go back
    alert("Configuration rejected. Returning to optimization...");
  };

  if (!proposedParameters) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-terminal-dark-blue/30 border border-terminal-dark-blue rounded-lg p-4 mb-4">
          <h2 className="text-xl font-bold text-accent-cyan mb-1">Step 4: Configuration Review</h2>
          <p className="text-sm text-gray-400">Review and approve the final bot configuration</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Waiting for configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="bg-terminal-dark-blue/30 border border-terminal-dark-blue rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-accent-cyan mb-1">
              Step 4: Configuration Approval
            </h2>
            <p className="text-sm text-gray-400">
              Review the final parameters and approve to activate your bot
            </p>
          </div>
          <div className="bg-accent-cyan/20 border border-accent-cyan/50 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-accent-cyan">4/5</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-alert-signal-red/10 border border-alert-signal-red/30 rounded p-3 mb-4 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-alert-signal-red flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">
          <strong>Important:</strong> Once approved, these parameters will be applied to your live
          bot. Please review carefully.
        </p>
      </div>

      {/* Parameters comparison */}
      <div className="flex-1 bg-terminal-black border border-terminal-dark-blue rounded-lg p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
          <Settings className="w-5 h-5 text-accent-financial-blue" />
          <h3 className="font-semibold text-gray-300">Proposed Configuration</h3>
        </div>

        <div className="space-y-2 font-mono text-sm">
          {Object.entries(proposedParameters).map(([key, value]) => {
            const currentValue = currentParameters?.[key as keyof BotParameters];
            const hasChanged = currentValue !== undefined && currentValue !== value;
            const label = key
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{label}</span>
                  {hasChanged && (
                    <span className="px-2 py-0.5 bg-accent-cyan/20 border border-accent-cyan/50 rounded text-xs text-accent-cyan">
                      Changed
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent-cyan">{value}</p>
                  {currentValue !== undefined && (
                    <p className="text-xs text-gray-500">was: {currentValue}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval buttons */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="
            px-6 py-3 bg-alert-signal-red/20 border border-alert-signal-red/50
            text-alert-signal-red rounded hover:bg-alert-signal-red/30
            transition-all duration-200 font-semibold
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <XCircle className="w-5 h-5" />
          Reject & Re-optimize
        </button>

        <button
          onClick={handleApprove}
          disabled={isSubmitting}
          className="
            px-6 py-3 bg-success-ag-green/20 border border-success-ag-green/50
            text-success-ag-green rounded hover:bg-success-ag-green/30
            transition-all duration-200 font-semibold
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-success-ag-green border-t-transparent rounded-full animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Approve & Activate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
