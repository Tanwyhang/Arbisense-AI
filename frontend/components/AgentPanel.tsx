'use client';

import { ConsensusResult } from "@/types/api";

interface AgentPanelProps {
  data: ConsensusResult;
}

export default function AgentPanel({ data }: AgentPanelProps) {
  return (
    <div style={{
      border: '1px solid var(--border-dim)',
      borderTop: 'none',
      background: 'var(--terminal-panel-blue)'
    }}>
      {/* Consensus Banner - Terminal Style */}
      <div style={{
        padding: 'var(--space-3)',
        borderBottom: '1px solid var(--border-dim)',
        background: data.consensus === "APPROVE"
          ? 'rgba(0, 255, 136, 0.1)'
          : 'rgba(255, 61, 61, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        borderLeft: `4px solid ${data.consensus === "APPROVE" ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`
      }}>
        {/* Terminal-style Status Header */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          {/* Status Badge */}
          <div style={{
            padding: 'var(--space-1) var(--space-3)',
            border: `1px solid ${data.consensus === "APPROVE" ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`,
            background: 'transparent',
            color: data.consensus === "APPROVE"
              ? 'var(--success-ag-green)'
              : 'var(--alert-signal-red)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            minWidth: '100px',
            textAlign: 'center'
          }}>
            {data.consensus === "APPROVE" ? '[OK]' : '[NO]'}
          </div>

          <div style={{
            flex: 1
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--text-white)',
              marginBottom: '2px',
              letterSpacing: '0.05em'
            }}>
              {data.consensus === "APPROVE" ? 'CONSENSUS: APPROVE' : 'CONSENSUS: REJECT'}
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-muted)'
            }}>
              Confidence: {data.confidence_score.toFixed(0)}% • {data.verdicts.filter(v => v.verdict === "APPROVE").length}/{data.verdicts.length} agents
            </div>
          </div>
        </div>

        {/* Computation Time Badge */}
        <div style={{
          padding: '4px 12px',
          border: '1px solid var(--accent-financial-blue)',
          background: 'rgba(0, 102, 255, 0.2)',
          color: '#4da6ff',
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}>
          {data.computation_time_ms.toFixed(0)}ms
        </div>
      </div>

      {/* Individual Agent Verdicts - Terminal Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        border: '1px solid var(--border-dim)',
        borderTop: 'none'
      }}>
        {data.verdicts.map((verdict, index) => (
          <div
            key={verdict.agent_name}
            style={{
              padding: 'var(--space-3)',
              borderRight: index < 2 ? '1px solid var(--border-dim)' : 'none',
              borderBottom: '1px solid var(--border-dim)',
              position: 'relative',
              background: `var(--bg-layer-${(index % 3) + 1})`,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-data)'
            }}
          >
            {/* Agent Header Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
              paddingBottom: 'var(--space-1)',
              borderBottom: '1px dashed var(--border-dim)'
            }}>
              <div style={{
                color: 'var(--accent-cyan)',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.05em'
              }}>
                AGENT_{String(index + 1).padStart(2, '0')}
              </div>
              <div style={{
                color: '#b8bfc7',
                fontSize: '0.7rem',
                textTransform: 'uppercase'
              }}>
                {verdict.agent_name.replace('Agent', '')}
              </div>
            </div>

            {/* Verdict Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
              padding: '4px 8px',
              background: verdict.verdict === "APPROVE"
                ? 'rgba(0, 255, 136, 0.15)'
                : 'rgba(255, 61, 61, 0.15)',
              borderLeft: `2px solid ${verdict.verdict === "APPROVE" ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`
            }}>
              <span style={{ color: '#b8bfc7', fontSize: '0.7rem' }}>STATUS:</span>
              <span style={{
                color: verdict.verdict === "APPROVE" ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.1em'
              }}>
                {verdict.verdict === "APPROVE" ? '✓ APPROVE' : '✗ REJECT'}
              </span>
            </div>

            {/* Metric Row */}
            <div style={{
              marginBottom: 'var(--space-2)'
            }}>
              <div style={{ color: '#b8bfc7', fontSize: '0.7rem', marginBottom: '2px' }}>
                METRIC_VALUE:
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: verdict.verdict === "APPROVE"
                  ? 'var(--success-ag-green)'
                  : 'var(--alert-signal-red)',
                lineHeight: 1
              }}>
                {(verdict.metric_value * 100).toFixed(2)}%
              </div>
            </div>

            {/* Threshold Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
              padding: '4px 0',
              fontSize: '0.7rem'
            }}>
              <span style={{ color: '#b8bfc7' }}>THRESHOLD:</span>
              <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>
                {(verdict.threshold * 100).toFixed(2)}%
              </span>
            </div>

            {/* Rationale - Terminal Box */}
            <div style={{
              padding: 'var(--space-2)',
              border: '1px solid var(--border-dim)',
              background: 'rgba(0, 0, 0, 0.3)',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              color: 'var(--text-white)',
              minHeight: '60px',
              fontStyle: 'italic'
            }}>
              &gt; {verdict.rationale}
            </div>
          </div>
        ))}
      </div>

      {/* Consensus Protocol Info - Terminal Footer */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        border: '1px solid var(--border-dim)',
        borderTop: 'none',
        background: 'var(--bg-layer-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontSize: '0.7rem',
        fontFamily: 'var(--font-data)'
      }}>
        <div style={{
          padding: '2px 6px',
          border: '1px solid var(--accent-financial-blue)',
          background: 'rgba(0, 102, 255, 0.1)',
          color: 'var(--accent-financial-blue)',
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}>
          INFO
        </div>

        <div style={{
          flex: 1,
          color: 'var(--text-muted)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center'
        }}>
          <span>PROTOCOL: 2/3 CONSENSUS REQUIRED</span>
          <span style={{ color: 'var(--grid-line)' }}>│</span>
          <span>QUANTITATIVE THRESHOLD EVALUATION</span>
          <span style={{ color: 'var(--grid-line)' }}>│</span>
          <span style={{ color: 'var(--accent-cyan)' }}>v1.0.4</span>
        </div>
      </div>
    </div>
  );
}
