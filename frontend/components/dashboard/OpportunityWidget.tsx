import React from 'react';
import { SimulationResponse } from '@/types/api';

export const OpportunityWidget = ({ data }: { data: SimulationResponse }) => (
  <div className="panel-body" style={{ padding: 0 }}>
    <div style={{
      display: 'grid',
      border: 'none',
      background: 'transparent',
      padding: 0,
      gap: '1px',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'
    }}>
      {/* Trading Pair */}
      <div style={{
        padding: 'var(--space-3)',
        border: 'var(--border-thin)',
        background: 'var(--bg-layer-1)'
      }}>
        <div className="stat-label">Trading Pair</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          marginBottom: 'var(--space-1)',
          color: 'var(--ink-charcoal)'
        }}>
          {data.opportunity.pair}
        </div>
        <div className="annotation">
          {data.opportunity.dex_a} / {data.opportunity.dex_b}
        </div>
      </div>

      {/* Price Spread */}
      <div style={{
        padding: 'var(--space-3)',
        border: 'var(--border-thin)',
        background: 'var(--bg-layer-2)'
      }}>
        <div className="stat-label">Price Spread</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-data)',
          marginBottom: 'var(--space-1)',
          color: 'var(--accent-safety-yellow)'
        }}>
          {data.opportunity.spread_pct.toFixed(2)}%
        </div>
        <div className="annotation">
          Diff: ${(data.opportunity.price_b - data.opportunity.price_a).toFixed(4)}
        </div>
      </div>

      {/* Expected Return */}
      <div style={{
        padding: 'var(--space-3)',
        border: 'var(--border-thin)',
        background: data.opportunity.expected_return >= 0
          ? 'var(--success-ag-green)'
          : 'var(--alert-signal-red)',
        color: 'var(--ink-charcoal)'
      }}>
        <div className="stat-label" style={{ opacity: 0.7, color: 'inherit' }}>Return</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-data)',
          marginBottom: 'var(--space-1)'
        }}>
          {data.opportunity.expected_return.toFixed(2)}%
        </div>
        <div className="annotation" style={{ opacity: 0.8, color: 'inherit' }}>
          Win: {(data.opportunity.win_probability * 100).toFixed(0)}%
        </div>
      </div>

      {/* Liquidity */}
      <div style={{
        padding: 'var(--space-3)',
        border: 'var(--border-thin)',
        background: 'var(--bg-layer-3)'
      }}>
        <div className="stat-label">Liquidity</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-data)',
          marginBottom: 'var(--space-1)',
          color: 'var(--ink-charcoal)'
        }}>
          ${data.opportunity.liquidity.toFixed(0)}
        </div>
        <div className="annotation">
          Gas: ${data.opportunity.gas_estimate.toFixed(2)}
        </div>
      </div>
    </div>
  </div>
);
