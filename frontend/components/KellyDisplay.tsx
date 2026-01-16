import { KellyResult } from "@/types/api";

interface KellyDisplayProps {
  data: KellyResult;
}

export default function KellyDisplay({ data }: KellyDisplayProps) {
  return (
    <div style={{
      border: 'var(--border-thick)',
      borderTop: 'none',
      background: 'var(--base-raw-white)'
    }}>
      {/* Main Recommendation - Stamp Style */}
      <div style={{
        padding: 'var(--space-6)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Recommended Position Size
          </div>

          <div style={{
            padding: 'var(--space-4) var(--space-8)',
            border: 'var(--border-heaviest)',
            background: 'var(--accent-safety-yellow)',
            display: 'inline-block',
            transform: 'rotate(-2deg)',
            boxShadow: '6px 6px 0 rgba(0,0,0,0.3)',
            marginBottom: 'var(--space-2)'
          }}>
            <div style={{
              fontSize: 'clamp(3rem, 8vw, 5rem)',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              color: 'var(--ink-charcoal)',
              lineHeight: 1,
              letterSpacing: '0.05em'
            }}>
              {data.recommended_position_pct.toFixed(2)}%
            </div>
          </div>

          <div className="annotation" style={{ marginTop: 'var(--space-2)' }}>
            of portfolio
          </div>

          {data.safety_capped && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <span style={{
                padding: 'var(--space-1) var(--space-3)',
                border: 'var(--border-thick)',
                background: 'var(--alert-signal-red)',
                color: 'var(--base-raw-white)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transform: 'rotate(1deg)',
                display: 'inline-block',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.2)'
              }}>
                ⚠ CAPPED AT 5% SAFETY LIMIT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kelly Breakdown - Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        border: 'var(--border-thin)',
        borderTop: 'none'
      }}>
        {/* Raw Kelly Fraction */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-1)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Raw Kelly Fraction
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--ink-charcoal)',
            lineHeight: 1
          }}>
            {(data.kelly_fraction * 100).toFixed(2)}%
          </div>
        </div>

        {/* Correlation Adjusted */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-2)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Correlation Adjusted
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--success-ag-green)',
            lineHeight: 1
          }}>
            {(data.adjusted_fraction * 100).toFixed(2)}%
          </div>
        </div>

        {/* Correlation Factor */}
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-3)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Correlation Factor (γ)
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--accent-safety-yellow)',
            lineHeight: 1
          }}>
            {data.correlation_factor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Visual Bar - Industrial Style */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-1)'
      }}>
        <div className="annotation" style={{ marginBottom: 'var(--space-3)' }}>
          Position Size Visualization
        </div>

        <div style={{
          width: '100%',
          height: '64px',
          background: 'var(--base-raw-white)',
          border: 'var(--border-thick)',
          position: 'relative',
          display: 'flex'
        }}>
          {/* Grid lines overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, var(--grid-line) 0px, var(--grid-line) 1px, transparent 1px, transparent 20px)',
            pointerEvents: 'none',
            opacity: 0.5
          }} />

          {/* Filled portion */}
          <div style={{
            width: `${Math.min(data.recommended_position_pct, 100)}%`,
            height: '100%',
            background: 'var(--accent-safety-yellow)',
            borderRight: 'var(--border-thick)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-charcoal)',
            fontWeight: 700,
            fontSize: '1rem',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.1em',
            position: 'relative',
            zIndex: 1
          }}>
            {data.recommended_position_pct.toFixed(1)}%
          </div>

          {/* 5% safety line */}
          <div style={{
            position: 'absolute',
            left: '5%',
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'var(--alert-signal-red)',
            zIndex: 10
          }} />
          <div style={{
            position: 'absolute',
            left: '5%',
            top: '-24px',
            fontSize: '0.7rem',
            color: 'var(--alert-signal-red)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.1em',
            transform: 'translateX(-50%)',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: 'var(--base-raw-white)',
            padding: '2px 6px',
            border: 'var(--border-thin)'
          }}>
            5% CAP
          </div>
        </div>

        {/* Scale markers */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--space-2)',
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Formula Explanation */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        borderLeft: 'var(--border-thick)',
        borderRight: 'var(--border-thick)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-3)'
        }}>
          <div className="number-indicator" style={{
            background: 'var(--accent-safety-yellow)',
            color: 'var(--ink-charcoal)',
            flexShrink: 0
          }}>
            f
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 700,
              marginBottom: 'var(--space-2)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '0.875rem'
            }}>
              Kelly Formula
            </div>
            <div style={{
              fontFamily: 'var(--font-data)',
              color: 'var(--ink-charcoal)',
              marginBottom: 'var(--space-2)',
              fontSize: '1.25rem',
              fontWeight: 600,
              background: 'var(--base-raw-white)',
              padding: 'var(--space-2)',
              border: 'var(--border-thin)'
            }}>
              f* = (p × b - q) / b
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5
            }}>
              Adjusted for correlation: <span style={{ fontFamily: 'var(--font-data)', fontWeight: 600 }}>f_adj = f* / (1 + γ)</span> • Capped at 5% for safety
            </div>
          </div>
        </div>
      </div>

      {/* Correlation Warning */}
      {data.correlation_factor > 0.2 && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--accent-safety-yellow)',
          border: 'var(--border-thick)',
          borderTop: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <span style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--ink-charcoal)'
          }}>
            ⚠
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '4px',
              color: 'var(--ink-charcoal)'
            }}>
              Correlation Adjustment Applied
            </div>
            <div style={{
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--ink-charcoal)'
            }}>
              Position size reduced by {((data.correlation_factor / (1 + data.correlation_factor)) * 100).toFixed(0)}% due to opportunity correlation (γ={data.correlation_factor})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
