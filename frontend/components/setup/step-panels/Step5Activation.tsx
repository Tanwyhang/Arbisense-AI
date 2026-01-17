"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Activity, TrendingUp, ArrowRight } from "lucide-react";
import { StepPanelProps } from "@/types/chatbot";

interface LiveMetrics {
  total_profit_usd: number;
  trades_executed: number;
  current_risk_score: number;
  uptime_seconds: number;
  last_trade_time: string;
}

export function Step5Activation({ sessionId, onNextStep, currentStep }: StepPanelProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Simulate live metrics
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(true);
      setMetrics({
        total_profit_usd: 0,
        trades_executed: 0,
        current_risk_score: 7,
        uptime_seconds: 0,
        last_trade_time: new Date().toISOString(),
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isActive || !metrics) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="w-12 h-12 border-4 border-success-ag-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-semibold text-gray-300">Activating your bot...</p>
        <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Success header */}
      <div className="bg-success-ag-green/10 border border-success-ag-green/30 rounded-lg p-6 mb-6 text-center">
        <CheckCircle className="w-16 h-16 text-success-ag-green mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-success-ag-green mb-2">
          Setup Complete!
        </h1>
        <p className="text-lg text-gray-300">
          Your arbitrage bot is now live and monitoring markets
        </p>
      </div>

      {/* Live metrics */}
      <div className="flex-1 bg-terminal-black border border-terminal-dark-blue rounded-lg p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-800">
          <Activity className="w-6 h-6 text-accent-financial-blue" />
          <h3 className="text-xl font-semibold text-gray-300">Live Performance</h3>
          <span className="ml-auto px-3 py-1 bg-success-ag-green/20 border border-success-ag-green/50 rounded-full text-xs text-success-ag-green font-semibold animate-pulse">
            ● LIVE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 font-mono">
          {/* Total Profit */}
          <div className="bg-terminal-dark-blue/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Total Profit</p>
            <p className="text-3xl font-bold text-success-ag-green">
              ${metrics.total_profit_usd.toFixed(2)}
            </p>
          </div>

          {/* Trades Executed */}
          <div className="bg-terminal-dark-blue/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Trades Executed</p>
            <p className="text-3xl font-bold text-accent-cyan">{metrics.trades_executed}</p>
          </div>

          {/* Risk Score */}
          <div className="bg-terminal-dark-blue/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Current Risk Score</p>
            <p className="text-3xl font-bold text-accent-financial-blue">
              {metrics.current_risk_score}/10
            </p>
          </div>

          {/* Uptime */}
          <div className="bg-terminal-dark-blue/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Uptime</p>
            <p className="text-3xl font-bold text-gray-300">
              {Math.floor(metrics.uptime_seconds / 60)}m
            </p>
          </div>
        </div>

        {/* Last trade info */}
        <div className="mt-6 p-4 bg-terminal-dark-blue/30 border border-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Last Activity</p>
          <p className="text-sm text-gray-300">
            Bot initialized at {new Date(metrics.last_trade_time).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          onClick={() => (window.location.href = "/optimizer")}
          className="
            px-6 py-3 bg-accent-financial-blue/20 border border-accent-financial-blue/50
            text-accent-financial-blue rounded hover:bg-accent-financial-blue/30
            transition-all duration-200 font-semibold
            flex items-center justify-center gap-2
          "
        >
          <Activity className="w-5 h-5" />
          Go to Dashboard
        </button>

        <button
          onClick={() => (window.location.href = "/optimizer")}
          className="
            px-6 py-3 bg-accent-cyan/20 border border-accent-cyan/50
            text-accent-cyan rounded hover:bg-accent-cyan/30
            transition-all duration-200 font-semibold
            flex items-center justify-center gap-2
          "
        >
          <TrendingUp className="w-5 h-5" />
          View Optimization
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Reconfigure option */}
      <div className="mt-4 text-center">
        <button
          onClick={() => (window.location.href = "/setup")}
          className="text-sm text-gray-500 hover:text-gray-300 underline"
        >
          Start over with new configuration
        </button>
      </div>
    </div>
  );
}
