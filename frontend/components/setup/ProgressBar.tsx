"use client";

import React from "react";
import { AssessmentStep } from "@/types/chatbot";
import { Check, Circle, Loader2 } from "lucide-react";

interface ProgressBarProps {
  currentStep: AssessmentStep;
  onStepClick?: (step: AssessmentStep) => void;
  canNavigateBack?: boolean;
}

const steps = [
  { step: AssessmentStep.ASSESSMENT, label: "Assessment", description: "Chat with advisor" },
  { step: AssessmentStep.OPTIMIZATION, label: "Optimization", description: "AI agents debate" },
  { step: AssessmentStep.TESTING, label: "Testing", description: "Validate parameters" },
  { step: AssessmentStep.CONFIGURATION, label: "Configuration", description: "Apply settings" },
  { step: AssessmentStep.ACTIVATION, label: "Activation", description: "Bot is live" },
];

export function ProgressBar({
  currentStep,
  onStepClick,
  canNavigateBack = true,
}: ProgressBarProps) {
  const currentStepIndex = steps.findIndex((s) => s.step === currentStep);

  const handleStepClick = (step: AssessmentStep, index: number) => {
    if (!onStepClick) return;
    if (!canNavigateBack) return;
    // Only allow clicking on completed steps or the current step
    if (index <= currentStepIndex) {
      onStepClick(step);
    }
  };

  return (
    <div className="flex flex-col gap-0 bg-terminal-black border border-terminal-dark-blue p-4 rounded">
      <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">
        Setup Progress
      </h3>

      <div className="flex flex-col gap-0">
        {steps.map((stepConfig, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = canNavigateBack && index <= currentStepIndex;

          return (
            <div key={stepConfig.step} className="relative">
              {/* Step item */}
              <button
                onClick={() => handleStepClick(stepConfig.step, index)}
                disabled={!isClickable}
                className={`
                  flex items-start gap-3 w-full text-left py-3 px-2 rounded
                  transition-all duration-200
                  ${isClickable ? "cursor-pointer hover:bg-terminal-dark-blue/50" : "cursor-default opacity-50"}
                  ${isCurrent ? "bg-terminal-dark-blue/30" : ""}
                `}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-success-ag-green flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" strokeWidth={3} />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-accent-cyan flex items-center justify-center animate-pulse">
                      <Loader2 className="w-3 h-3 text-black" strokeWidth={2} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center">
                      <Circle className="w-2 h-2 text-gray-600" fill="currentColor" />
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`
                      text-sm font-medium tracking-wide
                      ${isCurrent ? "text-accent-cyan" : isCompleted ? "text-success-ag-green" : "text-gray-400"}
                    `}
                  >
                    {index + 1}. {stepConfig.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{stepConfig.description}</div>
                </div>
              </button>

              {/* Connector line (except for last item) */}
              {index < steps.length - 1 && (
                <div className="absolute left-[26px] top-10 bottom-0 w-0.5 bg-gray-800 -z-10" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Progress</span>
          <span className="text-accent-cyan font-mono">
            {currentStepIndex + 1} / {steps.length}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-cyan to-accent-financial-blue transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
