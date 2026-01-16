'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  WebSocketMessage, 
  WebSocketConnectionStatus,
  PolymarketPriceUpdate,
  PolymarketOrderBook,
  PolymarketTrade,
  LimitlessPool,
  LimitlessPrice
} from '@/types/market-data';

// ============================================================================
// Connection States
// ============================================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export interface WebSocketState {
  connectionState: ConnectionState;
  latency: number | null;
  lastMessageAt: number | null;
  reconnectAttempts: number;
  errorMessage: string | null;
}

// ============================================================================
// Hook Options
// ============================================================================

export interface UseMarketDataWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event | Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<UseMarketDataWebSocketOptions> = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/market-data',
  autoConnect: true,
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  onConnect: () => {},
  onDisconnect: () => {},
  onError: () => {},
  onMessage: () => {},
};

// ============================================================================
// Main Hook
// ============================================================================

export function useMarketDataWebSocket(options: UseMarketDataWebSocketOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimestampRef = useRef<number>(0);
  
  // State
  const [wsState, setWsState] = useState<WebSocketState>({
    connectionState: 'disconnected',
    latency: null,
    lastMessageAt: null,
    reconnectAttempts: 0,
    errorMessage: null,
  });
  
  // Market data state
  const [priceUpdates, setPriceUpdates] = useState<Map<string, PolymarketPriceUpdate>>(new Map());
  const [orderbooks, setOrderbooks] = useState<Map<string, PolymarketOrderBook>>(new Map());
  const [trades, setTrades] = useState<PolymarketTrade[]>([]);
  const [limitlessPools, setLimitlessPools] = useState<LimitlessPool[]>([]);
  const [limitlessPrices, setLimitlessPrices] = useState<LimitlessPrice[]>([]);
  
  // Message counters
  const [messageCount, setMessageCount] = useState(0);
  
  // =========================================================================
  // Connection Management
  // =========================================================================
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setWsState(prev => ({ ...prev, connectionState: 'connecting', errorMessage: null }));
    
    try {
      const ws = new WebSocket(opts.url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setWsState(prev => ({
          ...prev,
          connectionState: 'connected',
          reconnectAttempts: 0,
          errorMessage: null,
        }));
        
        // Start heartbeat
        startHeartbeat();
        
        opts.onConnect();
      };
      
      ws.onclose = (event) => {
        setWsState(prev => ({ ...prev, connectionState: 'disconnected' }));
        stopHeartbeat();
        opts.onDisconnect();
        
        // Attempt reconnection
        if (opts.reconnect && wsState.reconnectAttempts < opts.maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
      
      ws.onerror = (error) => {
        setWsState(prev => ({
          ...prev,
          connectionState: 'error',
          errorMessage: 'WebSocket connection error',
        }));
        opts.onError(error);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleMessage(message);
          
          setWsState(prev => ({
            ...prev,
            lastMessageAt: Date.now(),
          }));
          
          setMessageCount(prev => prev + 1);
          opts.onMessage(message);
          
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };
      
    } catch (error) {
      setWsState(prev => ({
        ...prev,
        connectionState: 'error',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [opts.url, opts.reconnect, opts.maxReconnectAttempts, wsState.reconnectAttempts]);
  
  const disconnect = useCallback(() => {
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setWsState(prev => ({ ...prev, connectionState: 'disconnected' }));
  }, []);
  
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return;
    }
    
    setWsState(prev => ({
      ...prev,
      connectionState: 'reconnecting',
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, opts.reconnectInterval);
  }, [connect, opts.reconnectInterval]);
  
  // =========================================================================
  // Heartbeat
  // =========================================================================
  
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimestampRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, opts.heartbeatInterval);
  }, [opts.heartbeatInterval]);
  
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);
  
  // =========================================================================
  // Message Handling
  // =========================================================================
  
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'price_update':
        handlePriceUpdate(message.data as PolymarketPriceUpdate);
        break;
        
      case 'orderbook_update':
        handleOrderbookUpdate(message.data as PolymarketOrderBook);
        break;
        
      case 'trade':
        handleTrade(message.data as PolymarketTrade);
        break;
        
      case 'pool_update':
      case 'limitless_update':
        handleLimitlessUpdate(message.data as any);
        break;
        
      case 'connection_status':
        // Handle connection status messages
        break;
        
      case 'heartbeat':
      case 'pong':
        // Calculate latency
        if (pingTimestampRef.current > 0) {
          const latency = Date.now() - pingTimestampRef.current;
          setWsState(prev => ({ ...prev, latency }));
        }
        break;
        
      default:
        console.debug('Unknown message type:', message.type);
    }
  }, []);
  
  const handlePriceUpdate = useCallback((data: PolymarketPriceUpdate) => {
    setPriceUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(data.token_id, data);
      return newMap;
    });
  }, []);
  
  const handleOrderbookUpdate = useCallback((data: PolymarketOrderBook) => {
    setOrderbooks(prev => {
      const newMap = new Map(prev);
      newMap.set(data.token_id, data);
      return newMap;
    });
  }, []);
  
  const handleTrade = useCallback((data: PolymarketTrade) => {
    setTrades(prev => {
      const newTrades = [data, ...prev];
      return newTrades.slice(0, 100); // Keep last 100 trades
    });
  }, []);
  
  const handleLimitlessUpdate = useCallback((data: any) => {
    if (data.pools) {
      setLimitlessPools(data.pools);
    }
    if (data.prices) {
      setLimitlessPrices(data.prices);
    }
  }, []);
  
  // =========================================================================
  // Subscription Management
  // =========================================================================
  
  const subscribe = useCallback((channel: string, params?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel,
        ...params,
      }));
      return true;
    }
    return false;
  }, []);
  
  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }));
      return true;
    }
    return false;
  }, []);
  
  // =========================================================================
  // Send Raw Message
  // =========================================================================
  
  const send = useCallback((message: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // =========================================================================
  // Lifecycle
  // =========================================================================
  
  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [opts.autoConnect]); // Only depend on autoConnect to avoid reconnecting on every render
  
  // =========================================================================
  // Return Value
  // =========================================================================
  
  return {
    // Connection state
    ...wsState,
    isConnected: wsState.connectionState === 'connected',
    
    // Market data
    priceUpdates,
    orderbooks,
    trades,
    limitlessPools,
    limitlessPrices,
    
    // Metrics
    messageCount,
    
    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
  };
}

