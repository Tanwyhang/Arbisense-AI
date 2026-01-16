"""
Polymarket WebSocket Service
Real-time market data streaming from Polymarket CLOB
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass, field
import os

logger = logging.getLogger(__name__)

# Polymarket WebSocket endpoints
POLYMARKET_WS_URL = os.getenv("POLYMARKET_WS_URL", "wss://clob.polymarket.com/ws")
POLYMARKET_REST_URL = os.getenv("POLYMARKET_REST_URL", "https://gamma-api.polymarket.com")


@dataclass
class PolymarketMarket:
    """Polymarket market data"""
    id: str
    condition_id: str
    question: str
    slug: str
    tokens: List[Dict]
    liquidity: float = 0.0
    volume: float = 0.0
    volume_24h: float = 0.0
    active: bool = True
    closed: bool = False
    end_date_iso: str = ""
    updated_at: str = ""


@dataclass
class PolymarketOrderBook:
    """Order book for a Polymarket token"""
    market_id: str
    token_id: str
    outcome: str  # 'Yes' or 'No'
    bids: List[Dict] = field(default_factory=list)
    asks: List[Dict] = field(default_factory=list)
    spread: float = 0.0
    mid_price: float = 0.0
    updated_at: int = 0


@dataclass
class PolymarketTrade:
    """Trade event from Polymarket"""
    id: str
    market_id: str
    token_id: str
    outcome: str
    side: str
    price: float
    size: float
    maker: str
    taker: str
    timestamp: int


class PolymarketWebSocketService:
    """
    Polymarket WebSocket client for real-time data streaming.
    
    Connects to Polymarket CLOB and subscribes to:
    - Market updates
    - Order book changes
    - Trade events
    """
    
    def __init__(self, ws_manager=None):
        self.ws_manager = ws_manager
        self.websocket = None
        self.connected = False
        
        # Data caches
        self.markets: Dict[str, PolymarketMarket] = {}
        self.orderbooks: Dict[str, PolymarketOrderBook] = {}
        self.recent_trades: List[PolymarketTrade] = []
        self.max_trades = 100
        
        # Price tracking for change detection
        self.last_prices: Dict[str, float] = {}
        
        # Subscriptions
        self.subscribed_markets: set = set()
        
        # Callbacks
        self.on_price_update: Optional[Callable] = None
        self.on_orderbook_update: Optional[Callable] = None
        self.on_trade: Optional[Callable] = None
        
        # Message sequence for debugging
        self._message_count = 0
    
    async def connect(self):
        """Connect to Polymarket WebSocket"""
        try:
            import websockets
            
            logger.info(f"Connecting to Polymarket WebSocket: {POLYMARKET_WS_URL}")
            
            self.websocket = await websockets.connect(
                POLYMARKET_WS_URL,
                ping_interval=30,
                ping_timeout=10,
                close_timeout=5
            )
            
            self.connected = True
            logger.info("Connected to Polymarket WebSocket")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Polymarket: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Polymarket WebSocket"""
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception:
                pass
            self.websocket = None
        self.connected = False
        logger.info("Disconnected from Polymarket WebSocket")
    
    async def subscribe_market(self, market_id: str, token_ids: List[str] = None):
        """Subscribe to market updates"""
        if not self.connected or not self.websocket:
            logger.warning("Cannot subscribe: not connected")
            return False
        
        try:
            # Polymarket subscription format
            sub_msg = {
                "type": "subscribe",
                "channel": "market",
                "market": market_id
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            self.subscribed_markets.add(market_id)
            
            # Subscribe to order book if token IDs provided
            if token_ids:
                for token_id in token_ids:
                    await self.subscribe_orderbook(token_id)
            
            logger.info(f"Subscribed to market: {market_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to market {market_id}: {e}")
            return False
    
    async def subscribe_orderbook(self, token_id: str):
        """Subscribe to order book updates for a token"""
        if not self.connected or not self.websocket:
            return False
        
        try:
            sub_msg = {
                "type": "subscribe",
                "channel": "book",
                "asset_id": token_id
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            logger.debug(f"Subscribed to orderbook: {token_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to orderbook {token_id}: {e}")
            return False
    
    async def subscribe_trades(self, token_id: str):
        """Subscribe to trade events for a token"""
        if not self.connected or not self.websocket:
            return False
        
        try:
            sub_msg = {
                "type": "subscribe",
                "channel": "trades",
                "asset_id": token_id
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            logger.debug(f"Subscribed to trades: {token_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to trades {token_id}: {e}")
            return False
    
    async def receive_messages(self):
        """Main message receiving loop"""
        if not self.connected or not self.websocket:
            return
        
        try:
            async for message in self.websocket:
                self._message_count += 1
                
                try:
                    data = json.loads(message)
                    await self._process_message(data)
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON from Polymarket: {e}")
                except Exception as e:
                    logger.error(f"Error processing Polymarket message: {e}")
                    
        except Exception as e:
            logger.warning(f"Polymarket connection lost: {e}")
            self.connected = False
    
    async def _process_message(self, data: dict) -> Optional[dict]:
        """Process incoming WebSocket message and return formatted data"""
        msg_type = data.get("type") or data.get("event_type")
        
        if msg_type == "price_change":
            return await self._handle_price_change(data)
        
        elif msg_type == "book":
            return await self._handle_orderbook_update(data)
        
        elif msg_type == "trade":
            return await self._handle_trade(data)
        
        elif msg_type == "market":
            return await self._handle_market_update(data)
        
        elif msg_type in ("connected", "subscribed", "pong"):
            logger.debug(f"Polymarket control message: {msg_type}")
            return None
        
        else:
            logger.debug(f"Unknown Polymarket message type: {msg_type}")
            return None
    
    async def _handle_price_change(self, data: dict) -> dict:
        """Handle price change event"""
        token_id = data.get("asset_id")
        price = float(data.get("price", 0))
        
        prev_price = self.last_prices.get(token_id, price)
        self.last_prices[token_id] = price
        
        change_pct = ((price - prev_price) / prev_price * 100) if prev_price > 0 else 0
        
        result = {
            "type": "price_update",
            "platform": "polymarket",
            "data": {
                "token_id": token_id,
                "market_id": data.get("market"),
                "price": price,
                "prev_price": prev_price,
                "change_pct": round(change_pct, 4),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
        
        if self.on_price_update:
            await self.on_price_update(result["data"])
        
        return result
    
    async def _handle_orderbook_update(self, data: dict) -> dict:
        """Handle order book update"""
        token_id = data.get("asset_id")
        
        bids = data.get("bids", [])
        asks = data.get("asks", [])
        
        # Calculate spread and mid price
        best_bid = float(bids[0]["price"]) if bids else 0
        best_ask = float(asks[0]["price"]) if asks else 1
        spread = best_ask - best_bid
        mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else 0
        
        # Update cache
        self.orderbooks[token_id] = PolymarketOrderBook(
            market_id=data.get("market", ""),
            token_id=token_id,
            outcome="Yes" if "yes" in token_id.lower() else "No",
            bids=[{"price": float(b["price"]), "size": float(b["size"])} for b in bids[:10]],
            asks=[{"price": float(a["price"]), "size": float(a["size"])} for a in asks[:10]],
            spread=spread,
            mid_price=mid_price,
            updated_at=int(datetime.now().timestamp() * 1000)
        )
        
        result = {
            "type": "orderbook_update",
            "platform": "polymarket",
            "data": {
                "token_id": token_id,
                "market_id": data.get("market"),
                "bids": self.orderbooks[token_id].bids,
                "asks": self.orderbooks[token_id].asks,
                "spread": round(spread, 4),
                "mid_price": round(mid_price, 4),
                "timestamp": self.orderbooks[token_id].updated_at
            }
        }
        
        if self.on_orderbook_update:
            await self.on_orderbook_update(result["data"])
        
        return result
    
    async def _handle_trade(self, data: dict) -> dict:
        """Handle trade event"""
        trade = PolymarketTrade(
            id=data.get("id", str(self._message_count)),
            market_id=data.get("market", ""),
            token_id=data.get("asset_id", ""),
            outcome=data.get("outcome", "Yes"),
            side=data.get("side", "buy"),
            price=float(data.get("price", 0)),
            size=float(data.get("size", 0)),
            maker=data.get("maker", ""),
            taker=data.get("taker", ""),
            timestamp=int(data.get("timestamp", datetime.now().timestamp() * 1000))
        )
        
        # Add to recent trades (maintain max size)
        self.recent_trades.insert(0, trade)
        if len(self.recent_trades) > self.max_trades:
            self.recent_trades.pop()
        
        result = {
            "type": "trade",
            "platform": "polymarket",
            "data": {
                "id": trade.id,
                "market_id": trade.market_id,
                "token_id": trade.token_id,
                "outcome": trade.outcome,
                "side": trade.side,
                "price": trade.price,
                "size": trade.size,
                "timestamp": trade.timestamp
            }
        }
        
        if self.on_trade:
            await self.on_trade(result["data"])
        
        return result
    
    async def _handle_market_update(self, data: dict) -> dict:
        """Handle market update"""
        market_id = data.get("id") or data.get("market_id")
        
        result = {
            "type": "market_update",
            "platform": "polymarket",
            "data": {
                "market_id": market_id,
                "question": data.get("question", ""),
                "liquidity": float(data.get("liquidity", 0)),
                "volume": float(data.get("volume", 0)),
                "active": data.get("active", True),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
        
        return result
    
    def get_orderbook(self, token_id: str) -> Optional[PolymarketOrderBook]:
        """Get cached order book for a token"""
        return self.orderbooks.get(token_id)
    
    def get_recent_trades(self, limit: int = 10) -> List[PolymarketTrade]:
        """Get recent trades"""
        return self.recent_trades[:limit]
    
    def get_status(self) -> dict:
        """Get service status"""
        return {
            "connected": self.connected,
            "subscribed_markets": list(self.subscribed_markets),
            "cached_orderbooks": len(self.orderbooks),
            "recent_trades_count": len(self.recent_trades),
            "message_count": self._message_count
        }


# Message handler for the WebSocket manager
async def polymarket_message_handler(data: dict) -> Optional[dict]:
    """
    Process incoming Polymarket WebSocket messages.
    This is called by the WebSocket manager for each message.
    """
    service = PolymarketWebSocketService()
    return await service._process_message(data)


# Singleton service instance
_polymarket_service: Optional[PolymarketWebSocketService] = None


def get_polymarket_service() -> PolymarketWebSocketService:
    """Get or create the Polymarket service singleton"""
    global _polymarket_service
    if _polymarket_service is None:
        _polymarket_service = PolymarketWebSocketService()
    return _polymarket_service
