'use client';

import React, { useState, useMemo } from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';
import { LimitlessPool } from '@/types/market-data';

interface LimitlessPoolsPanelProps {
  maxPools?: number;
}

export default function LimitlessPoolsPanel({ maxPools = 20 }: LimitlessPoolsPanelProps) {
  const { limitlessPools, isConnected, lastUpdateTime } = useMarketData();
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apr'>('tvl');
  const [filterText, setFilterText] = useState('');
  
  // Sort and filter pools
  const displayedPools = useMemo(() => {
    let pools = [...limitlessPools];
    
    // Filter
    if (filterText) {
      pools = pools.filter(p => 
        p.name?.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    
    // Sort
    return pools.sort((a, b) => {
      switch (sortBy) {
        case 'tvl':
          return b.tvl - a.tvl;
        case 'volume':
          return b.volume_24h - a.volume_24h;
        case 'apr':
          return b.apr - a.apr;
        default:
          return b.tvl - a.tvl;
      }
    }).slice(0, maxPools);
  }, [limitlessPools, sortBy, filterText, maxPools]);
  
  // Format large numbers
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };
  
  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          }} />
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            {displayedPools.length} POOLS
          </span>
        </div>
        
        {/* Sort controls */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['tvl', 'volume', 'apr'] as const).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              style={{
                padding: '2px 6px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-data)',
                border: sortBy === option ? '1px solid var(--accent-cyan)' : '1px solid var(--border-dim)',
                background: sortBy === option ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                color: sortBy === option ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      
      {/* Filter */}
      <div style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Filter pools..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-1) var(--space-2)',
            border: '1px solid var(--border-dim)',
            background: 'var(--bg-layer-2)',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.75rem'
          }}
        />
      </div>
      
      {/* Pools List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayedPools.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem'
          }}>
            {isConnected ? 'Loading pools...' : 'Disconnected'}
          </div>
        ) : (
          <div style={{ padding: 'var(--space-2)' }}>
            {displayedPools.map((pool, index) => (
              <PoolCard key={pool.address || index} pool={pool} formatValue={formatValue} />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: 'var(--space-1) var(--space-2)',
        borderTop: '1px solid var(--border-dim)',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-data)',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>Updated: {formatTimeAgo(lastUpdateTime || 0)}</span>
        <span>Limitless Exchange</span>
      </div>
    </div>
  );
}

// Pool card component
const PoolCard = React.memo(({
  pool,
  formatValue
}: {
  pool: LimitlessPool;
  formatValue: (value: number) => string;
}) => {
  return (
    <div style={{
      padding: 'var(--space-3)',
      marginBottom: 'var(--space-2)',
      border: '1px solid var(--border-dim)',
      background: 'var(--bg-layer-2)',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
      e.currentTarget.style.background = 'var(--bg-layer-3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-dim)';
      e.currentTarget.style.background = 'var(--bg-layer-2)';
    }}
    >
      {/* Pool name */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-2)'
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--text-white)'
        }}>
          {pool.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          padding: '2px 6px',
          background: 'rgba(0, 212, 255, 0.1)',
          color: 'var(--accent-cyan)',
          border: '1px solid var(--accent-cyan)'
        }}>
          {pool.fee_tier / 100}%
        </span>
      </div>
      
      {/* Metrics row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-2)'
      }}>
        {/* TVL */}
        <div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            TVL
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-white)'
          }}>
            {formatValue(pool.tvl)}
          </div>
        </div>
        
        {/* Volume 24h */}
        <div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            24H VOL
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--accent-amber)'
          }}>
            {formatValue(pool.volume_24h)}
          </div>
        </div>
        
        {/* APR */}
        <div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            APR
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: pool.apr > 10 ? 'var(--success-ag-green)' : 'var(--text-white)'
          }}>
            {pool.apr.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
});

PoolCard.displayName = 'PoolCard';
