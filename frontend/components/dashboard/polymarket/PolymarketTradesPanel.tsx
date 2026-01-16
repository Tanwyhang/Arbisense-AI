'use client';

import React from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';
import { PolymarketTrade } from '@/types/market-data';

interface PolymarketTradesPanelProps {
  maxTrades?: number;
}

export default function PolymarketTradesPanel({ maxTrades = 50 }: PolymarketTradesPanelProps) {
  const { polymarketTrades, isConnected } = useMarketData();
  
  const displayedTrades = polymarketTrades.slice(0, maxTrades);
  
  // Format time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
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
            animation: displayedTrades.length > 0 ? 'pulse 1s infinite' : 'none'
          }} />
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            LIVE TRADES
          </span>
        </div>
        
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          {displayedTrades.length} trades
        </span>
      </div>
      
      {/* Trades List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayedTrades.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem'
          }}>
            {isConnected ? 'Waiting for trades...' : 'Disconnected'}
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
                <th style={{ padding: 'var(--space-2)', textAlign: 'left' }}>Time</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'center' }}>Side</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Price</th>
                <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {displayedTrades.map((trade, index) => (
                <TradeRow key={trade.id || index} trade={trade} formatTime={formatTime} isNew={index === 0} />
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
        textAlign: 'center',
        flexShrink: 0
      }}>
        Real-time Polymarket trade feed
      </div>
    </div>
  );
}

// Trade row component with animation
const TradeRow = React.memo(({
  trade,
  formatTime,
  isNew
}: {
  trade: PolymarketTrade;
  formatTime: (ts: number) => string;
  isNew: boolean;
}) => {
  const isBuy = trade.side === 'buy';
  
  return (
    <tr 
      style={{
        borderBottom: '1px solid var(--border-dim)',
        animation: isNew ? 'fadeIn 0.5s ease' : 'none',
        background: isNew ? 'rgba(0, 102, 255, 0.05)' : 'transparent',
        transition: 'background 0.3s ease'
      }}
    >
      <td style={{
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)'
      }}>
        {formatTime(trade.timestamp)}
      </td>
      <td style={{
        padding: 'var(--space-1) var(--space-2)',
        textAlign: 'center'
      }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 6px',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-data)',
          fontWeight: 700,
          color: isBuy ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
          background: isBuy ? 'rgba(0, 200, 117, 0.1)' : 'rgba(254, 56, 85, 0.1)',
          border: `1px solid ${isBuy ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`,
          textTransform: 'uppercase'
        }}>
          {trade.side}
        </span>
      </td>
      <td style={{
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.8rem',
        fontWeight: 700,
        textAlign: 'right',
        color: 'var(--text-white)'
      }}>
        {(trade.price * 100).toFixed(1)}¢
      </td>
      <td style={{
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        textAlign: 'right',
        color: 'var(--text-muted)'
      }}>
        ${trade.size.toFixed(0)}
      </td>
    </tr>
  );
});

TradeRow.displayName = 'TradeRow';
