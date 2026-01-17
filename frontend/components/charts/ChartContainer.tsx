'use client';

import { ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import { Download, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string | ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  };
  computationTime?: number;
  children: ReactNode;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onReset?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  showControls?: boolean;
  isLive?: boolean;
  lastUpdate?: number;
  className?: string;
}

/**
 * ChartContainer - Responsive wrapper with brutalist terminal styling
 * Provides consistent layout, header, and control bar for all charts
 */
export default function ChartContainer({
  title,
  subtitle,
  badge,
  computationTime,
  children,
  onExportPNG,
  onExportSVG,
  onReset,
  onFullscreenChange,
  showControls = true,
  isLive = false,
  lastUpdate,
  className = '',
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // Sync fullscreen state with browser event (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = document.fullscreenElement === containerRef.current;
      setIsFullscreen(isFs);
      if (onFullscreenChange) onFullscreenChange(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // Pulse animation for live data
  useEffect(() => {
    if (isLive && lastUpdate) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate, isLive]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement !== document.body) return;

      switch (e.key.toLowerCase()) {
        case 'r':
          if (onReset) {
            e.preventDefault();
            onReset();
          }
          break;
        case 'e':
          if (onExportPNG) {
            e.preventDefault();
            onExportPNG();
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReset, onExportPNG, toggleFullscreen]);

  const badgeColors = {
    default: {
      bg: 'var(--ink-charcoal)',
      color: 'var(--base-raw-white)',
    },
    success: {
      bg: 'var(--success-ag-green)',
      color: 'var(--ink-charcoal)',
    },
    warning: {
      bg: 'var(--accent-safety-yellow)',
      color: 'var(--ink-charcoal)',
    },
    danger: {
      bg: 'var(--alert-signal-red)',
      color: 'var(--base-raw-white)',
    },
  };

  const currentBadge = badge ? badgeColors[badge.variant || 'default'] : null;

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{
        border: 'var(--border-thick)',
        borderTop: 'none',
        background: 'var(--base-raw-white)',
        position: 'relative',
        display: isFullscreen ? 'flex' : 'block',
        flexDirection: isFullscreen ? 'column' : undefined,
        height: isFullscreen ? '100%' : 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: 'var(--border-thick)',
          background: 'var(--bg-layer-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Badge */}
          {badge && currentBadge && (
            <div
              style={{
                padding: 'var(--space-1) var(--space-3)',
                border: 'var(--border-thick)',
                background: currentBadge.bg,
                color: currentBadge.color,
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transform: 'rotate(-2deg)',
              }}
            >
              {badge.text}
            </div>
          )}

          {/* Title & Subtitle */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-charcoal)',
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                className="annotation"
                style={{ margin: 0, marginTop: '4px' }}
              >
                {typeof subtitle === 'string' ? subtitle : subtitle}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Live indicator */}
          {isLive && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.75rem',
                color: 'var(--success-ag-green)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success-ag-green)',
                  animation: pulsing ? 'pulse 0.2s ease-out' : undefined,
                }}
              />
              LIVE
            </div>
          )}

          {/* Computation time */}
          {computationTime !== undefined && (
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              {computationTime.toFixed(0)}ms
            </div>
          )}

          {/* Controls */}
          {showControls && (
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {onReset && (
                <button
                  onClick={onReset}
                  title="Reset (R)"
                  style={{
                    background: 'transparent',
                    border: 'var(--border-thin)',
                    padding: 'var(--space-1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              )}
              {onExportPNG && (
                <button
                  onClick={onExportPNG}
                  title="Export PNG (E)"
                  style={{
                    background: 'transparent',
                    border: 'var(--border-thin)',
                    padding: 'var(--space-1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Download size={14} />
                </button>
              )}
              {onExportSVG && (
                <button
                  onClick={onExportSVG}
                  title="Export SVG"
                  style={{
                    background: 'transparent',
                    border: 'var(--border-thin)',
                    padding: 'var(--space-1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.6rem',
                  }}
                >
                  SVG
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
                style={{
                  background: 'transparent',
                  border: 'var(--border-thin)',
                  padding: 'var(--space-1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div
        style={{
          background: 'var(--bg-layer-1)',
          position: 'relative',
          flex: isFullscreen ? 1 : undefined,
          display: isFullscreen ? 'flex' : 'block',
          flexDirection: isFullscreen ? 'column' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
