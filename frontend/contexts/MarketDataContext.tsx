'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  useMarketDataWebSocket, 
  useArbitrageWebSocket,
  WebSocketState,
  ArbitrageData 
} from '@/hooks/useMarketDataWebSocket';
import {
  PolymarketMarket,
  PolymarketOrderBook,
  PolymarketTrade,
  PolymarketPriceUpdate,
  LimitlessPool,
  LimitlessPrice,
  WebSocketConnectionStatus,
} from '@/types/market-data';
import { ArbitrageOpportunity, ArbitrageSignal, ArbitrageAlert } from '@/types/arbitrage';

// ============================================================================
// Context Types
// ============================================================================

export interface MarketDataContextValue {
  // Connection status
  isConnected: boolean;
  isArbitrageConnected: boolean;
  connectionState: WebSocketState['connectionState'];
  arbitrageConnectionState: WebSocketState['connectionState'];
  latency: number | null;
  
  // Polymarket data
  polymarketPrices: Map<string, PolymarketPriceUpdate>;
  polymarketOrderbooks: Map<string, PolymarketOrderBook>;
  polymarketTrades: PolymarketTrade[];
  
  // Limitless data
  limitlessPools: LimitlessPool[];
  limitlessPrices: LimitlessPrice[];
  
  // Arbitrage data
  arbitrageOpportunities: any[];
  arbitrageSignals: any[];
  arbitrageAlerts: any[];
  arbitrageStatus: any;
  
