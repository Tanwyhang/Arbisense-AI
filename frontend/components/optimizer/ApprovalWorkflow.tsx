/**
 * Approval Workflow
 * Handles parameter approval and displays diffs
 */
'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { OptimizationSession, ArbitrageParameters } from '@/types/optimizer';

interface Props {
  session: OptimizationSession;
  onApprove: (approve: boolean, reason?: string) => void;
}

export default function ApprovalWorkflow({ session, onApprove }: Props) {
  const [showDiff, setShowDiff] = useState(true);
  const [reason, setReason] = useState('');

  const currentParams = session.request.current_parameters;
  const proposedParams = session.final_parameters;

  if (!proposedParams) return null;

  const changes = getParameterChanges(currentParams, proposedParams);

  const handleApprove = () => {
    onApprove(true, reason || 'Parameters approved after review');
  };

  const handleReject = () => {
    onApprove(false, reason || 'Parameters rejected after review');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Review & Approve
      </h2>

      {/* Recommendation Summary */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-blue-400 mb-1">
              Agent Consensus Reached
            </div>
            <div className="text-xs text-slate-300">
              5 agents debated over {session.consensus_state?.round_number || 0} rounds and reached{' '}
              {(session.consensus_state?.convergence_score || 0 * 100).toFixed(0)}% convergence
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Diff */}
      {showDiff && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Parameter Changes
          </div>

          {changes.slice(0, 6).map((change) => (
            <div key={change.key} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800 last:border-0">
              <span className="text-slate-400">{change.key}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-500">{change.before}</span>
                <span className={change.increase ? 'text-green-400' : 'text-red-400'}>
                  {change.increase ? '↑' : '↓'}
                </span>
                <span className="font-mono text-slate-200 font-semibold">{change.after}</span>
              </div>
            </div>
          ))}

          {changes.length > 6 && (
            <button
              onClick={() => setShowDiff(false)}
              className="text-xs text-slate-500 hover:text-slate-400 w-full text-center"
            >
              Show all {changes.length} changes
            </button>
          )}
        </div>
      )}

      {/* Reason Input */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Add notes about this decision..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={session.applied}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Apply Changes
        </button>

        <button
          onClick={handleReject}
          disabled={session.applied}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>

      {/* Info */}
      {!session.applied && (
        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>
            Changes will be applied to the live bot. Review carefully before approving.
          </span>
        </div>
      )}
    </div>
  );
}

interface ParameterChange {
  key: string;
  before: string;
  after: string;
  increase: boolean;
}

function getParameterChanges(
  current: ArbitrageParameters,
  proposed: ArbitrageParameters
): ParameterChange[] {
  const changes: ParameterChange[] = [];

  const keyMap: Record<string, { suffix?: string; prefix?: string; decimals?: number }> = {
    min_spread_pct: { suffix: '%', decimals: 2 },
    min_profit_usd: { prefix: '$', decimals: 2 },
    max_risk_score: { suffix: '/10', decimals: 0 },
    max_trade_size_usd: { prefix: '$', decimals: 0 },
    gas_cost_threshold_pct: { suffix: '%', decimals: 1 },
    position_sizing_cap: { suffix: '%', decimals: 1 }
  };

  Object.keys(keyMap).forEach((key) => {
    const currentVal = (current as any)[key];
    const proposedVal = (proposed as any)[key];
    const config = keyMap[key];

    if (Math.abs(currentVal - proposedVal) > 0.001) {
      changes.push({
        key: key.replace(/_/g, ' '),
        before: `${config.prefix || ''}${currentVal.toFixed(config.decimals || 1)}${config.suffix || ''}`,
        after: `${config.prefix || ''}${proposedVal.toFixed(config.decimals || 1)}${config.suffix || ''}`,
        increase: proposedVal > currentVal
      });
    }
  });

  return changes;
}
