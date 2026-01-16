'use client';

import React, { useMemo } from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';
import { PolymarketOrderBook } from '@/types/market-data';

interface PolymarketOrderBookPanelProps {
  tokenId?: string;
  maxLevels?: number;
}

export default function PolymarketOrderBookPanel({
  tokenId,
  maxLevels = 10
}: PolymarketOrderBookPanelProps) {
  const { polymarketOrderbooks, isConnected } = useMarketData();
  
  // Get the selected orderbook or the first one
  const orderbook = useMemo(() => {
    if (tokenId) {
      return polymarketOrderbooks.get(tokenId);
    }
    // Return first orderbook if no specific token selected
    const entries = Array.from(polymarketOrderbooks.values());
    return entries[0];
  }, [polymarketOrderbooks, tokenId]);
  
  // Calculate max size for visualization scaling
  const maxSize = useMemo(() => {
    if (!orderbook) return 1;
    const bidSizes = orderbook.bids.map(b => b.size);
    const askSizes = orderbook.asks.map(a => a.size);
    return Math.max(...bidSizes, ...askSizes, 1);
  }, [orderbook]);
  
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
            {orderbook?.outcome || 'ORDER BOOK'}
          </span>
        </div>
        
        {orderbook && (
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            Spread: <span style={{ color: 'var(--accent-amber)' }}>{(orderbook.spread * 100).toFixed(2)}¢</span>
          </div>
        )}
      </div>
      
      {/* Order Book Content */}
      {!orderbook ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-data)',
          fontSize: '0.8rem'
        }}>
          {isConnected ? 'No orderbook data' : 'Disconnected'}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Asks (sells) - reversed to show best at bottom */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {orderbook.asks.slice(0, maxLevels).map((level, i) => (
                  <OrderBookRow
                    key={`ask-${i}`}
                    price={level.price}
                    size={level.size}
                    maxSize={maxSize}
                    side="ask"
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mid price */}
          <div style={{
            padding: 'var(--space-2)',
            borderTop: '1px solid var(--border-dim)',
            borderBottom: '1px solid var(--border-dim)',
            background: 'var(--bg-layer-2)',
            textAlign: 'center',
            fontFamily: 'var(--font-data)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-white)'
          }}>
            {(orderbook.mid_price * 100).toFixed(2)}¢
            <span style={{ 
              marginLeft: 'var(--space-2)', 
              fontSize: '0.7rem', 
              color: 'var(--text-muted)' 
            }}>
              MID
            </span>
          </div>
          
          {/* Bids (buys) */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {orderbook.bids.slice(0, maxLevels).map((level, i) => (
                  <OrderBookRow
                    key={`bid-${i}`}
                    price={level.price}
                    size={level.size}
                    maxSize={maxSize}
                    side="bid"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
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
        <span>
          {orderbook ? `${orderbook.bids.length}/${orderbook.asks.length} levels` : 'No data'}
        </span>
        <span>
          {orderbook?.updated_at 
            ? new Date(orderbook.updated_at).toLocaleTimeString() 
            : '--:--:--'}
        </span>
      </div>
    </div>
  );
}

// Order book row component
const OrderBookRow = React.memo(({
  price,
  size,
  maxSize,
  side
}: {
  price: number;
  size: number;
  maxSize: number;
  side: 'bid' | 'ask';
}) => {
  const percentage = (size / maxSize) * 100;
  const isBid = side === 'bid';
  const barColor = isBid 
    ? 'rgba(0, 200, 117, 0.2)' 
    : 'rgba(254, 56, 85, 0.2)';
  const textColor = isBid 
    ? 'var(--success-ag-green)' 
    : 'var(--alert-signal-red)';
  
  return (
    <tr style={{ position: 'relative' }}>
      {/* Background bar */}
      <td 
        colSpan={3} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 0
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          [isBid ? 'left' : 'right']: 0,
          bottom: 0,
          width: `${percentage}%`,
          background: barColor,
          transition: 'width 0.2s ease'
        }} />
      </td>
      
      {/* Price */}
      <td style={{
        position: 'relative',
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        color: textColor,
        width: '40%',
        textAlign: isBid ? 'left' : 'right'
      }}>
        {(price * 100).toFixed(1)}¢
      </td>
      
      {/* Size */}
      <td style={{
        position: 'relative',
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.75rem',
        color: 'var(--text-white)',
        textAlign: 'center'
      }}>
        ${size.toFixed(0)}
      </td>
      
      {/* Total (cumulative would go here) */}
      <td style={{
        position: 'relative',
        padding: 'var(--space-1) var(--space-2)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        width: '30%',
        textAlign: isBid ? 'right' : 'left'
      }}>
        {percentage.toFixed(0)}%
      </td>
    </tr>
  );
});

OrderBookRow.displayName = 'OrderBookRow';
