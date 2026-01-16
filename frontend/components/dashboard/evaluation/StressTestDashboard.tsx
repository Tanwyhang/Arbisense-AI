'use client';

import { useState } from 'react';
import { StressTestSuite } from '@/types/evaluation';

interface StressTestDashboardProps {
  data: StressTestSuite;
}

export default function StressTestDashboard({ data }: StressTestDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const toggleScenario = (scenarioId: string) => {
    const newExpanded = new Set(expandedScenarios);
    if (newExpanded.has(scenarioId)) {
      newExpanded.delete(scenarioId);
    } else {
      newExpanded.add(scenarioId);
    }
    setExpandedScenarios(newExpanded);
  };

  const categories = [
    { key: 'all', label: 'All Scenarios', scenarios: data.stress_scenarios },
    { key: 'historical', label: 'Historical Crashes', scenarios: data.categories.historical_crashes },
    { key: 'synthetic', label: 'Synthetic Extreme', scenarios: data.categories.synthetic_extreme },
    { key: 'regime', label: 'Regime Changes', scenarios: data.categories.regime_changes },
    { key: 'black_swan', label: 'Black Swan Events', scenarios: data.categories.black_swan },
    { key: 'liquidity', label: 'Liquidity Crisis', scenarios: data.categories.liquidity_crisis },
    { key: 'gas', label: 'Gas Spirals', scenarios: data.categories.gas_spiral },
  ];

  const displayedScenarios = selectedCategory
    ? categories.find(c => c.key === selectedCategory)?.scenarios || []
    : data.stress_scenarios;

  const exportAsJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress_tests_${data.test_date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = [
      'Scenario ID',
      'Scenario Name',
      'Type',
      'Total Return %',
      'Max Drawdown %',
      'Sharpe Ratio',
      'Win Rate',
      'Survives',
      'Recovery Time (days)',
      'Worst Trade'
    ];

    const rows = data.stress_scenarios.map(s => [
      s.scenario_id,
      s.scenario_name,
      s.scenario_type,
      s.results.total_return.toFixed(2),
      s.results.max_drawdown.toFixed(2),
      s.results.sharpe_ratio.toFixed(3),
      s.results.win_rate.toFixed(3),
      s.results.survives_scenario ? 'YES' : 'NO',
      s.results.recovery_time_days.toString(),
      s.results.worst_single_trade.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress_tests_${data.test_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      border: 'var(--border-thick)',
      background: 'var(--base-raw-white)'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <div style={{
            padding: 'var(--space-1) var(--space-3)',
            border: 'var(--border-thick)',
            background: 'var(--alert-signal-red)',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            STRESS TEST
          </div>
          <div className="annotation" style={{ margin: 0 }}>
            {data.stress_scenarios.length} Scenarios • {data.test_date}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2)'
        }}>
          <button
            onClick={exportAsCSV}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              border: 'var(--border-thin)',
              background: 'var(--bg-layer-2)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            [CSV]
          </button>
          <button
            onClick={exportAsJSON}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              border: 'var(--border-thin)',
              background: 'var(--bg-layer-2)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            [JSON]
          </button>
        </div>
      </div>

      {/* Aggregate Metrics */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-3)'
      }}>
        <MetricBox
          label="Worst Case Return"
          value={`${data.aggregate_metrics.worst_case_return.toFixed(1)}%`}
          negative={true}
        />
        <MetricBox
          label="Worst Case Drawdown"
          value={`${data.aggregate_metrics.worst_case_drawdown.toFixed(1)}%`}
          negative={true}
        />
        <MetricBox
          label="Avg Drawdown"
          value={`${data.aggregate_metrics.average_drawdown_scenarios.toFixed(1)}%`}
          negative={true}
        />
        <MetricBox
          label="Survival Rate"
          value={`${(data.aggregate_metrics.scenario_survival_rate * 100).toFixed(0)}%`}
          negative={false}
        />
        <MetricBox
          label="Tail Risk Exposure"
          value={`${(data.aggregate_metrics.tail_risk_exposure * 100).toFixed(1)}%`}
          negative={true}
        />
      </div>

      {/* Category Filter */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: 'var(--border-thin)',
        background: 'var(--bg-layer-1)',
        display: 'flex',
        gap: 'var(--space-2)',
        flexWrap: 'wrap'
      }}>
        {categories.map(category => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(selectedCategory === category.key ? null : category.key)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              border: selectedCategory === category.key ? 'var(--border-thick)' : 'var(--border-thin)',
              background: selectedCategory === category.key ? 'var(--accent-financial-blue)' : 'var(--bg-layer-2)',
              color: selectedCategory === category.key ? 'var(--text-white)' : 'var(--text-muted)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
          >
            [{category.label}] ({category.scenarios.length})
          </button>
        ))}
      </div>

      {/* Scenarios List */}
      <div style={{
        maxHeight: '800px',
        overflowY: 'auto'
      }}>
        {displayedScenarios.map((scenario, index) => (
          <div key={scenario.scenario_id} style={{
            borderBottom: index === displayedScenarios.length - 1 ? 'none' : 'var(--border-thin)'
          }}>
            {/* Scenario Header */}
            <div
              onClick={() => toggleScenario(scenario.scenario_id)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: expandedScenarios.has(scenario.scenario_id) ? 'var(--bg-layer-2)' : 'var(--bg-layer-1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.2s',
                borderLeft: scenario.results.survives_scenario
                  ? '3px solid var(--success-ag-green)'
                  : '3px solid var(--alert-signal-red)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-layer-2)';
              }}
              onMouseLeave={(e) => {
                if (!expandedScenarios.has(scenario.scenario_id)) {
                  e.currentTarget.style.background = 'var(--bg-layer-1)';
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                flex: 1
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  transform: expandedScenarios.has(scenario.scenario_id) ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: 'var(--text-muted)'
                }}>
                  ▶
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-white)'
                    }}>
                      {scenario.scenario_name}
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      border: '1px solid',
                      background: scenario.results.survives_scenario
                        ? 'rgba(0, 255, 136, 0.2)'
                        : 'rgba(255, 61, 61, 0.2)',
                      borderColor: scenario.results.survives_scenario
                        ? 'var(--success-ag-green)'
                        : 'var(--alert-signal-red)',
                      color: scenario.results.survives_scenario
                        ? 'var(--success-ag-green)'
                        : 'var(--alert-signal-red)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em'
                    }}>
                      {scenario.results.survives_scenario ? '[SURVIVES]' : '[FAILS]'}
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      border: 'var(--border-thin)',
                      background: 'var(--bg-layer-1)',
                      color: 'var(--text-muted)',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {scenario.scenario_type}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-muted)'
                  }}>
                    {scenario.description}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--space-4)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-data)',
                fontWeight: 600
              }}>
                <div style={{
                  color: scenario.results.total_return >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
                }}>
                  {scenario.results.total_return >= 0 ? '+' : ''}{scenario.results.total_return.toFixed(1)}%
                </div>
                <div style={{ color: 'var(--alert-signal-red)' }}>
                  -{scenario.results.max_drawdown.toFixed(1)}%
                </div>
                <div style={{
                  color: scenario.results.sharpe_ratio > 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
                }}>
                  {scenario.results.sharpe_ratio.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedScenarios.has(scenario.scenario_id) && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'var(--base-raw-white)',
                borderTop: 'var(--border-thin)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--space-4)'
              }}>
                {/* Parameters */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-muted)'
                  }}>
                    Parameters
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                  }}>
                    {Object.entries(scenario.parameters).map(([key, value]) => (
                      <div key={key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2)',
                        border: 'var(--border-thin)',
                        background: 'var(--bg-layer-1)'
                      }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)'
                        }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-white)',
                          fontFamily: 'var(--font-data)'
                        }}>
                          {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : value.toString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Results */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-muted)'
                  }}>
                    Results
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                  }}>
                    {[
                      { label: 'Total Return', value: `${scenario.results.total_return.toFixed(2)}%`, color: scenario.results.total_return >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)' },
                      { label: 'Max Drawdown', value: `${scenario.results.max_drawdown.toFixed(2)}%`, color: 'var(--alert-signal-red)' },
                      { label: 'Sharpe Ratio', value: scenario.results.sharpe_ratio.toFixed(3), color: scenario.results.sharpe_ratio > 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)' },
                      { label: 'Win Rate', value: `${(scenario.results.win_rate * 100).toFixed(1)}%`, color: scenario.results.win_rate > 0.5 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)' },
                      { label: 'Recovery Time', value: `${scenario.results.recovery_time_days} days`, color: 'var(--text-white)' },
                      { label: 'Worst Trade', value: `$${scenario.results.worst_single_trade.toFixed(0)}`, color: 'var(--alert-signal-red)' },
                    ].map(metric => (
                      <div key={metric.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2)',
                        border: 'var(--border-thin)',
                        background: 'var(--bg-layer-1)'
                      }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)'
                        }}>
                          {metric.label}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: metric.color,
                          fontFamily: 'var(--font-data)'
                        }}>
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Behavior */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-muted)'
                  }}>
                    Model Behavior
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                  }}>
                    {[
                      { label: 'Agent Consensus', value: `${(scenario.model_behavior.agent_consensus_rate * 100).toFixed(0)}%` },
                      { label: 'Kelly Avg Position', value: `${(scenario.model_behavior.kelly_avg_position * 100).toFixed(1)}%` },
                      { label: 'MC Convergence', value: `${(scenario.model_behavior.monte_carlo_convergence * 100).toFixed(0)}%` },
                      { label: 'CI Width', value: `$${scenario.model_behavior.confidence_intervals.width.toFixed(0)}` },
                    ].map(metric => (
                      <div key={metric.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2)',
                        border: 'var(--border-thin)',
                        background: 'var(--bg-layer-1)'
                      }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)'
                        }}>
                          {metric.label}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-white)',
                          fontFamily: 'var(--font-data)'
                        }}>
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: string;
  negative: boolean;
}

function MetricBox({ label, value, negative }: MetricBoxProps) {
  return (
    <div style={{
      padding: 'var(--space-3)',
      border: 'var(--border-thin)',
      background: 'var(--base-raw-white)'
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-1)'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        fontFamily: 'var(--font-data)',
        color: negative ? 'var(--alert-signal-red)' : 'var(--success-ag-green)',
        lineHeight: 1
      }}>
        {value}
      </div>
    </div>
  );
}
