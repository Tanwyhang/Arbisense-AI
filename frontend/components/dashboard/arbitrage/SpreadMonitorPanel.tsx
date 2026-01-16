'use client';

import React, { useState, useMemo } from 'react';

interface SpreadMonitorPanelProps {
  spreads?: Array<{
    id: string;
    name: string;
    spread_pct: number;
    polymarket_price: number;
    limitless_price: number;
    direction: 'positive' | 'negative' | 'neutral';
    updated_at: number;
  }>;
}

// Generate demo spread data for visualization
const generateDemoSpreads = () => {
  const pairs = [
    'BTC Election Winner',
    'ETH Price > $5000',
    'Fed Rate Cut',
    'Trump Victory',
    'Bitcoin ETF Approval',
    'Recession 2024'
  ];
  
  return pairs.map((name, i) => ({
    id: `spread-${i}`,
    name,
    spread_pct: Math.random() * 3 - 0.5, // -0.5 to 2.5%
    polymarket_price: 0.4 + Math.random() * 0.2,
    limitless_price: 0.4 + Math.random() * 0.2,
    direction: Math.random() > 0.5 ? 'positive' : 'negative' as 'positive' | 'negative',
    updated_at: Date.now() - Math.random() * 60000
  }));
};

export default function SpreadMonitorPanel({ spreads: propSpreads }: SpreadMonitorPanelProps) {
  const [selectedSpread, setSelectedSpread] = useState<string | null>(null);
  
  // Use prop spreads or demo data
  const spreads = useMemo(() => {
    return propSpreads || generateDemoSpreads();
  }, [propSpreads]);
  
  // Calculate max spread for scaling
  const maxSpread = useMemo(() => {
    return Math.max(...spreads.map(s => Math.abs(s.spread_pct)), 3);
  }, [spreads]);
  
  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };
  
  return (
    <div className="panel-body" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          REAL-TIME SPREAD MONITOR
        </span>
        
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          color: 'var(--accent-cyan)'
        }}>
          {spreads.length} pairs
        </span>
      </div>
      
      {/* Spread Chart */}
      <div style={{ flex: 1, padding: 'var(--space-3)', overflow: 'auto' }}>
        {spreads.map((spread) => (
          <SpreadBar
            key={spread.id}
            spread={spread}
            maxSpread={maxSpread}
            isSelected={selectedSpread === spread.id}
            onSelect={() => setSelectedSpread(spread.id === selectedSpread ? null : spread.id)}
            formatTimeAgo={formatTimeAgo}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-data)',
        color: 'var(--text-muted)',
        flexShrink: 0
      }}>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: 8, 
            height: 8, 
            background: 'var(--success-ag-green)',
            marginRight: 4
          }} />
          Positive Spread
        </span>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: 8, 
            height: 8, 
            background: 'var(--alert-signal-red)',
            marginRight: 4
          }} />
          Negative Spread
        </span>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: 8, 
            height: 8, 
            background: 'var(--accent-amber)',
            marginRight: 4
          }} />
          Actionable (&gt;1%)
        </span>
      </div>
    </div>
  );
}

// Spread bar visualization
const SpreadBar = React.memo(({
  spread,
  maxSpread,
  isSelected,
  onSelect,
  formatTimeAgo
}: {
  spread: any;
  maxSpread: number;
  isSelected: boolean;
  onSelect: () => void;
  formatTimeAgo: (ts: number) => string;
}) => {
  const isPositive = spread.spread_pct >= 0;
  const isActionable = Math.abs(spread.spread_pct) >= 1.0;
  
  // Calculate bar width (centered at 50%)
  const barWidth = Math.min((Math.abs(spread.spread_pct) / maxSpread) * 40, 40);
  const barStart = isPositive ? 50 : 50 - barWidth;
  
  // Bar color
  const barColor = isActionable 
    ? 'var(--accent-amber)' 
    : isPositive 
      ? 'var(--success-ag-green)' 
      : 'var(--alert-signal-red)';
  
  return (
    <div 
      onClick={onSelect}
      style={{
        marginBottom: 'var(--space-2)',
        padding: 'var(--space-2)',
        background: isSelected ? 'var(--bg-layer-3)' : 'var(--bg-layer-2)',
        border: `1px solid ${isSelected ? 'var(--accent-financial-blue)' : 'var(--border-dim)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Label row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-1)'
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.75rem',
          color: 'var(--text-white)',
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {spread.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: barColor
        }}>
          {isPositive ? '+' : ''}{spread.spread_pct.toFixed(2)}%
        </span>
      </div>
      
      {/* Bar visualization */}
      <div style={{
        position: 'relative',
        height: 16,
        background: 'var(--bg-layer-1)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--border-dim)'
        }} />
        
        {/* Spread bar */}
        <div style={{
          position: 'absolute',
          left: `${barStart}%`,
          top: 2,
          bottom: 2,
          width: `${barWidth}%`,
          background: barColor,
          transition: 'all 0.3s ease',
          animation: isActionable ? 'pulse 1.5s infinite' : 'none'
        }} />
      </div>
      
      {/* Details (shown when selected) */}
      {isSelected && (
        <div style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2)',
          background: 'var(--bg-layer-1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-2)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-data)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Polymarket</div>
            <div style={{ color: 'var(--accent-financial-blue)', fontWeight: 700 }}>
              {(spread.polymarket_price * 100).toFixed(1)}¢
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Limitless</div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
              {(spread.limitless_price * 100).toFixed(1)}¢
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Updated</div>
            <div style={{ color: 'var(--text-white)' }}>
              {formatTimeAgo(spread.updated_at)} ago
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SpreadBar.displayName = 'SpreadBar';
