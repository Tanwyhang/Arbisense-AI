import React from 'react';
import { SimulationResponse } from '@/types/api';

export const PipelinePerfWidget = ({ data }: { data: SimulationResponse }) => (
  <div style={{
    padding: 'var(--space-4)',
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-3)'
    }}>
      <div>
        <div className="stat-label">Total Time</div>
        <div className="stat-value" style={{
          fontSize: '1.5rem',
          color: data.total_computation_time_ms < 1100
            ? 'var(--success-ag-green)'
            : 'var(--accent-safety-yellow)'
        }}>
          {data.total_computation_time_ms.toFixed(0)}ms
        </div>
      </div>

      <div>
        <div className="stat-label">Status</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: data.total_computation_time_ms < 1100
            ? 'var(--success-ag-green)'
            : 'var(--alert-signal-red)'
        }}>
          {data.total_computation_time_ms < 1100 ? 'PASS' : 'WARN'}
        </div>
      </div>

      <div>
        <div className="stat-label">Efficiency</div>
        <div className="stat-value" style={{
          fontSize: '1.5rem',
          color: 'var(--ink-charcoal)'
        }}>
          {Math.min(100, (1100 / Math.max(1, data.total_computation_time_ms)) * 100).toFixed(0)}%
        </div>
      </div>
    </div>

    <div className="divider"></div>

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '0.65rem',
      fontFamily: 'var(--font-data)',
      color: 'var(--text-muted)',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span>MC: {data.monte_carlo.computation_time_ms.toFixed(0)}</span>
        <span>•</span>
        <span>Agents: {data.consensus.computation_time_ms.toFixed(0)}</span>
        <span>•</span>
        <span>Kelly: {data.kelly.computation_time_ms.toFixed(0)}</span>
      </div>
      {data.performance_warning && (
        <span style={{ color: 'var(--accent-amber)' }}>⚠️ SLO BREACH</span>
      )}
    </div>
  </div>
);
