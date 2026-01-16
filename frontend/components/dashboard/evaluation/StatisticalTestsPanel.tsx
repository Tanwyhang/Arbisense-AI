'use client';

import { useState } from 'react';
import { StatisticalTestResults } from '@/types/evaluation';

interface StatisticalTestsPanelProps {
  data: StatisticalTestResults;
}

export default function StatisticalTestsPanel({ data }: StatisticalTestsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['normality', 'stationarity'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistical_tests_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const rows = [];

    // Normality tests
    rows.push(['NORMALITY TESTS']);
    rows.push(['Test', 'Statistic', 'p-value', 'Is Normal']);
    Object.entries(data.normality).forEach(([test, result]) => {
      rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), result.is_normal ? 'YES' : 'NO']);
    });
    rows.push([]);

    // Stationarity tests
    rows.push(['STATIONARITY TESTS']);
    rows.push(['Test', 'Statistic', 'p-value', 'Is Stationary']);
    Object.entries(data.stationarity).forEach(([test, result]) => {
      rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), result.is_stationary ? 'YES' : 'NO']);
    });
    rows.push([]);

    // Autocorrelation tests
    rows.push(['AUTOCORRELATION TESTS']);
    rows.push(['Test', 'Statistic', 'p-value', 'Is White Noise']);
    Object.entries(data.autocorrelation).forEach(([test, result]) => {
      let isWhiteNoise: boolean;
      if ('is_white_noise' in result) {
        isWhiteNoise = result.is_white_noise;
      } else {
        isWhiteNoise = !result.autocorrelation_present;
      }
      rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), isWhiteNoise ? 'YES' : 'NO']);
    });
    rows.push([]);

    // Heteroskedasticity tests
    rows.push(['HETEROSKEDASTICITY TESTS']);
    rows.push(['Test', 'Statistic', 'p-value', 'Is Homoskedastic']);
    Object.entries(data.heteroskedasticity).forEach(([test, result]) => {
      let isHomoskedastic: boolean;
      if ('is_homoskedastic' in result) {
        isHomoskedastic = result.is_homoskedastic;
      } else {
        isHomoskedastic = !result.arch_effects;
      }
      rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), isHomoskedastic ? 'YES' : 'NO']);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistical_tests_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    {
      id: 'normality',
      title: 'Normality Tests',
      description: 'Test if returns follow normal distribution',
      icon: '🔔',
      tests: [
        { name: 'Jarque-Bera', result: data.normality.jarque_bera },
        { name: 'Shapiro-Wilk', result: data.normality.shapiro_wilk },
        { name: 'Anderson-Darling', result: data.normality.anderson_darling }
      ]
    },
    {
      id: 'stationarity',
      title: 'Stationarity Tests',
      description: 'Test if time series is stationary (mean-reverting)',
      icon: '📊',
      tests: [
        { name: 'Augmented Dickey-Fuller', result: data.stationarity.augmented_dickey_fuller },
        { name: 'KPSS', result: data.stationarity.kpss },
        { name: 'Phillips-Perron', result: data.stationarity.phillips_perron }
      ]
    },
    {
      id: 'autocorrelation',
      title: 'Autocorrelation Tests',
      description: 'Test for serial correlation in returns',
      icon: '🔄',
      tests: [
        { name: 'Ljung-Box', result: data.autocorrelation.ljung_box },
        { name: 'Box-Pierce', result: data.autocorrelation.box_pierce },
        { name: 'Durbin-Watson', result: data.autocorrelation.durbin_watson }
      ]
    },
    {
      id: 'heteroskedasticity',
      title: 'Heteroskedasticity Tests',
      description: 'Test for changing volatility (ARCH effects)',
      icon: '📈',
      tests: [
        { name: 'Breusch-Pagan', result: data.heteroskedasticity.breusch_pagan },
        { name: 'White Test', result: data.heteroskedasticity.white_test },
        { name: 'ARCH-LM', result: data.heteroskedasticity.arch_lm }
      ]
    },
    {
      id: 'distribution',
      title: 'Distribution Fit Tests',
      description: 'Test how well returns fit theoretical distributions',
      icon: '🎯',
      tests: [
        { name: 'Kolmogorov-Smirnov', result: data.distribution_fit.kolmogorov_smirnov },
        { name: 'Cramér-von Mises', result: data.distribution_fit.cramer_von_mises },
        { name: 'Anderson-Darling', result: data.distribution_fit.anderson_darling }
      ]
    },
    {
      id: 'model-selection',
      title: 'Model Selection Criteria',
      description: 'Information criteria for model comparison',
      icon: '🔬',
      metrics: [
        { label: 'AIC', value: data.model_selection.akaike_information_criterion },
        { label: 'BIC', value: data.model_selection.bayesian_information_criterion },
        { label: 'R²', value: data.model_selection.r_squared },
        { label: 'Adjusted R²', value: data.model_selection.adjusted_r_squared },
        { label: 'Log Likelihood', value: data.model_selection.log_likelihood }
      ]
    }
  ];

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
            background: 'var(--accent-financial-blue)',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            STATISTICAL
          </div>
          <div className="annotation" style={{ margin: 0 }}>
            PhD-Level Validation • {sections.length} Test Categories
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

      {/* Legend */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        display: 'flex',
        gap: 'var(--space-4)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-data)',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: 'var(--success-ag-green)',
            border: '1px solid var(--success-ag-green)'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>p-value &lt; 0.05 (Significant)</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: 'var(--accent-amber)',
            border: '1px solid var(--accent-amber)'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>p-value 0.05-0.10 (Marginal)</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: 'var(--alert-signal-red)',
            border: '1px solid var(--alert-signal-red)'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>p-value &gt; 0.10 (Not Significant)</span>
        </div>
      </div>

      {/* Test Sections */}
      {sections.map((section) => (
        <div key={section.id} style={{
          borderBottom: section.id === 'model-selection' ? 'none' : 'var(--border-thin)'
        }}>
          <div
            onClick={() => toggleSection(section.id)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--bg-layer-1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.2s',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-layer-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-layer-1)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <span style={{ fontSize: '1rem' }}>{section.icon}</span>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-white)'
                }}>
                  {section.title}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  {section.description}
                </div>
              </div>
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              fontWeight: 300,
              transform: expandedSections.has(section.id) ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▶
            </div>
          </div>

          {expandedSections.has(section.id) && (
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--base-raw-white)',
              borderBottom: 'var(--border-thin)'
            }}>
              {section.tests ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: 'var(--space-3)'
                }}>
                  {section.tests.map((test) => (
                    <TestResultCard key={test.name} test={test.name} result={test.result} />
                  ))}
                </div>
              ) : section.metrics ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--space-3)'
                }}>
                  {section.metrics.map((metric) => (
                    <div key={metric.label} style={{
                      padding: 'var(--space-3)',
                      border: 'var(--border-thin)',
                      background: 'var(--bg-layer-1)'
                    }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-1)'
                      }}>
                        {metric.label}
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-data)',
                        color: 'var(--text-white)'
                      }}>
                        {typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface TestResultCardProps {
  test: string;
  result: any;
}

function TestResultCard({ test, result }: TestResultCardProps) {
  const getSignificanceLevel = (pValue: number) => {
    if (pValue < 0.05) return { color: 'var(--success-ag-green)', label: 'Significant' };
    if (pValue < 0.10) return { color: 'var(--accent-amber)', label: 'Marginal' };
    return { color: 'var(--alert-signal-red)', label: 'Not Significant' };
  };

  const significance = getSignificanceLevel(result.p_value);

  return (
    <div style={{
      padding: 'var(--space-3)',
      border: 'var(--border-thick)',
      background: 'var(--bg-layer-1)',
      borderLeft: `4px solid ${significance.color}`
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-2)'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-white)'
        }}>
          {test}
        </div>
        <div style={{
          padding: '4px 8px',
          border: `1px solid ${significance.color}`,
          background: `${significance.color}20`,
          color: significance.color,
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          {significance.label}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)'
      }}>
        <div>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '4px'
          }}>
            Statistic
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: 'var(--text-white)'
          }}>
            {result.statistic.toFixed(4)}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '4px'
          }}>
            p-value
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: significance.color
          }}>
            {result.p_value.toFixed(6)}
          </div>
        </div>
      </div>

      {result.is_normal !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: result.is_normal ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: result.is_normal ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {result.is_normal ? '✓ NORMAL' : '✗ NOT NORMAL'}
        </div>
      )}

      {result.is_stationary !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: result.is_stationary ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: result.is_stationary ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {result.is_stationary ? '✓ STATIONARY' : '✗ NOT STATIONARY'}
        </div>
      )}

      {result.is_white_noise !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: result.is_white_noise ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: result.is_white_noise ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {result.is_white_noise ? '✓ WHITE NOISE' : '✗ CORRELATED'}
        </div>
      )}

      {result.is_homoskedastic !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: result.is_homoskedastic ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: result.is_homoskedastic ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {result.is_homoskedastic ? '✓ HOMOSKEDASTIC' : '✗ HETEROSKEDASTIC'}
        </div>
      )}

      {result.fits !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: result.fits ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: result.fits ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {result.fits ? '✓ FITS' : '✗ DOES NOT FIT'}
        </div>
      )}

      {result.arch_effects !== undefined && (
        <div style={{
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: !result.arch_effects ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 61, 0.1)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: !result.arch_effects ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          {!result.arch_effects ? '✓ NO ARCH EFFECTS' : '✗ ARCH EFFECTS PRESENT'}
        </div>
      )}

      {result.interpretation && (
        <div style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2)',
          border: 'var(--border-thin)',
          background: 'var(--bg-layer-2)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-body)',
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }}>
          {result.interpretation}
        </div>
      )}

      {result.critical_values && (
        <div style={{
          marginTop: 'var(--space-2)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-data)',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Critical Values:</div>
          {Object.entries(result.critical_values).map(([level, value]) => (
            <div key={level} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}>
              <span>{level}:</span>
              <span style={{ fontWeight: 600 }}>{(value as number).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
