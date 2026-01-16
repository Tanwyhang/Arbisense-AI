'use client';

import React, { useState, useMemo } from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';
import { PolymarketPriceUpdate } from '@/types/market-data';

interface PolymarketPricesPanelProps {
  maxItems?: number;
  showSparkline?: boolean;
}

export default function PolymarketPricesPanel({ 
  maxItems = 20,
  showSparkline = true 
}: PolymarketPricesPanelProps) {
  const { polymarketPrices, isConnected, lastUpdateTime } = useMarketData();
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'time'>('time');
  const [filterText, setFilterText] = useState('');
  
  // Convert Map to sorted array
  const priceList = useMemo(() => {
    const items = Array.from(polymarketPrices.values());
    
    // Filter
    const filtered = filterText 
      ? items.filter(p => p.market_id?.toLowerCase().includes(filterText.toLowerCase()))
      : items;
    
    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return Math.abs(b.change_pct) - Math.abs(a.change_pct);
        case 'time':
        default:
          return b.timestamp - a.timestamp;
      }
    }).slice(0, maxItems);
  }, [polymarketPrices, sortBy, filterText, maxItems]);
  
  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
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
            animation: isConnected ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            {priceList.length} MARKETS
          </span>
        </div>
        
        {/* Sort controls */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['time', 'price', 'change'] as const).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              style={{
                padding: '2px 6px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-data)',
                border: sortBy === option ? '1px solid var(--accent-financial-blue)' : '1px solid var(--border-dim)',
                background: sortBy === option ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
                color: sortBy === option ? 'var(--accent-financial-blue)' : 'var(--text-muted)',
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
          placeholder="Filter markets..."
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
      
      {/* Price List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {priceList.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem'
          }}>
            {isConnected ? 'Waiting for data...' : 'Disconnected'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--border-dim)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                <th style={{ padding: 'var(--space-2)', textAlign: 'left' }}>Market</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Price</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Change</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Age</th>
              </tr>
            </thead>
            <tbody>
              {priceList.map((price) => (
                <PriceRow key={price.token_id} price={price} formatTimeAgo={formatTimeAgo} />
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
        <span>Last update: {lastUpdateTime ? formatTimeAgo(lastUpdateTime) : 'Never'}</span>
        <span>Polymarket CLOB</span>
      </div>
    </div>
  );
}

// Price row component for performance
const PriceRow = React.memo(({ 
  price, 
  formatTimeAgo 
}: { 
  price: PolymarketPriceUpdate;
  formatTimeAgo: (ts: number) => string;
}) => {
  const isPositive = price.change_pct >= 0;
  
  return (
    <tr style={{
      borderBottom: '1px solid var(--border-dim)',
      transition: 'background 0.3s ease',
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-layer-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        color: 'var(--text-white)',
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {price.market_id?.substring(0, 20) || price.token_id?.substring(0, 16)}
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.8rem',
        fontWeight: 700,
        textAlign: 'right',
        color: 'var(--text-white)'
      }}>
        {(price.price * 100).toFixed(1)}¢
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        textAlign: 'right',
        color: isPositive ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
      }}>
        {isPositive ? '+' : ''}{price.change_pct.toFixed(2)}%
      </td>
      <td style={{
        padding: 'var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.7rem',
        textAlign: 'right',
        color: 'var(--text-muted)'
      }}>
        {formatTimeAgo(price.timestamp)}
      </td>
    </tr>
  );
});

PriceRow.displayName = 'PriceRow';
