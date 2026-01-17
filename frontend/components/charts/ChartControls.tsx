'use client';

import { useCallback } from 'react';
import { Keyboard, Calendar } from 'lucide-react';

export interface TimePreset {
  id: string;
  label: string;
  days: number;
}

interface ChartControlsProps {
  /** Available time presets */
  presets?: TimePreset[];
  /** Currently active preset ID */
  activePreset?: string;
  /** Callback when preset is selected */
  onPresetChange?: (preset: TimePreset) => void;
  /** Show keyboard shortcuts help */
  showShortcuts?: boolean;
  /** Custom controls to render */
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_PRESETS: TimePreset[] = [
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: 'all', label: 'ALL', days: -1 },
];

/**
 * ChartControls - Unified control bar for chart interactions
 * Includes presets, keyboard shortcuts help, and custom controls
 */
export default function ChartControls({
  presets = DEFAULT_PRESETS,
  activePreset = 'all',
  onPresetChange,
  showShortcuts = true,
  children,
  className = '',
}: ChartControlsProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--bg-layer-2)',
        borderTop: 'var(--border-thin)',
        gap: 'var(--space-3)',
      }}
    >
      {/* Time presets */}
      {presets.length > 0 && onPresetChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <Calendar size={12} style={{ color: 'var(--text-muted)', marginRight: 'var(--space-1)' }} />
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset)}
              style={{
                padding: 'var(--space-1) var(--space-2)',
                background: activePreset === preset.id ? 'var(--ink-charcoal)' : 'transparent',
                color: activePreset === preset.id ? 'var(--base-raw-white)' : 'var(--text-muted)',
                border: 'var(--border-thin)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.7rem',
                fontWeight: activePreset === preset.id ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom controls */}
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {children}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {showShortcuts && (
        <KeyboardShortcuts />
      )}
    </div>
  );
}

/**
 * KeyboardShortcuts - Displays keyboard shortcut hints
 */
function KeyboardShortcuts() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
      }}
    >
      <Keyboard size={12} />
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <ShortcutKey keyName="R" label="Reset" />
        <ShortcutKey keyName="E" label="Export" />
        <ShortcutKey keyName="F" label="Full" />
      </div>
    </div>
  );
}

function ShortcutKey({ keyName, label }: { keyName: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <kbd
        style={{
          padding: '1px 4px',
          background: 'var(--bg-layer-1)',
          border: 'var(--border-thin)',
          borderRadius: '2px',
          fontFamily: 'var(--font-data)',
          fontSize: '0.6rem',
          fontWeight: 600,
        }}
      >
        {keyName}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

/**
 * ComparisonToggle - Toggle for scenario comparison mode
 */
export function ComparisonToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-1) var(--space-2)',
        background: enabled ? 'var(--accent-safety-yellow)' : 'transparent',
        color: enabled ? 'var(--ink-charcoal)' : 'var(--text-muted)',
        border: 'var(--border-thin)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.7rem',
        fontWeight: enabled ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <rect x="1" y="2" width="4" height="8" rx="1" />
        <rect x="7" y="4" width="4" height="6" rx="1" />
      </svg>
      Compare
    </button>
  );
}

/**
 * ScenarioSelector - Dropdown for selecting scenarios to compare
 */
export function ScenarioSelector({
  scenarios,
  selected,
  onSelect,
  label,
}: {
  scenarios: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
      <span
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}:
      </span>
      <select
        value={selected}
        onChange={e => onSelect(e.target.value)}
        style={{
          padding: 'var(--space-1)',
          background: 'var(--bg-layer-1)',
          border: 'var(--border-thin)',
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          color: 'var(--ink-charcoal)',
          cursor: 'pointer',
        }}
      >
        {scenarios.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * ZoomControls - Zoom in/out and reset buttons
 */
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn = true,
  canZoomOut = true,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'var(--border-thin)',
          cursor: canZoomIn ? 'pointer' : 'not-allowed',
          opacity: canZoomIn ? 1 : 0.4,
          fontFamily: 'var(--font-data)',
          fontSize: '0.875rem',
          fontWeight: 700,
        }}
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'var(--border-thin)',
          cursor: canZoomOut ? 'pointer' : 'not-allowed',
          opacity: canZoomOut ? 1 : 0.4,
          fontFamily: 'var(--font-data)',
          fontSize: '0.875rem',
          fontWeight: 700,
        }}
      >
        −
      </button>
      <button
        onClick={onReset}
        style={{
          padding: '0 var(--space-2)',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'var(--border-thin)',
          cursor: 'pointer',
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
        }}
      >
        Reset
      </button>
    </div>
  );
}
