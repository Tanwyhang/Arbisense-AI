'use client';

import React, { useState, useMemo } from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';
import { LimitlessPrice } from '@/types/market-data';

interface LimitlessPricesPanelProps {
  maxItems?: number;
}

export default function LimitlessPricesPanel({ maxItems = 20 }: LimitlessPricesPanelProps) {
  const { limitlessPrices, isConnected, lastUpdateTime } = useMarketData();
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('volume');
  
  // Sort prices
  const displayedPrices = useMemo(() => {
    return [...limitlessPrices].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price_usd - a.price_usd;
        case 'change':
          return Math.abs(b.change_24h) - Math.abs(a.change_24h);
        case 'volume':
          return b.volume_24h - a.volume_24h;
        default:
          return b.volume_24h - a.volume_24h;
      }
    }).slice(0, maxItems);
  }, [limitlessPrices, sortBy, maxItems]);
  
  // Format price
  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return `$${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    } else if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else {
      return `$${value.toFixed(6)}`;
    }
  };
  
  // Format volume
  const formatVolume = (value: number) => {
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
    return `${minutes}m ago`;
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
            {displayedPrices.length} PAIRS
          </span>
        </div>
        
        {/* Sort controls */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['volume', 'price', 'change'] as const).map(option => (
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
      
      {/* Prices List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayedPrices.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem'
          }}>
            {isConnected ? 'Loading prices...' : 'Disconnected'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--border-dim)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-layer-1)'
              }}>
                <th style={{ padding: 'var(--space-2)', textAlign: 'left' }}>Pair</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Price</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>24H</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {displayedPrices.map((price, index) => (
                <PriceRow 
                  key={price.pair || index} 
                  price={price} 
                  formatPrice={formatPrice}
                  formatVolume={formatVolume}
                />
              ))}
            </tbody>
          </table>
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

// Price row component
const PriceRow = React.memo(({
  price,
  formatPrice,
  formatVolume
}: {
  price: LimitlessPrice;
  formatPrice: (value: number) => string;
  formatVolume: (value: number) => string;
}) => {
  const isPositive = price.change_24h >= 0;
  
  return (
    <tr style={{
      borderBottom: '1px solid var(--border-dim)',
      transition: 'background 0.2s ease'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-layer-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-display)',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: 'var(--text-white)'
      }}>
        {price.pair || `${price.token0_symbol}/${price.token1_symbol}`}
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.8rem',
        fontWeight: 700,
        textAlign: 'right',
        color: 'var(--text-white)'
      }}>
        {formatPrice(price.price_usd || price.price)}
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        textAlign: 'right',
        color: isPositive ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
      }}>
        {isPositive ? '+' : ''}{price.change_24h.toFixed(2)}%
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        textAlign: 'right',
        color: 'var(--text-muted)'
      }}>
        {formatVolume(price.volume_24h)}
      </td>
    </tr>
  );
});

PriceRow.displayName = 'PriceRow';
