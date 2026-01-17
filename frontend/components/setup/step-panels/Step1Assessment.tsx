"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { StepPanelProps } from "@/types/chatbot";
import { ChatInterface } from "../ChatInterface";
import { ContextPanel } from "../ContextPanel";

export function Step1Assessment({ sessionId, onNextStep, currentStep }: StepPanelProps) {
  return (
    <div className="flex gap-4 h-full">
      {/* Center: Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Step header */}
        <div className="bg-terminal-dark-blue/30 border border-terminal-dark-blue rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-accent-cyan mb-1">
                Step 1: Risk Assessment & Preference Gathering
              </h2>
              <p className="text-sm text-gray-400">
                Chat with our AI advisor to customize your bot configuration
              </p>
            </div>
            <div className="bg-accent-cyan/20 border border-accent-cyan/50 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-accent-cyan">1/5</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="bg-alert-signal-red/10 border border-alert-signal-red/30 rounded p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-alert-signal-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">
            Your responses help configure parameters like risk tolerance, position sizing, and trade
            frequency. All information is stored locally and never shared.
          </p>
        </div>

        {/* Chat interface will be rendered by the parent page */}
        <div className="text-xs text-gray-500 italic">
          Chat interface loaded by parent component...
        </div>
      </div>

      {/* Right: Context Panel */}
      <div className="w-80">
        {/* Context panel will be rendered by the parent page */}
        <div className="text-xs text-gray-500 italic">Context panel loaded by parent...</div>
      </div>
    </div>
  );
}
