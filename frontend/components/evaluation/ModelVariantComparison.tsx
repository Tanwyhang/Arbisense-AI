'use client';

import { useState } from 'react';
import { ModelComparison } from '@/types/evaluation';

interface ModelVariantComparisonProps {
  data: ModelComparison;
}

export default function ModelVariantComparison({ data }: ModelVariantComparisonProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'sharpe' | 'return' | 'maxdd' | 'overall'>('sharpe');

  const copyTableToClipboard = () => {
    const headers = ['Variant', 'Version', 'Sharpe', 'Return %', 'Max DD %', 'Win Rate', 'Profit Factor', 'Overall Score'];
    const rows = data.variants.map(v => [
      v.variant_name,
      v.version,
      v.backtest.sharpe_ratio.toFixed(3),
      v.backtest.total_return_pct.toFixed(2),
      v.backtest.max_drawdown_pct.toFixed(2),
      (v.backtest.win_rate * 100).toFixed(1),
      v.backtest.profit_factor.toFixed(2),
      v.overall_score.toFixed(1)
    ]);

    const text = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    navigator.clipboard.writeText(text);
  };

  const exportAsCSV = () => {
    const headers = ['Variant ID', 'Variant Name', 'Version', 'Sharpe Ratio', 'Total Return %', 'Max Drawdown %', 'Win Rate', 'Profit Factor', 'Overall Score', 'Rank Sharpe', 'Rank Return', 'Rank Max DD'];
    const rows = data.variants.map(v => [
      v.variant_id,
      v.variant_name,
      v.version,
      v.backtest.sharpe_ratio.toFixed(4),
      v.backtest.total_return_pct.toFixed(2),
      v.backtest.max_drawdown_pct.toFixed(2),
      v.backtest.win_rate.toFixed(4),
      v.backtest.profit_factor.toFixed(4),
      v.overall_score.toFixed(2),
      v.rank_sharpe,
      v.rank_return,
      v.rank_max_dd
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_variants_comparison_${data.tested_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSortedVariants = () => {
    const sorted = [...data.variants];
    switch (sortBy) {
      case 'sharpe':
        return sorted.sort((a, b) => b.backtest.sharpe_ratio - a.backtest.sharpe_ratio);
      case 'return':
        return sorted.sort((a, b) => b.backtest.total_return_pct - a.backtest.total_return_pct);
      case 'maxdd':
        return sorted.sort((a, b) => a.backtest.max_drawdown_pct - b.backtest.max_drawdown_pct);
      case 'overall':
        return sorted.sort((a, b) => b.overall_score - a.overall_score);
      default:
        return sorted;
    }
  };

  const sortedVariants = getSortedVariants();
  // Winner is dynamically determined - always the #1 ranked variant in the sorted list
  const bestVariant = sortedVariants.length > 0 ? sortedVariants[0] : undefined;

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
            A/B TEST
          </div>
          <div className="annotation" style={{ margin: 0 }}>
            {data.number_of_variants} Variants • {data.test_period_days} Days
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2)'
        }}>
          <button
            onClick={copyTableToClipboard}
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
            [COPY]
          </button>
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
        </div>
      </div>

      {/* Best Variant Banner */}
      {bestVariant && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: 'var(--border-thick)',
          background: 'rgba(0, 255, 136, 0.1)',
          borderLeft: '4px solid var(--success-ag-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <div style={{
              padding: 'var(--space-1) var(--space-2)',
              border: '1px solid var(--success-ag-green)',
              background: 'var(--success-ag-green)',
              color: 'var(--ink-charcoal)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em'
            }}>
              [WINNER]
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '2px'
              }}>
                Best Variant
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-data)',
                color: 'var(--text-white)'
              }}>
                {bestVariant.variant_name} ({bestVariant.version})
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 'var(--space-4)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-data)',
            color: 'var(--text-muted)'
          }}>
            <div>
              Sharpe: <span style={{
                color: 'var(--success-ag-green)',
                fontWeight: 700
              }}>
                +{data.improvement_over_baseline.sharpe_improvement_pct.toFixed(1)}%
              </span>
            </div>
            <div>
              Return: <span style={{
                color: 'var(--success-ag-green)',
                fontWeight: 700
              }}>
                +{data.improvement_over_baseline.return_improvement_pct.toFixed(1)}%
              </span>
            </div>
            <div>
              Drawdown: <span style={{
                color: 'var(--success-ag-green)',
                fontWeight: 700
              }}>
                -{data.improvement_over_baseline.drawdown_reduction_pct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: 'var(--border-thin)',
        background: 'var(--bg-layer-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        flexWrap: 'wrap'
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)'
        }}>
          Sort by:
        </div>
        {[
          { key: 'sharpe', label: 'Sharpe Ratio' },
          { key: 'return', label: 'Return' },
          { key: 'maxdd', label: 'Max Drawdown' },
          { key: 'overall', label: 'Overall Score' }
        ].map(option => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key as typeof sortBy)}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              border: sortBy === option.key ? 'var(--border-thick)' : 'var(--border-thin)',
              background: sortBy === option.key ? 'var(--accent-financial-blue)' : 'var(--bg-layer-1)',
              color: sortBy === option.key ? 'var(--text-white)' : 'var(--text-muted)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
          >
            [{option.label}]
          </button>
        ))}
      </div>

      {/* Variants Table */}
      <div style={{
        overflowX: 'auto',
        background: 'var(--base-raw-white)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-data)'
        }}>
          <thead>
            <tr style={{
              background: 'var(--bg-layer-2)',
              borderBottom: 'var(--border-thick)'
            }}>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'left',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Rank
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'left',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Variant
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'left',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Version
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Sharpe
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Return
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Max DD
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Win Rate
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Profit Factor
              </th>
              <th style={{
                padding: 'var(--space-3)',
                textAlign: 'right',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontSize: '0.7rem'
              }}>
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedVariants.map((variant, index) => {
              const isWinner = bestVariant ? variant.variant_id === bestVariant.variant_id : false;
              const isSelected = selectedVariant === variant.variant_id;

              return (
                <tr
                  key={variant.variant_id}
                  onClick={() => setSelectedVariant(isSelected ? null : variant.variant_id)}
                  style={{
                    background: isSelected ? 'var(--bg-layer-2)' : (index % 2 === 0 ? 'var(--bg-layer-1)' : 'var(--base-raw-white)'),
                    borderBottom: 'var(--border-thin)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderLeft: isWinner ? '3px solid var(--success-ag-green)' : '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-layer-2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = index % 2 === 0 ? 'var(--bg-layer-1)' : 'var(--base-raw-white)';
                    }
                  }}
                >
                  <td style={{
                    padding: 'var(--space-3)',
                    fontWeight: 700,
                    color: isWinner ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    #{index + 1}
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    fontWeight: 600,
                    color: isWinner ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    {variant.variant_name}
                    {isWinner && (
                      <span style={{
                        marginLeft: 'var(--space-2)',
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        background: 'var(--success-ag-green)',
                        color: 'var(--ink-charcoal)',
                        fontWeight: 700
                      }}>
                        WINNER
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem'
                  }}>
                    {variant.version}
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: variant.backtest.sharpe_ratio > 1 ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    {variant.backtest.sharpe_ratio.toFixed(3)}
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: variant.backtest.total_return_pct >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
                  }}>
                    {variant.backtest.total_return_pct.toFixed(2)}%
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--alert-signal-red)'
                  }}>
                    -{variant.backtest.max_drawdown_pct.toFixed(2)}%
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: variant.backtest.win_rate > 0.5 ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    {(variant.backtest.win_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: variant.backtest.profit_factor > 1.5 ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    {variant.backtest.profit_factor.toFixed(2)}
                  </td>
                  <td style={{
                    padding: 'var(--space-3)',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: isWinner ? 'var(--success-ag-green)' : 'var(--text-white)'
                  }}>
                    {variant.overall_score.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Variant Details */}
      {selectedVariant && (
        <div style={{
          padding: 'var(--space-4)',
          borderTop: 'var(--border-thick)',
          background: 'var(--bg-layer-2)'
        }}>
          {(() => {
            const variant = data.variants.find(v => v.variant_id === selectedVariant);
            if (!variant) return null;

            return (
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 'var(--space-3)',
                  color: 'var(--text-white)'
                }}>
                  {variant.variant_name} - Hyperparameters
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--space-2)'
                }}>
                  {Object.entries(variant.hyperparameters).map(([key, value]) => (
                    <div key={key} style={{
                      padding: 'var(--space-2)',
                      border: 'var(--border-thin)',
                      background: 'var(--bg-layer-1)',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-display)',
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
