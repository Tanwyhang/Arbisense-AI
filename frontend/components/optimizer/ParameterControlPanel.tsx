/**
 * Parameter Control Panel
 * Displays and allows editing of arbitrage parameters
 */
'use client';

import { useState } from 'react';
import { Settings, Play, Info } from 'lucide-react';

import {
  ArbitrageParameters,
  PerformanceMetrics,
  OptimizationRequest,
  OptimizationStatus
} from '@/types/optimizer';

interface Props {
  onStartOptimization: (request: OptimizationRequest) => void;
  isLoading: boolean;
  session?: any;
}

export default function ParameterControlPanel({ onStartOptimization, isLoading, session }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Default parameters
  const [parameters, setParameters] = useState<ArbitrageParameters>({
    min_spread_pct: 0.5,
    min_profit_usd: 1.0,
    max_risk_score: 8,
    min_trade_size_usd: 10.0,
    max_trade_size_usd: 10000.0,
    polymarket_fee_pct: 0.3,
    limitless_fee_pct: 0.3,
    default_slippage_pct: 0.1,
    base_gas_cost_usd: 0.50,
    gas_cost_threshold_pct: 35.0,
    position_sizing_cap: 5.0,
    consensus_threshold: 0.67,
    monte_carlo_levy_alpha: 1.7
  });

  const [metrics] = useState<PerformanceMetrics>({
    sharpe_ratio: 1.85,
    total_return_pct: 12.5,
    max_drawdown_pct: -8.3,
    win_rate: 0.62,
    profit_factor: 2.1,
    total_trades: 145,
    average_profit_usd: 15.50,
    total_profit_usd: 2247.50,
    cvar_95: -120.0,
    volatility_daily: 2.3
  });

  const handleStart = () => {
    const request: OptimizationRequest = {
      current_parameters: parameters,
      current_metrics: metrics,
      optimization_goal: 'balanced',
      max_iterations: 3,
      agent_count: 5
    };

    onStartOptimization(request);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-200">
            Parameters
          </h2>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? 'Less' : 'More'}
        </button>
      </div>

      {/* Current Metrics */}
      <div className="mb-5 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-300">Current Performance</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Sharpe:</span>{' '}
            <span className="text-green-400 font-mono">{metrics.sharpe_ratio.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">Return:</span>{' '}
            <span className="text-green-400 font-mono">{metrics.total_return_pct.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Win Rate:</span>{' '}
            <span className="text-blue-400 font-mono">{(metrics.win_rate * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Drawdown:</span>{' '}
            <span className="text-red-400 font-mono">{metrics.max_drawdown_pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Core Parameters */}
      <div className="space-y-3 mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Trading Parameters
        </h3>

        <ParameterInput
          label="Min Spread"
          value={parameters.min_spread_pct}
          suffix="%"
          onChange={(v) => setParameters({ ...parameters, min_spread_pct: v })}
          min={0.1}
          max={2.0}
          step={0.1}
        />

        <ParameterInput
          label="Min Profit"
          value={parameters.min_profit_usd}
          prefix="$"
          onChange={(v) => setParameters({ ...parameters, min_profit_usd: v })}
          min={0.5}
          max={10.0}
          step={0.5}
        />

        <ParameterInput
          label="Max Risk Score"
          value={parameters.max_risk_score}
          suffix="/10"
          onChange={(v) => setParameters({ ...parameters, max_risk_score: Math.round(v) })}
          min={3}
          max={10}
          step={1}
        />

        <ParameterInput
          label="Max Trade Size"
          value={parameters.max_trade_size_usd}
          prefix="$"
          onChange={(v) => setParameters({ ...parameters, max_trade_size_usd: v })}
          min={100}
          max={50000}
          step={1000}
        />
      </div>

      {/* Advanced Parameters */}
      {showAdvanced && (
        <div className="space-y-3 mb-4 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Advanced
          </h3>

          <ParameterInput
            label="Gas Threshold"
            value={parameters.gas_cost_threshold_pct}
            suffix="% of profit"
            onChange={(v) => setParameters({ ...parameters, gas_cost_threshold_pct: v })}
            min={10}
            max={50}
            step={5}
          />

          <ParameterInput
            label="Position Cap"
            value={parameters.position_sizing_cap}
            suffix="%"
            onChange={(v) => setParameters({ ...parameters, position_sizing_cap: v })}
            min={1}
            max={10}
            step={0.5}
          />
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={isLoading || session?.status === OptimizationStatus.RUNNING}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Start Optimization
          </>
        )}
      </button>

      {session?.applied && (
        <div className="mt-3 text-center text-xs text-green-400">
          ✓ Parameters applied successfully
        </div>
      )}
    </div>
  );
}

interface ParameterInputProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

function ParameterInput({ label, value, prefix, suffix, onChange, min, max, step }: ParameterInputProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs font-mono text-slate-300">
          {prefix}{value.toFixed(step < 1 ? 2 : 1)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>{prefix}{min}{suffix}</span>
        <span>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}
