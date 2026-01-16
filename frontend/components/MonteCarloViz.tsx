import { MonteCarloResult } from "@/types/api";

interface MonteCarloVizProps {
  data: MonteCarloResult;
}

export default function MonteCarloViz({ data }: MonteCarloVizProps) {
  const width = 800;
  const height = 400;
  const padding = { top: 60, right: 40, bottom: 60, left: 80 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max values across all paths
  const allValues = data.paths.flatMap(p => p.values);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  const numSteps = data.paths[0]?.values.length || 30;

  // Scale functions
  const scaleX = (step: number) => padding.left + (step / (numSteps - 1)) * chartWidth;
  const scaleY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  // Generate path strings with sharp joins
  const pathStrings = data.paths.map(path => {
    const points = path.values.map((value, step) =>
      `${scaleX(step)},${scaleY(value)}`
    ).join(" L ");
    return `M ${points}`;
  });

  // Grid lines
  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const value = minValue + (maxValue - minValue) * pct;
    const y = scaleY(value);
    return { y, label: `$${value.toFixed(0)}` };
  });

  return (
    <div style={{
      border: 'var(--border-thick)',
      borderTop: 'none',
      background: 'var(--base-raw-white)'
    }}>
      {/* Chart Container */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <div style={{
              padding: 'var(--space-1) var(--space-3)',
              border: 'var(--border-thick)',
              background: 'var(--ink-charcoal)',
              color: 'var(--base-raw-white)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transform: 'rotate(-2deg)'
            }}>
              {data.paths.length} PATHS
            </div>
            <div className="annotation" style={{ margin: 0 }}>
              Lévy α=1.7 • Non-Uniform Sampling
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            {data.computation_time_ms.toFixed(0)}ms
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{
          background: 'var(--base-raw-white)',
          border: 'var(--border-thick)',
          width: '100%',
          height: 'auto'
        }}>
          {/* Background Grid */}
          {yGridLines.map((line, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke="var(--grid-line)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={line.y + 4}
                textAnchor="end"
                fill="var(--ink-charcoal)"
                fontSize="11"
                fontFamily="var(--font-data)"
                fontWeight="500"
              >
                {line.label}
              </text>
            </g>
          ))}

          {/* Vertical grid lines */}
          {[0, 10, 20, 30].map(day => (
            <line
              key={day}
              x1={scaleX(day)}
              y1={padding.top}
              x2={scaleX(day)}
              y2={height - padding.bottom}
              stroke="var(--grid-line)"
              strokeWidth="1"
              strokeDasharray="none"
            />
          ))}

          {/* X-axis labels */}
          {[0, 10, 20, 30].map(day => (
            <text
              key={day}
              x={scaleX(day)}
              y={height - padding.bottom + 25}
              textAnchor="middle"
              fill="var(--ink-charcoal)"
              fontSize="11"
              fontFamily="var(--font-data)"
              fontWeight="500"
            >
              Day {day}
            </text>
          ))}

          {/* Monte Carlo paths */}
          {pathStrings.map((pathString, i) => {
            const path = data.paths[i];
            const isLevy = path.is_levy;
            return (
              <path
                key={i}
                d={pathString}
                fill="none"
                stroke={isLevy ? "var(--alert-signal-red)" : "var(--ink-charcoal)"}
                strokeWidth={isLevy ? "2.5" : "1"}
                opacity={isLevy ? "0.7" : "0.25"}
                strokeLinejoin="miter"
                strokeLinecap="square"
              />
            );
          })}

          {/* Axes */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="var(--ink-charcoal)"
            strokeWidth="2"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="var(--ink-charcoal)"
            strokeWidth="2"
          />

          {/* Legend */}
          <g transform={`translate(${width - padding.right - 200}, ${padding.top - 30})`}>
            {/* Lévy legend */}
            <rect x="0" y="-6" width="12" height="12" fill="var(--alert-signal-red)" opacity="0.7" />
            <text x="18" y="4" fill="var(--ink-charcoal)" fontSize="11" fontFamily="var(--font-data)" fontWeight="500">
              Lévy Flights (40%)
            </text>

            {/* Normal legend */}
            <rect x="0" y="14" width="12" height="12" fill="var(--ink-charcoal)" opacity="0.25" />
            <text x="18" y="24" fill="var(--ink-charcoal)" fontSize="11" fontFamily="var(--font-data)" fontWeight="500">
              Normal (60%)
            </text>
          </g>
        </svg>
      </div>

      {/* Statistics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        border: 'var(--border-thin)',
        borderTop: 'none'
      }}>
        {/* Mean Return */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-1)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Mean Return
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: data.mean_return >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
            lineHeight: 1
          }}>
            {(data.mean_return * 100).toFixed(2)}%
          </div>
        </div>

        {/* Volatility */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-2)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Volatility (σ)
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--ink-charcoal)',
            lineHeight: 1
          }}>
            {(data.std_dev * 100).toFixed(2)}%
          </div>
        </div>

        {/* CVaR */}
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-3)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            CVaR (95%)
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--accent-safety-yellow)',
            lineHeight: 1
          }}>
            {(data.cvar_95 * 100).toFixed(2)}%
          </div>
        </div>

        {/* Skewness */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-2)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Skewness
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--ink-charcoal)',
            lineHeight: 1
          }}>
            {data.skewness.toFixed(3)}
          </div>
        </div>

        {/* Kurtosis */}
        <div style={{
          padding: 'var(--space-4)',
          borderRight: 'var(--border-thin)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-3)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            Kurtosis
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--ink-charcoal)',
            lineHeight: 1
          }}>
            {data.kurtosis.toFixed(3)}
          </div>
        </div>

        {/* VaR */}
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: 'var(--border-thin)',
          background: 'var(--bg-layer-1)'
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>
            VaR (95%)
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--ink-charcoal)',
            lineHeight: 1
          }}>
            {(data.var_95 * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Fat tail indicator */}
      {data.kurtosis > 3 && (
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
              Fat Tails Detected
            </div>
            <div style={{
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--ink-charcoal)'
            }}>
              Kurtosis of {data.kurtosis.toFixed(2)} indicates {((data.kurtosis - 3) * 10).toFixed(0)}% higher tail risk than normal distribution
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
