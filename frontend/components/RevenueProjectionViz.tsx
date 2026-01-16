'use client';

import { RevenueProjection } from "@/types/api";

interface RevenueProjectionVizProps {
  data: RevenueProjection;
}

export default function RevenueProjectionViz({ data }: RevenueProjectionVizProps) {
  const width = 800;
  const height = 400;
  const padding = { top: 60, right: 40, bottom: 60, left: 80 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max cumulative revenue across all scenarios
  const allCumulativeRevenues = data.scenarios.flatMap(scenario => {
    let cumulative = 0;
    return scenario.daily_revenue.map(daily => {
      cumulative += daily;
      return cumulative;
    });
  });

  const minRevenue = Math.min(...allCumulativeRevenues, 0);
  const maxRevenue = Math.max(...allCumulativeRevenues);

  const numDays = data.scenarios[0]?.daily_revenue.length || 30;

  // Scale functions
  const scaleX = (day: number) => padding.left + (day / (numDays - 1)) * chartWidth;
  const scaleY = (revenue: number) =>
    padding.top + chartHeight - ((revenue - minRevenue) / (maxRevenue - minRevenue)) * chartHeight;

  // Scenario colors - brutalist palette
  const scenarioColors: Record<string, string> = {
    "Best Case": "var(--success-ag-green)",
    "Average Case": "var(--accent-safety-yellow)",
    "Stress Case": "var(--alert-signal-red)",
    "Black Swan": "var(--ink-charcoal)"
  };

  // Generate cumulative revenue paths
  const scenarioPaths = data.scenarios.map(scenario => {
    let cumulative = 0;
    const cumulativeRevenue = scenario.daily_revenue.map(daily => {
      cumulative += daily;
      return cumulative;
    });

    const points = cumulativeRevenue.map((revenue, day) =>
      `${scaleX(day)},${scaleY(revenue)}`
    ).join(" L ");

    return {
      name: scenario.scenario_name,
      path: `M ${points}`,
      color: scenarioColors[scenario.scenario_name],
      finalRevenue: cumulative,
      maxDrawdown: scenario.max_drawdown,
      breakevenDay: scenario.breakeven_day
    };
  });

  // Grid lines
  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const revenue = minRevenue + (maxRevenue - minRevenue) * pct;
    const y = scaleY(revenue);
    return { y, label: `$${revenue.toFixed(0)}` };
  });

  // Zero line
  const zeroY = scaleY(0);

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
              30D P&L
            </div>
            <div className="annotation" style={{ margin: 0 }}>
              4 Stress Test Scenarios • Cumulative Revenue
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
          {/* Grid lines */}
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

          {/* Zero line (emphasized) */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="var(--ink-charcoal)"
            strokeWidth="2"
            strokeDasharray="8,4"
          />

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

          {/* Scenario paths */}
          {[...scenarioPaths].reverse().map((scenario, i) => (
            <path
              key={i}
              d={scenario.path}
              fill="none"
              stroke={scenario.color}
              strokeWidth="3"
              opacity="0.8"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          ))}

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
        </svg>
      </div>

      {/* Performance Metrics */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        borderLeft: 'var(--border-thick)',
        borderRight: 'var(--border-thick)'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          marginBottom: 'var(--space-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          30-Day Projection Summary
        </div>

        {/* Scenario outcomes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          marginBottom: 'var(--space-4)',
          border: 'var(--border-thin)'
        }}>
          {scenarioPaths.map(scenario => (
            <div
              key={scenario.name}
              style={{
                padding: 'var(--space-3)',
                borderRight: 'var(--border-thin)',
                background: 'var(--base-raw-white)',
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 'var(--space-1)',
                color: '#b8bfc7'
              }}>
                {scenario.name}
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-data)',
                color: scenario.finalRevenue >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
                lineHeight: 1
              }}>
                {scenario.finalRevenue >= 0 ? '+' : ''}${scenario.finalRevenue.toFixed(0)}
              </div>
            </div>
          ))}
        </div>

        {/* Expected value */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3)',
          border: 'var(--border-thick)',
          background: 'var(--base-raw-white)'
        }}>
          <div className="number-indicator" style={{
            background: 'var(--accent-safety-yellow)',
            color: 'var(--ink-charcoal)'
          }}>
            EV
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: '4px'
            }}>
              Expected Value
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'var(--font-data)',
              color: data.expected_value >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
              lineHeight: 1
            }}>
              {data.expected_value >= 0 ? '+' : ''}${data.expected_value.toFixed(0)}
            </div>
          </div>
          <div style={{
            textAlign: 'right',
            fontFamily: 'var(--font-data)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ marginBottom: '4px' }}>Downside Risk:</div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--alert-signal-red)'
            }}>
              {data.downside_risk_pct.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 0,
        border: 'var(--border-thin)',
        borderTop: 'none'
      }}>
        {data.scenarios.map((scenario, index) => (
          <div
            key={scenario.scenario_name}
            style={{
              padding: 'var(--space-4)',
              borderRight: index % 2 === 0 ? 'var(--border-thin)' : 'none',
              borderBottom: 'var(--border-thin)',
              background: `var(--bg-layer-${(index % 3) + 1})`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)'
            }}
          >
            {/* Color indicator */}
            <div style={{
              width: '16px',
              height: '16px',
              background: scenarioColors[scenario.scenario_name],
              border: '2px solid var(--ink-charcoal)',
              flexShrink: 0
            }} />

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-1)',
                color: 'var(--ink-charcoal)'
              }}>
                {scenario.scenario_name}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontFamily: 'var(--font-data)',
                color: 'var(--text-muted)',
                lineHeight: 1.4
              }}>
                {scenario.breakeven_day
                  ? `Breakeven: Day ${scenario.breakeven_day}`
                  : 'No Breakeven'}
                {scenario.max_drawdown < 0 && (
                  <span> • Max DD: <span style={{
                    color: 'var(--alert-signal-red)',
                    fontWeight: 600
                  }}>${scenario.max_drawdown.toFixed(0)}</span></span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