  // Metrics
  messageCount: number;
  lastUpdateTime: number | null;
  dataFreshnessMs: number | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribeMarket: (marketId: string) => boolean;
  unsubscribeMarket: (marketId: string) => boolean;
  acknowledgeAlert: (alertId: string) => void;
  refreshData: () => void;
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface MarketDataProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

// ============================================================================
// Provider Component
// ============================================================================

export function MarketDataProvider({ children, autoConnect = true }: MarketDataProviderProps) {
  // Market data WebSocket
  const marketWs = useMarketDataWebSocket({
    autoConnect,
    onConnect: () => {
      console.log('Market data WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Market data WebSocket disconnected');
    },
    onError: () => {
      console.warn('Market data WebSocket connection failed. Will retry automatically.');
    },
  });
  
  // Arbitrage WebSocket
  const arbWs = useArbitrageWebSocket({
    autoConnect,
    onConnect: () => {
      console.log('Arbitrage WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Arbitrage WebSocket disconnected');
    },
    onError: () => {
      console.warn('Arbitrage WebSocket connection failed. Will retry automatically.');
    },
  });
  
  // Derived state
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  
  // Update last update time when we receive messages
  useEffect(() => {
    if (marketWs.lastMessageAt) {
      setLastUpdateTime(marketWs.lastMessageAt);
    }
  }, [marketWs.lastMessageAt]);
  
  // Calculate data freshness
  const dataFreshnessMs = lastUpdateTime ? Date.now() - lastUpdateTime : null;
  
  // Combined connection actions
  const connect = useCallback(() => {
    marketWs.connect();
    arbWs.connect();
  }, [marketWs.connect, arbWs.connect]);
  
  const disconnect = useCallback(() => {
    marketWs.disconnect();
    arbWs.disconnect();
  }, [marketWs.disconnect, arbWs.disconnect]);
  
  // Subscription helpers
  const subscribeMarket = useCallback((marketId: string) => {
    return marketWs.subscribe('market', { market_id: marketId });
  }, [marketWs.subscribe]);
  
  const unsubscribeMarket = useCallback((marketId: string) => {
    return marketWs.unsubscribe(`market:${marketId}`);
  }, [marketWs.unsubscribe]);
  
  // Refresh data (request fresh data from server)
  const refreshData = useCallback(() => {
    marketWs.send({ type: 'refresh' });
    arbWs.send({ type: 'status' });
  }, [marketWs.send, arbWs.send]);
  
  // Context value
  const value: MarketDataContextValue = {
    // Connection status
    isConnected: marketWs.isConnected,
    isArbitrageConnected: arbWs.isConnected,
    connectionState: marketWs.connectionState,
    arbitrageConnectionState: arbWs.connectionState,
    latency: marketWs.latency,
    
    // Polymarket data
    polymarketPrices: marketWs.priceUpdates,
    polymarketOrderbooks: marketWs.orderbooks,
    polymarketTrades: marketWs.trades,
    
    // Limitless data
    limitlessPools: marketWs.limitlessPools,
    limitlessPrices: marketWs.limitlessPrices,
    
    // Arbitrage data
    arbitrageOpportunities: arbWs.opportunities,
    arbitrageSignals: arbWs.signals,
    arbitrageAlerts: arbWs.alerts,
    arbitrageStatus: arbWs.status,
    
    // Metrics
    messageCount: marketWs.messageCount + (arbWs as any).messageCount,
    lastUpdateTime,
    dataFreshnessMs,
    
    // Actions
    connect,
    disconnect,
    subscribeMarket,
    unsubscribeMarket,
    acknowledgeAlert: arbWs.acknowledgeAlert,
    refreshData,
  };
  
  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMarketData(): MarketDataContextValue {
  const context = useContext(MarketDataContext);
  
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  
  return context;
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get Polymarket price for a specific token
 */
export function usePolymarketPrice(tokenId: string): PolymarketPriceUpdate | undefined {
  const { polymarketPrices } = useMarketData();
  return polymarketPrices.get(tokenId);
}

/**
 * Get Polymarket orderbook for a specific token
 */
export function usePolymarketOrderbook(tokenId: string): PolymarketOrderBook | undefined {
  const { polymarketOrderbooks } = useMarketData();
  return polymarketOrderbooks.get(tokenId);
}

/**
 * Get recent trades
 */
export function useRecentTrades(limit: number = 10): PolymarketTrade[] {
  const { polymarketTrades } = useMarketData();
  return polymarketTrades.slice(0, limit);
}

/**
 * Get Limitless pools
 */
export function useLimitlessPools(): LimitlessPool[] {
  const { limitlessPools } = useMarketData();
  return limitlessPools;
}

/**
 * Get Limitless prices
 */
export function useLimitlessPrices(): LimitlessPrice[] {
  const { limitlessPrices } = useMarketData();
  return limitlessPrices;
}

/**
 * Get arbitrage opportunities sorted by profit
 */
export function useArbitrageOpportunities(): any[] {
  const { arbitrageOpportunities } = useMarketData();
  return arbitrageOpportunities;
}

/**
 * Get active arbitrage signals
 */
export function useArbitrageSignals(): any[] {
  const { arbitrageSignals } = useMarketData();
  return arbitrageSignals;
}

/**
 * Get unread arbitrage alerts
 */
export function useArbitrageAlerts(): any[] {
  const { arbitrageAlerts } = useMarketData();
  return arbitrageAlerts;
}

/**
 * Get connection status
 */
export function useConnectionStatus() {
  const { 
    isConnected, 
    isArbitrageConnected, 
    connectionState, 
    arbitrageConnectionState,
    latency 
  } = useMarketData();
  
  return {
    isConnected,
    isArbitrageConnected,
    connectionState,
    arbitrageConnectionState,
    latency,
    isFullyConnected: isConnected && isArbitrageConnected,
  };
}

/**
 * Get data freshness metrics
 */
export function useDataFreshness() {
  const { lastUpdateTime, dataFreshnessMs, messageCount } = useMarketData();
  
  return {
    lastUpdateTime,
    dataFreshnessMs,
    messageCount,
    isStale: dataFreshnessMs !== null && dataFreshnessMs > 5000,
    isVeryStale: dataFreshnessMs !== null && dataFreshnessMs > 30000,
  };
}

export default MarketDataContext;
