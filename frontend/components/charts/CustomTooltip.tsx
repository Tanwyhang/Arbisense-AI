'use client';

import { ReactNode } from 'react';
import { TooltipProps } from 'recharts';
import { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';

export interface CustomTooltipData {
  label?: string;
  value?: number | string;
  color?: string;
  percentile?: number;
  additionalInfo?: Record<string, string | number>;
}

// Using the base TooltipProps from Recharts
type RechartsTooltipProps = TooltipProps<ValueType, NameType>;

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Payload<ValueType, NameType>[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number | string, name: string) => string;
  showPercentile?: boolean;
  percentileMap?: Map<string, number>;
  extraContent?: ReactNode;
  title?: string;
}

/**
 * CustomTooltip - Smart tooltips with percentiles and additional info
 */
export default function CustomTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  showPercentile = false,
  percentileMap,
  extraContent,
  title,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(String(label)) : `Day ${label}`;

  return (
    <div
      style={{
        background: 'var(--ink-charcoal)',
        border: 'var(--border-thick)',
        padding: 'var(--space-3)',
        minWidth: '180px',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.75rem',
          color: 'var(--base-raw-white)',
          marginBottom: 'var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        {title || formattedLabel}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {payload.map((entry: Payload<ValueType, NameType>, index: number) => {
          const value = entry.value as number;
          const name = entry.name as string;
          const color = entry.color || 'var(--base-raw-white)';
          
          const formattedValue = valueFormatter 
            ? valueFormatter(value, name)
            : typeof value === 'number' 
              ? `$${value.toFixed(2)}`
              : String(value);

          const percentile = showPercentile && percentileMap?.get(name);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    background: color,
                    border: '1px solid rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  {name}
                </span>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--base-raw-white)',
                  }}
                >
                  {formattedValue}
                </span>
                {percentile !== undefined && percentile !== false && (
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.6)',
                      marginLeft: 'var(--space-1)',
                    }}
                  >
                    P{(percentile as number).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {extraContent && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {extraContent}
        </div>
      )}
    </div>
  );
}

interface MonteCarloTooltipProps extends CustomTooltipProps {
  allPaths?: { values: number[]; is_levy: boolean }[];
}

/**
 * MonteCarloTooltip - Specialized tooltip for Monte Carlo paths
 */
export function MonteCarloTooltip({
  active,
  payload,
  label,
  allPaths,
}: MonteCarloTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const value = entry.value as number;
  const day = label as number;

  let percentile = 0;
  if (allPaths && allPaths.length > 0) {
    const valuesAtDay = allPaths.map(p => p.values[day] || 0).sort((a, b) => a - b);
    const rank = valuesAtDay.filter(v => v <= value).length;
    percentile = (rank / valuesAtDay.length) * 100;
  }

  const isLevy = (entry.payload as Record<string, unknown>)?.is_levy;

  return (
    <div
      style={{
        background: 'var(--ink-charcoal)',
        border: 'var(--border-thick)',
        padding: 'var(--space-3)',
        minWidth: '150px',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.75rem',
          color: 'var(--base-raw-white)',
          marginBottom: 'var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Day {day}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: value >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
        }}
      >
        ${value.toFixed(2)}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--space-2)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: isLevy ? 'var(--alert-signal-red)' : 'rgba(255,255,255,0.6)',
          }}
        >
          {isLevy ? 'Lévy Flight' : 'Normal'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          P{percentile.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

/**
 * RevenueTooltip - Specialized tooltip for Revenue Projection
 */
export function RevenueTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'var(--ink-charcoal)',
        border: 'var(--border-thick)',
        padding: 'var(--space-3)',
        minWidth: '200px',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.75rem',
          color: 'var(--base-raw-white)',
          marginBottom: 'var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        Day {label}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {payload.map((entry: Payload<ValueType, NameType>, index: number) => {
          const cumValue = entry.value as number;
          const dailyValue = ((entry.payload as Record<string, unknown>)?.daily as number) || 0;

          return (
            <div key={index}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      background: entry.color,
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {entry.name}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: cumValue >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
                  }}
                >
                  ${cumValue.toFixed(0)}
                </span>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Daily: {dailyValue >= 0 ? '+' : ''}${dailyValue.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
