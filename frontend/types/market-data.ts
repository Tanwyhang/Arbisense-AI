/**
 * Market Data Types
 * Live data structures for Polymarket & Limitless Exchange WebSocket feeds
 */

// ============================================================================
// POLYMARKET TYPES
// ============================================================================

export interface PolymarketMarket {
  id: string;
  condition_id: string;
  question: string;
  slug: string;
  
  // Token info
  tokens: {
    token_id: string;
    outcome: 'Yes' | 'No';
    price: number;
  }[];
  
  // Market metrics
  liquidity: number;
  volume: number;
  volume_24h: number;
  
  // Status
  active: boolean;
  closed: boolean;
  end_date_iso: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PolymarketOrderBookLevel {
  price: number;
  size: number;
}

export interface PolymarketOrderBook {
  market_id: string;
  token_id: string;
  outcome: 'Yes' | 'No';
  
  bids: PolymarketOrderBookLevel[];
  asks: PolymarketOrderBookLevel[];
  
  spread: number;
  mid_price: number;
  
  updated_at: number; // Unix timestamp ms
}

export interface PolymarketTrade {
  id: string;
  market_id: string;
  token_id: string;
  outcome: 'Yes' | 'No';
  
  side: 'buy' | 'sell';
  price: number;
  size: number;
  
  maker: string;
  taker: string;
  
  timestamp: number; // Unix timestamp ms
}

export interface PolymarketPriceUpdate {
  market_id: string;
  token_id: string;
  outcome: 'Yes' | 'No';
  
  price: number;
  prev_price: number;
  change_pct: number;
  
  timestamp: number;
}

// ============================================================================
// LIMITLESS EXCHANGE TYPES
// ============================================================================

export interface LimitlessPool {
  address: string;
  name: string;
  
  // Token pair
  token0: {
    address: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
  
  // Pool metrics
  tvl: number;
  volume_24h: number;
  volume_7d: number;
  
  // APR/APY
  apr: number;
  fee_tier: number; // In basis points (e.g., 30 = 0.3%)
  
  // Current prices
  token0_price: number;
  token1_price: number;
  
  updated_at: number;
}

export interface LimitlessPrice {
  pair: string;
  token0_symbol: string;
  token1_symbol: string;
  
  price: number;
  price_usd: number;
  
  change_1h: number;
  change_24h: number;
  change_7d: number;
  
  volume_24h: number;
  
  updated_at: number;
}

export interface LimitlessTrade {
  id: string;
  pool_address: string;
  
  type: 'swap' | 'mint' | 'burn';
  
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  
  price_impact: number;
  
  sender: string;
  tx_hash: string;
  
  timestamp: number;
}

// ============================================================================
// ARBITRAGE OPPORTUNITY TYPES
// ============================================================================

export interface ArbitrageOpportunity {
  id: string;
  
  // Market identifiers
  polymarket_market_id: string;
  polymarket_question: string;
  limitless_pool?: string; // Optional - may not always have a match
  
  // Platform prices
  polymarket_yes_price: number;
  polymarket_no_price: number;
  limitless_price?: number;
  
  // Arbitrage metrics
  spread_pct: number;
  spread_absolute: number;
  
  // Direction
  direction: 'poly_to_limitless' | 'limitless_to_poly' | 'poly_internal';
  action: 'buy_poly_yes' | 'buy_poly_no' | 'buy_limitless' | 'sell_limitless';
  
  // Profit calculation
  gross_profit_pct: number;
  estimated_gas_cost: number;
  platform_fees: number;
  net_profit_pct: number;
  net_profit_usd: number;
  
  // Execution feasibility
  min_size: number;
  max_size: number;
  available_liquidity: number;
  slippage_estimate: number;
  
  // Risk metrics
  confidence: number;
  risk_score: number; // 1-10
  
  // Timing
  discovered_at: number;
  expires_at?: number;
  time_sensitive: boolean;
  
  // Status
  status: 'active' | 'executing' | 'expired' | 'closed';
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export type WebSocketMessageType = 
  | 'price_update'
  | 'orderbook_update'
  | 'trade'
  | 'market_update'
  | 'pool_update'
  | 'limitless_update'
  | 'arbitrage_update'
  | 'arbitrage_signal'
  | 'connection_status'
  | 'subscribed'
  | 'pong'
  | 'error'
  | 'heartbeat';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  channel: string;
  data: T;
  timestamp: number;
  sequence?: number;
}

export interface WebSocketConnectionStatus {
  platform: 'polymarket' | 'limitless' | 'backend';
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  latency_ms?: number;
  last_message_at?: number;
  reconnect_attempt?: number;
  error_message?: string;
}

// ============================================================================
// AGGREGATED MARKET DATA STATE
// ============================================================================

export interface MarketDataState {
  // Polymarket data
  polymarket: {
    markets: Map<string, PolymarketMarket>;
    orderbooks: Map<string, PolymarketOrderBook>;
    recent_trades: PolymarketTrade[];
    price_updates: Map<string, PolymarketPriceUpdate>;
  };
  
  // Limitless data
  limitless: {
    pools: Map<string, LimitlessPool>;
    prices: Map<string, LimitlessPrice>;
    recent_trades: LimitlessTrade[];
  };
  
  // Connection status
  connections: {
    polymarket: WebSocketConnectionStatus;
    limitless: WebSocketConnectionStatus;
    backend: WebSocketConnectionStatus;
  };
  
  // Metadata
  last_updated: number;
  messages_received: number;
  data_freshness_ms: number;
}

// ============================================================================
// HISTORICAL DATA TYPES
// ============================================================================

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface HistoricalSpreadPoint {
  timestamp: number;
  spread_pct: number;
  polymarket_price: number;
  limitless_price: number;
}

export interface MarketHistory {
  market_id: string;
  resolution: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  data_points: HistoricalPricePoint[];
  period_start: number;
  period_end: number;
}