// ============================================================================
// Arbitrage WebSocket Hook
// ============================================================================

export interface ArbitrageData {
  opportunities: any[];
  signals: any[];
  alerts: any[];
  status: any;
}

export function useArbitrageWebSocket(options: Omit<UseMarketDataWebSocketOptions, 'url'> = {}) {
  const url = process.env.NEXT_PUBLIC_ARBITRAGE_WS_URL || 'ws://localhost:8000/ws/arbitrage';
  
  const [arbitrageData, setArbitrageData] = useState<ArbitrageData>({
    opportunities: [],
    signals: [],
    alerts: [],
    status: {},
  });
  
  const handleArbitrageMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'arbitrage_update') {
      const data = message.data as any;
      setArbitrageData({
        opportunities: data.opportunities || [],
        signals: data.signals || [],
        alerts: data.alerts || [],
        status: data.status || {},
      });
    }
  }, []);
  
  const ws = useMarketDataWebSocket({
    ...options,
    url,
    onMessage: (message) => {
      handleArbitrageMessage(message);
      options.onMessage?.(message);
    },
  });
  
  const acknowledgeAlert = useCallback((alertId: string) => {
    ws.send({
      type: 'acknowledge_alert',
      alert_id: alertId,
    });
  }, [ws.send]);
  
  return {
    ...ws,
    ...arbitrageData,
    acknowledgeAlert,
  };
}

export default useMarketDataWebSocket;
