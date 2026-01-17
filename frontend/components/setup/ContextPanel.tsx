"use client";

import React from "react";
import { UserPreferences } from "@/types/chatbot";
import { CheckCircle, Circle, HelpCircle } from "lucide-react";

interface ContextPanelProps {
  preferences: UserPreferences | null;
  progress?: string;
}

export function ContextPanel({ preferences, progress }: ContextPanelProps) {
  const hasValue = (value: any) => value !== undefined && value !== null && value !== "";

  const preferenceItems = [
    {
      key: "risk_tolerance",
      label: "Risk Tolerance",
      format: (v: number) => `${v}/10`,
      category: "Core Parameters",
    },
    {
      key: "initial_capital_usd",
      label: "Initial Capital",
      format: (v: number) => `$${v.toLocaleString()}`,
      category: "Core Parameters",
    },
    {
      key: "max_trade_size_usd",
      label: "Max Trade Size",
      format: (v: number) => `$${v.toLocaleString()}`,
      category: "Core Parameters",
    },
    {
      key: "trading_experience",
      label: "Experience Level",
      format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1),
      category: "Trading Profile",
    },
    {
      key: "primary_goal",
      label: "Primary Goal",
      format: (v: string) =>
        v
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      category: "Trading Profile",
    },
    {
      key: "preferred_markets",
      label: "Markets",
      format: (v: string[]) =>
        v.length > 0
          ? v.map((m) =>
              m
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
            ).join(", ")
          : "Not specified",
      category: "Trading Profile",
    },
    {
      key: "monitoring_frequency",
      label: "Monitoring",
      format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1),
      category: "Operational",
    },
    {
      key: "gas_sensitivity",
      label: "Gas Sensitivity",
      format: (v: string) =>
        v
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      category: "Operational",
    },
    {
      key: "max_drawdown_tolerance_pct",
      label: "Max Drawdown",
      format: (v: number) => `${v}%`,
      category: "Risk Management",
      optional: true,
    },
    {
      key: "position_sizing_preference",
      label: "Position Sizing",
      format: (v: string) =>
        v
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      category: "Risk Management",
      optional: true,
    },
  ];

  // Group preferences by category
  const categories = Array.from(new Set(preferenceItems.map((item) => item.category)));

  return (
    <div className="flex flex-col h-full bg-terminal-black border border-terminal-dark-blue rounded overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-1">
          Configuration Summary
        </h3>
        {progress && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-cyan to-success-ag-green transition-all duration-500"
                style={{
                  width: `${(parseInt(progress.split("/")[0]) / parseInt(progress.split("/")[1])) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-accent-cyan font-mono">{progress}</span>
          </div>
        )}
      </div>

      {/* Preferences by category */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-sm">
        {!preferences || Object.keys(preferences).length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No preferences gathered yet.</p>
            <p className="text-xs mt-1">Start chatting to build your configuration.</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryItems = preferenceItems.filter((item) => item.category === category);

            return (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryItems.map((item) => {
                    const value = preferences[item.key as keyof UserPreferences];
                    const hasVal = hasValue(value);
                    const isOptional = item.optional;

                    return (
                      <div key={item.key} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {hasVal ? (
                            <CheckCircle className="w-4 h-4 text-success-ag-green" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">{item.label}</div>
                          <div
                            className={`text-sm ${hasVal ? "text-gray-200" : "text-gray-600 italic"}`}
                          >
                            {hasVal ? item.format(value) : isOptional ? "Optional" : "Not specified"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Additional notes */}
        {preferences?.additional_notes && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
              Additional Notes
            </h4>
            <div className="text-xs text-gray-300 italic bg-terminal-dark-blue/30 p-2 rounded border border-gray-800">
              {preferences.additional_notes}
            </div>
          </div>
        )}
      </div>

      {/* Footer with glossary link */}
      <div className="p-3 border-t border-gray-800 text-xs text-center">
        <button className="text-accent-cyan hover:underline opacity-70 hover:opacity-100 transition-opacity">
          View Terminology Glossary
        </button>
      </div>
    </div>
  );
}
