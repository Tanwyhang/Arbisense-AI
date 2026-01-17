'use client';

import { useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface LegendItem {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  count?: number;
  value?: number | string;
}

interface ChartLegendProps {
  items: LegendItem[];
  onToggle: (id: string) => void;
  onToggleAll?: (visible: boolean) => void;
  layout?: 'horizontal' | 'vertical';
  showToggleAll?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * ChartLegend - Interactive legend with click-to-toggle functionality
 * Brutalist terminal aesthetic styling
 */
export default function ChartLegend({
  items,
  onToggle,
  onToggleAll,
  layout = 'horizontal',
  showToggleAll = true,
  compact = false,
  className = '',
}: ChartLegendProps) {
  const allVisible = items.every(item => item.visible);
  const noneVisible = items.every(item => !item.visible);

  const handleToggleAll = useCallback(() => {
    if (onToggleAll) {
      onToggleAll(noneVisible || !allVisible);
    }
  }, [onToggleAll, allVisible, noneVisible]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        flexWrap: layout === 'horizontal' ? 'wrap' : 'nowrap',
        gap: compact ? 'var(--space-1)' : 'var(--space-2)',
        padding: compact ? 'var(--space-1)' : 'var(--space-2)',
        background: 'var(--bg-layer-2)',
        border: 'var(--border-thin)',
      }}
    >
      {/* Toggle All button */}
      {showToggleAll && onToggleAll && (
        <button
          onClick={handleToggleAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: compact ? 'var(--space-1)' : 'var(--space-1) var(--space-2)',
            background: 'transparent',
            border: 'var(--border-thin)',
            cursor: 'pointer',
            fontFamily: 'var(--font-data)',
            fontSize: compact ? '0.65rem' : '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-layer-3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {allVisible ? <Eye size={compact ? 10 : 12} /> : <EyeOff size={compact ? 10 : 12} />}
          {allVisible ? 'Hide All' : 'Show All'}
        </button>
      )}

      {/* Legend items */}
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: compact ? 'var(--space-1)' : 'var(--space-1) var(--space-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            opacity: item.visible ? 1 : 0.4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-layer-3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Color indicator */}
          <div
            style={{
              width: compact ? '8px' : '12px',
              height: compact ? '8px' : '12px',
              background: item.color,
              border: '1px solid var(--ink-charcoal)',
              opacity: item.visible ? 1 : 0.4,
              transform: item.visible ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.15s ease',
            }}
          />

          {/* Name */}
          <span
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: compact ? '0.65rem' : '0.75rem',
              fontWeight: item.visible ? 500 : 400,
              color: item.visible ? 'var(--ink-charcoal)' : 'var(--text-muted)',
              textDecoration: item.visible ? 'none' : 'line-through',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </span>

          {/* Count badge */}
          {item.count !== undefined && (
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.6rem',
                padding: '0 4px',
                background: item.visible ? 'var(--ink-charcoal)' : 'var(--text-muted)',
                color: 'var(--base-raw-white)',
                borderRadius: '2px',
              }}
            >
              {item.count}
            </span>
          )}

          {/* Value */}
          {item.value !== undefined && (
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: compact ? '0.65rem' : '0.7rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {item.value}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * MonteCarloLegend - Specialized legend for Monte Carlo paths
 */
export function MonteCarloLegend({
  levyVisible,
  normalVisible,
  levyCount,
  normalCount,
  onToggleLevy,
  onToggleNormal,
  compact = false,
}: {
  levyVisible: boolean;
  normalVisible: boolean;
  levyCount: number;
  normalCount: number;
  onToggleLevy: () => void;
  onToggleNormal: () => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        background: 'var(--bg-layer-2)',
        border: 'var(--border-thin)',
      }}
    >
      <button
        onClick={onToggleLevy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: 'var(--space-1) var(--space-2)',
          background: levyVisible ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
          border: levyVisible ? '2px solid var(--alert-signal-red)' : 'var(--border-thin)',
          cursor: 'pointer',
          opacity: levyVisible ? 1 : 0.5,
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            width: compact ? '10px' : '14px',
            height: compact ? '3px' : '4px',
            background: 'var(--alert-signal-red)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: compact ? '0.65rem' : '0.75rem',
            fontWeight: 600,
            color: levyVisible ? 'var(--alert-signal-red)' : 'var(--text-muted)',
          }}
        >
          Lévy ({levyCount})
        </span>
      </button>

      <button
        onClick={onToggleNormal}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: 'var(--space-1) var(--space-2)',
          background: normalVisible ? 'rgba(30, 30, 30, 0.1)' : 'transparent',
          border: normalVisible ? '2px solid var(--ink-charcoal)' : 'var(--border-thin)',
          cursor: 'pointer',
          opacity: normalVisible ? 1 : 0.5,
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            width: compact ? '10px' : '14px',
            height: compact ? '2px' : '2px',
            background: 'var(--ink-charcoal)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: compact ? '0.65rem' : '0.75rem',
            fontWeight: 500,
            color: normalVisible ? 'var(--ink-charcoal)' : 'var(--text-muted)',
          }}
        >
          Normal ({normalCount})
        </span>
      </button>
    </div>
  );
}
