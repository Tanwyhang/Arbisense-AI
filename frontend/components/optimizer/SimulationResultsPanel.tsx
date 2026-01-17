/**
 * Simulation Results Panel
 * Displays comparison of baseline vs proposed parameters
 */
'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Recommendation, SimulationResult, getAgentColor } from '@/types/optimizer';

interface Props {
  session: any;
}

export default function SimulationResultsPanel({ session }: Props) {
  const result: SimulationResult = session.simulation_result;

  if (!result) return null;

  const getRecommendationConfig = (rec: Recommendation) => {
    switch (rec) {
      case Recommendation.ACCEPT:
        return { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-700/50' };
      case Recommendation.REJECT:
        return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700/50' };
      case Recommendation.REVIEW:
        return { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/50' };
    }
  };

  const recConfig = getRecommendationConfig(result.recommendation);
  const RecIcon = recConfig.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Simulation Results
      </h2>

      {/* Recommendation Banner */}
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border mb-4 ${recConfig.bg} ${recConfig.border}`}
      >
        <RecIcon className={`w-5 h-5 ${recConfig.color}`} />
        <div>
          <div className={`text-sm font-semibold ${recConfig.color}`}>
            {result.recommendation}
          </div>
          <div className="text-xs text-slate-400">
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Metrics Comparison */}
      <div className="space-y-3 mb-4">
        <MetricRow
          label="Sharpe Ratio"
          before={result.baseline_metrics.sharpe_ratio}
          after={result.proposed_metrics.sharpe_ratio}
          format={(v) => v.toFixed(2)}
          improved={result.improvement_summary.sharpe_ratio_change > 0}
        />

        <MetricRow
          label="Total Return"
          before={result.baseline_metrics.total_return_pct}
          after={result.proposed_metrics.total_return_pct}
          format={(v) => `${v.toFixed(1)}%`}
          improved={result.improvement_summary.return_change > 0}
        />

        <MetricRow
          label="Max Drawdown"
          before={result.baseline_metrics.max_drawdown_pct}
          after={result.proposed_metrics.max_drawdown_pct}
          format={(v) => `${v.toFixed(1)}%`}
          improved={result.improvement_summary.drawdown_change < 0}
          inverse={true}
        />

        <MetricRow
          label="Win Rate"
          before={result.baseline_metrics.win_rate * 100}
          after={result.proposed_metrics.win_rate * 100}
          format={(v) => `${v.toFixed(0)}%`}
          improved={result.improvement_summary.win_rate_change > 0}
        />

        <MetricRow
          label="Total Profit"
          before={result.baseline_metrics.total_profit_usd}
          after={result.proposed_metrics.total_profit_usd}
          format={(v) => `$${v.toFixed(0)}`}
          improved={result.improvement_summary.profit_change_usd > 0}
        />
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
          <div className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Warnings</div>
          {result.warnings.map((warning, i) => (
            <div key={i} className="text-xs text-yellow-300">
              • {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  before: number;
  after: number;
  format: (value: number) => string;
  improved: boolean;
  inverse?: boolean;
}

function MetricRow({ label, before, after, format, improved, inverse }: MetricRowProps) {
  const change = after - before;
  const changePct = ((after - before) / Math.abs(before || 1)) * 100;

  const isPositive = inverse ? !improved : improved;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="text-sm text-slate-400">{label}</div>

      <div className="flex items-center gap-3">
        <div className="text-sm font-mono text-slate-500">{format(before)}</div>

        <div
          className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded ${
            isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
          }`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
        </div>

        <div className="text-sm font-mono text-slate-200">{format(after)}</div>
      </div>
    </div>
  );
}
