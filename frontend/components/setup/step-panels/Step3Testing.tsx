"use client";

import React from "react";
import { BarChart3, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { StepPanelProps } from "@/types/chatbot";

interface SimulationMetrics {
  expected_return_30d: number;
  volatility_30d: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate: number;
  total_trades: number;
}

interface Step3TestingProps extends StepPanelProps {
  simulationStatus?: "pending" | "running" | "completed" | "failed";
  proposedMetrics?: SimulationMetrics;
  baselineMetrics?: SimulationMetrics;
}

export function Step3Testing({
  sessionId,
  onNextStep,
  currentStep,
  simulationStatus = "pending",
  proposedMetrics,
  baselineMetrics,
}: Step3TestingProps) {
  const isCompleted = simulationStatus === "completed";

  const formatDelta = (proposed: number, baseline: number) => {
    const delta = proposed - baseline;
    const pct = ((delta / baseline) * 100).toFixed(1);
    const isPositive = delta > 0;
    return (
      <span className={isPositive ? "text-success-ag-green" : "text-alert-signal-red"}>
        {isPositive ? "+" : ""}
        {pct}%
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="bg-terminal-dark-blue/30 border border-terminal-dark-blue rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-accent-cyan mb-1">
              Step 3: Simulation & Testing
            </h2>
            <p className="text-sm text-gray-400">
              Validating your configuration through Monte Carlo simulation and backtesting
            </p>
          </div>
          <div className="bg-accent-cyan/20 border border-accent-cyan/50 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-accent-cyan">3/5</span>
          </div>
        </div>
      </div>

      {/* Testing complete indicator */}
      {isCompleted && (
        <div className="bg-success-ag-green/10 border border-success-ag-green/30 rounded p-3 mb-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success-ag-green" />
          <div>
            <p className="text-sm font-semibold text-success-ag-green">Testing Complete</p>
            <p className="text-xs text-gray-400">
              1000 Monte Carlo paths • 30-day backtest • Statistical validation passed
            </p>
          </div>
        </div>
      )}

      {/* Metrics comparison */}
      <div className="flex-1 bg-terminal-black border border-terminal-dark-blue rounded-lg p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
          <BarChart3 className="w-5 h-5 text-accent-financial-blue" />
          <h3 className="font-semibold text-gray-300">Performance Comparison</h3>
        </div>

        {!proposedMetrics || !baselineMetrics ? (
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Waiting for simulation to complete...</p>
            <p className="text-xs mt-1">Metrics will appear here after optimization.</p>
          </div>
        ) : (
          <div className="space-y-3 font-mono text-sm">
            {/* Expected Return */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Expected Return (30d)</p>
                <p className="text-lg font-bold text-gray-200">
                  ${proposedMetrics.expected_return_30d.toFixed(2)}
                </p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.expected_return_30d, baselineMetrics.expected_return_30d)}</div>
            </div>

            {/* Sharpe Ratio */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Sharpe Ratio</p>
                <p className="text-lg font-bold text-gray-200">{proposedMetrics.sharpe_ratio.toFixed(2)}</p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.sharpe_ratio, baselineMetrics.sharpe_ratio)}</div>
            </div>

            {/* Win Rate */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Win Rate</p>
                <p className="text-lg font-bold text-gray-200">{(proposedMetrics.win_rate * 100).toFixed(1)}%</p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.win_rate, baselineMetrics.win_rate)}</div>
            </div>

            {/* Max Drawdown */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Max Drawdown</p>
                <p className="text-lg font-bold text-gray-200">{proposedMetrics.max_drawdown_pct.toFixed(2)}%</p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.max_drawdown_pct, baselineMetrics.max_drawdown_pct)}</div>
            </div>

            {/* Volatility */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Volatility (30d)</p>
                <p className="text-lg font-bold text-gray-200">{proposedMetrics.volatility_30d.toFixed(2)}%</p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.volatility_30d, baselineMetrics.volatility_30d)}</div>
            </div>

            {/* Total Trades */}
            <div className="flex items-center justify-between p-3 bg-terminal-dark-blue/30 rounded border border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Expected Trades (30d)</p>
                <p className="text-lg font-bold text-gray-200">{proposedMetrics.total_trades}</p>
              </div>
              <div className="text-right">{formatDelta(proposedMetrics.total_trades, baselineMetrics.total_trades)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Continue button */}
      {isCompleted && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onNextStep}
            className="px-6 py-2 bg-success-ag-green/20 border border-success-ag-green/50 text-success-ag-green rounded hover:bg-success-ag-green/30 transition-all duration-200 font-semibold"
          >
            Review Configuration →
          </button>
        </div>
      )}
    </div>
  );
}
