'use client';

import { useState } from 'react';
import { BacktestSummary as BacktestSummaryType } from '@/types/evaluation';

interface BacktestSummaryProps {
  data: BacktestSummaryType;
}

export default function BacktestSummary({ data }: BacktestSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['period', 'returns', 'risk-adjusted', 'trade-metrics'])
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

  const copyToClipboard = () => {
    const text = formatBacktestAsText(data);
    navigator.clipboard.writeText(text);
  };

  const exportAsCSV = () => {
    const csv = formatBacktestAsCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_summary_${data.start_date}_${data.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_summary_${data.start_date}_${data.end_date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections: {
    id: string;
    title: string;
    icon: string;
    metrics: {
      label: string;
      value: any;
      format: 'string' | 'number' | 'percentage' | 'currency';
      highlight?: boolean;
    }[];
  }[] = [
    {
      id: 'period',
      title: 'PERIOD & TRADES',
      icon: '📅',
      metrics: [
        { label: 'Start Date', value: data.start_date, format: 'string' },
        { label: 'End Date', value: data.end_date, format: 'string' },
        { label: 'Duration', value: `${data.duration_days} days`, format: 'string' },
        { label: 'Total Trades', value: data.total_trades, format: 'number' },
        { label: 'Winning Trades', value: data.winning_trades, format: 'number' },
        { label: 'Losing Trades', value: data.losing_trades, format: 'number' },
        { label: 'Breakeven Trades', value: data.breakeven_trades, format: 'number' },
      ]
    },
    {
      id: 'returns',
      title: 'RETURNS',
      icon: '📈',
      metrics: [
        { label: 'Total Return', value: data.total_return, format: 'currency' },
        { label: 'Total Return %', value: data.total_return_pct, format: 'percentage' },
        { label: 'CAGR', value: data.cagr, format: 'percentage' },
        { label: 'Daily Return Avg', value: data.daily_return_avg, format: 'percentage' },
        { label: 'Daily Return Std', value: data.daily_return_std, format: 'percentage' },
      ]
    },
    {
      id: 'risk',
      title: 'RISK METRICS',
      icon: '⚠️',
      metrics: [
        { label: 'Max Drawdown', value: data.max_drawdown, format: 'currency' },
        { label: 'Max Drawdown %', value: data.max_drawdown_pct, format: 'percentage' },
        { label: 'Max DD Duration', value: `${data.max_drawdown_duration} days`, format: 'string' },
        { label: 'Max DD Recovery', value: `${data.max_drawdown_recovery} days`, format: 'string' },
        { label: 'Annualized Volatility', value: data.volatility_annualized, format: 'percentage' },
        { label: 'Downside Deviation', value: data.downside_deviation, format: 'percentage' },
      ]
    },
    {
      id: 'risk-adjusted',
      title: 'RISK-ADJUSTED RETURNS',
      icon: '🎯',
      metrics: [
        { label: 'Sharpe Ratio', value: data.sharpe_ratio, format: 'number', highlight: data.sharpe_ratio > 1 },
        { label: 'Sharpe Ratio (1Y)', value: data.sharpe_ratio_1y, format: 'number' },
        { label: 'Sharpe Ratio (3Y)', value: data.sharpe_ratio_3y, format: 'number' },
        { label: 'Sortino Ratio', value: data.sortino_ratio, format: 'number', highlight: data.sortino_ratio > 1 },
        { label: 'Calmar Ratio', value: data.calmar_ratio, format: 'number' },
        { label: 'Omega Ratio', value: data.omega_ratio, format: 'number' },
      ]
    },
    {
      id: 'trade-metrics',
      title: 'TRADE METRICS',
      icon: '💰',
      metrics: [
        { label: 'Win Rate', value: data.win_rate, format: 'percentage', highlight: data.win_rate > 0.5 },
        { label: 'Profit Factor', value: data.profit_factor, format: 'number', highlight: data.profit_factor > 1.5 },
        { label: 'Expectancy', value: data.expectancy, format: 'currency' },
        { label: 'Avg Win', value: data.avg_win, format: 'currency' },
        { label: 'Avg Loss', value: data.avg_loss, format: 'currency' },
        { label: 'Largest Win', value: data.largest_win, format: 'currency' },
        { label: 'Largest Loss', value: data.largest_loss, format: 'currency' },
        { label: 'Avg Win Duration', value: `${data.avg_win_duration} days`, format: 'string' },
        { label: 'Avg Loss Duration', value: `${data.avg_loss_duration} days`, format: 'string' },
      ]
    },
    {
      id: 'streaks',
      title: 'STREAKS',
      icon: '🔥',
      metrics: [
        { label: 'Longest Winning Streak', value: data.longest_winning_streak, format: 'number' },
        { label: 'Longest Losing Streak', value: data.longest_losing_streak, format: 'number' },
        { label: 'Current Streak', value: data.current_streak, format: 'number' },
        { label: 'Current Streak Type', value: data.current_streak_type, format: 'string' },
      ]
    },
    {
      id: 'statistical',
      title: 'STATISTICAL',
      icon: '📊',
      metrics: [
        { label: 't-statistic', value: data.t_stat, format: 'number' },
        { label: 'p-value', value: data.p_value, format: 'number', highlight: data.p_value < 0.05 },
        { label: 'Information Ratio', value: data.information_ratio, format: 'number' },
        { label: 'Tracking Error', value: data.tracking_error, format: 'percentage' },
      ]
    },
    {
      id: 'var',
      title: 'VALUE AT RISK',
      icon: '🎲',
      metrics: [
        { label: 'VaR 95% (1d)', value: data.var_95_1d, format: 'currency' },
        { label: 'VaR 99% (1d)', value: data.var_99_1d, format: 'currency' },
        { label: 'CVaR 95% (1d)', value: data.cvar_95_1d, format: 'currency' },
        { label: 'CVaR 99% (1d)', value: data.cvar_99_1d, format: 'currency' },
      ]
    },
    {
      id: 'watermarks',
      title: 'WATERMARKS',
      icon: '🏆',
      metrics: [
        { label: 'All Time High', value: data.all_time_high, format: 'currency' },
        { label: 'ATH Date', value: data.all_time_high_date, format: 'string' },
        { label: 'Days from ATH', value: data.days_from_ath, format: 'number' },
      ]
    },
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
            BACKTEST
          </div>
          <div className="annotation" style={{ margin: 0 }}>
            {data.start_date} → {data.end_date} ({data.duration_days} days)
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2)'
        }}>
          <button
            onClick={copyToClipboard}
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
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-financial-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-layer-2)';
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

      {/* Key Metrics Summary */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-3)'
      }}>
        <MetricBox
          label="Total Return"
          value={`${data.total_return_pct.toFixed(2)}%`}
          positive={data.total_return_pct >= 0}
        />
        <MetricBox
          label="Sharpe Ratio"
          value={data.sharpe_ratio.toFixed(2)}
          positive={data.sharpe_ratio > 1}
        />
        <MetricBox
          label="Max Drawdown"
          value={`-${data.max_drawdown_pct.toFixed(2)}%`}
          positive={false}
        />
        <MetricBox
          label="Win Rate"
          value={`${(data.win_rate * 100).toFixed(1)}%`}
          positive={data.win_rate > 0.5}
        />
        <MetricBox
          label="Profit Factor"
          value={data.profit_factor.toFixed(2)}
          positive={data.profit_factor > 1.5}
        />
        <MetricBox
          label="Total Trades"
          value={data.total_trades.toString()}
          positive={true}
        />
      </div>

      {/* Expandable Sections */}
      {sections.map((section) => (
        <div key={section.id} style={{
          borderBottom: section.id === 'watermarks' ? 'none' : 'var(--border-thin)'
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
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-3)',
              borderBottom: 'var(--border-thin)'
            }}>
              {section.metrics.map((metric, idx) => (
                <MetricRow
                  key={idx}
                  label={metric.label}
                  value={metric.value}
                  format={metric.format}
                  highlight={metric.highlight}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: string;
  positive: boolean;
}

function MetricBox({ label, value, positive }: MetricBoxProps) {
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
        color: positive ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
        lineHeight: 1
      }}>
        {value}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: any;
  format: 'string' | 'number' | 'percentage' | 'currency';
  highlight?: boolean;
}

function MetricRow({ label, value, format, highlight }: MetricRowProps) {
  const formatValue = () => {
    switch (format) {
      case 'string':
        return value;
      case 'number':
        return typeof value === 'number' ? value.toFixed(4) : value;
      case 'percentage':
        return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value;
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
      default:
        return value;
    }
  };

  return (
    <div style={{
      padding: 'var(--space-2) var(--space-3)',
      border: 'var(--border-thin)',
      background: highlight ? 'rgba(0, 255, 136, 0.1)' : 'var(--bg-layer-1)',
      borderLeft: highlight ? '3px solid var(--success-ag-green)' : 'var(--border-thin)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: 600,
        fontFamily: 'var(--font-data)',
        color: highlight ? 'var(--success-ag-green)' : 'var(--text-white)'
      }}>
        {formatValue()}
      </div>
    </div>
  );
}

// Helper functions for export
function formatBacktestAsText(data: BacktestSummaryType): string {
  return `
BACKTEST SUMMARY
================
Period: ${data.start_date} to ${data.end_date} (${data.duration_days} days)

RETURNS
-------
Total Return: ${data.total_return_pct.toFixed(2)}%
CAGR: ${data.cagr.toFixed(2)}%
Daily Return (Avg±Std): ${data.daily_return_avg.toFixed(4)} ± ${data.daily_return_std.toFixed(4)}

RISK METRICS
------------
Max Drawdown: ${data.max_drawdown_pct.toFixed(2)}%
Annualized Volatility: ${data.volatility_annualized.toFixed(4)}
Downside Deviation: ${data.downside_deviation.toFixed(4)}

RISK-ADJUSTED RETURNS
--------------------
Sharpe Ratio: ${data.sharpe_ratio.toFixed(4)}
Sortino Ratio: ${data.sortino_ratio.toFixed(4)}
Calmar Ratio: ${data.calmar_ratio.toFixed(4)}
Omega Ratio: ${data.omega_ratio.toFixed(4)}

TRADE METRICS
-------------
Win Rate: ${(data.win_rate * 100).toFixed(2)}%
Profit Factor: ${data.profit_factor.toFixed(4)}
Expectancy: $${data.expectancy.toFixed(2)}
Avg Win/Loss: $${data.avg_win.toFixed(2)} / $${data.avg_loss.toFixed(2)}

VALUE AT RISK
-------------
VaR 95% (1d): $${data.var_95_1d.toFixed(2)}
VaR 99% (1d): $${data.var_99_1d.toFixed(2)}
CVaR 95% (1d): $${data.cvar_95_1d.toFixed(2)}
CVaR 99% (1d): $${data.cvar_99_1d.toFixed(2)}

STATISTICAL
-----------
t-statistic: ${data.t_stat.toFixed(4)}
p-value: ${data.p_value.toFixed(6)}
Information Ratio: ${data.information_ratio.toFixed(4)}
`.trim();
}

function formatBacktestAsCSV(data: BacktestSummaryType): string {
  const metrics = [
    ['Metric', 'Value'],
    ['Start Date', data.start_date],
    ['End Date', data.end_date],
    ['Duration Days', data.duration_days],
    ['Total Trades', data.total_trades],
    ['Winning Trades', data.winning_trades],
    ['Losing Trades', data.losing_trades],
    ['Total Return %', data.total_return_pct.toFixed(4)],
    ['CAGR', data.cagr.toFixed(4)],
    ['Daily Return Avg', data.daily_return_avg.toFixed(4)],
    ['Daily Return Std', data.daily_return_std.toFixed(4)],
    ['Max Drawdown', data.max_drawdown.toFixed(2)],
    ['Max Drawdown %', data.max_drawdown_pct.toFixed(4)],
    ['Max Drawdown Duration', data.max_drawdown_duration],
    ['Max Drawdown Recovery', data.max_drawdown_recovery],
    ['Volatility Annualized', data.volatility_annualized.toFixed(4)],
    ['Downside Deviation', data.downside_deviation.toFixed(4)],
    ['Sharpe Ratio', data.sharpe_ratio.toFixed(4)],
    ['Sharpe Ratio 1Y', data.sharpe_ratio_1y.toFixed(4)],
    ['Sharpe Ratio 3Y', data.sharpe_ratio_3y.toFixed(4)],
    ['Sortino Ratio', data.sortino_ratio.toFixed(4)],
    ['Calmar Ratio', data.calmar_ratio.toFixed(4)],
    ['Omega Ratio', data.omega_ratio.toFixed(4)],
    ['Win Rate', data.win_rate.toFixed(4)],
    ['Profit Factor', data.profit_factor.toFixed(4)],
    ['Expectancy', data.expectancy.toFixed(2)],
    ['Avg Win', data.avg_win.toFixed(2)],
    ['Avg Loss', data.avg_loss.toFixed(2)],
    ['Largest Win', data.largest_win.toFixed(2)],
    ['Largest Loss', data.largest_loss.toFixed(2)],
    ['Avg Win Duration', data.avg_win_duration],
    ['Avg Loss Duration', data.avg_loss_duration],
    ['Longest Winning Streak', data.longest_winning_streak],
    ['Longest Losing Streak', data.longest_losing_streak],
    ['t-stat', data.t_stat.toFixed(4)],
    ['p-value', data.p_value.toFixed(6)],
    ['Information Ratio', data.information_ratio.toFixed(4)],
    ['Tracking Error', data.tracking_error.toFixed(4)],
    ['VaR 95% 1d', data.var_95_1d.toFixed(2)],
    ['VaR 99% 1d', data.var_99_1d.toFixed(2)],
    ['CVaR 95% 1d', data.cvar_95_1d.toFixed(2)],
    ['CVaR 99% 1d', data.cvar_99_1d.toFixed(2)],
    ['All Time High', data.all_time_high.toFixed(2)],
    ['Days from ATH', data.days_from_ath],
  ];

  return metrics.map(row => row.join(',')).join('\n');
}
