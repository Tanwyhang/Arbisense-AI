'use client';

import { useEffect, useState } from 'react';

interface TickerItem {
  symbol: string;
  value: string;
  change: number;
  timestamp: string;
}

interface TickerTapeProps {
  items?: TickerItem[];
  speed?: number;
}

export default function TickerTape({
  items: defaultItems,
  speed = 30
}: TickerTapeProps) {
  const [items] = useState<TickerItem[]>(defaultItems || [
    { symbol: 'BTC/USDT', value: '$43,256.78', change: 2.34, timestamp: '14:32:15' },
    { symbol: 'ETH/USDT', value: '$2,289.45', change: -1.23, timestamp: '14:32:14' },
    { symbol: 'USDC-USDT', value: '0.12%', change: 0.12, timestamp: '14:32:13' },
    { symbol: 'ARBIS/OPP', value: 'ACTIVE', change: 15.67, timestamp: '14:32:12' },
    { symbol: 'GAS: 24gwei', value: 'LOW', change: -5.43, timestamp: '14:32:11' },
    { symbol: 'LATENCY', value: '847ms', change: -12.5, timestamp: '14:32:10' }
  ]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      left: 0,
      right: 0,
      zIndex: 999,
      background: 'var(--terminal-dark-blue)',
      borderTop: '1px solid var(--accent-financial-blue)',
      borderBottom: '1px solid var(--accent-financial-blue)',
      padding: 'var(--space-2) 0',
      overflow: 'hidden',
      fontFamily: 'var(--font-data)',
      fontSize: '0.75rem'
    }}>
      {/* Scrolling Ticker */}
      <div style={{
        display: 'flex',
        animation: `scroll ${speed}s linear infinite`,
        whiteSpace: 'nowrap',
        alignItems: 'center'
      }}>
        {/* Duplicate items for seamless scroll */}
        {[...items, ...items, ...items].map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '0 var(--space-4)',
              borderRight: index < items.length * 3 - 1 ? '1px solid var(--border-dim)' : 'none'
            }}
          >
            {/* Symbol */}
            <span style={{
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              minWidth: '120px'
            }}>
              {item.symbol}
            </span>

            {/* Value */}
            <span style={{
              color: 'var(--text-white)',
              fontWeight: 500,
              minWidth: '100px'
            }}>
              {item.value}
            </span>

            {/* Change */}
            <span style={{
              color: item.change >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
              fontWeight: 600,
              minWidth: '80px',
              fontSize: '0.7rem'
            }}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>

            {/* Timestamp */}
            <span style={{
              color: '#b8bfc7',
              fontSize: '0.7rem',
              minWidth: '80px'
            }}>
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>

      {/* CSS Animation for Scroll */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
      `}</style>
    </div>
  );
}
