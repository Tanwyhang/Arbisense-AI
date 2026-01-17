"""
Polymarket WebSocket Service
Real-time market data streaming from Polymarket CLOB

Based on Polymarket WebSocket Documentation:
1. CLOB WebSocket (wss://ws-subscriptions-clob.polymarket.com/ws/)
   - Market channel: Real-time orderbook updates, price changes, last trade prices (public)
   - User channel: Order fills and cancellations (requires authentication)

2. RTDS (wss://ws-live-data.polymarket.com)
   - Real-time crypto prices and comments
   - Supports dynamic subscriptions without disconnecting

3. Sports WebSocket (wss://sports-api.polymarket.com/ws)
   - Auto-broadcasts all sports updates
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import os

logger = logging.getLogger(__name__)


# ==============================================================================
# Polymarket WebSocket Endpoints
# ==============================================================================

# CLOB WebSocket - Real-time orderbook updates and order status
# Note: "market" and "user" are subscription channels, not URL paths
POLYMARKET_CLOB_WS_URL = os.getenv(
    "POLYMARKET_CLOB_WS_URL", 
    "wss://ws-subscriptions-clob.polymarket.com/ws/"
)

# RTDS - Real-time data stream for crypto prices and comments
POLYMARKET_RTDS_WS_URL = os.getenv(
    "POLYMARKET_RTDS_WS_URL",
    "wss://ws-live-data.polymarket.com"
)

# Sports WebSocket (if applicable)
POLYMARKET_SPORTS_WS_URL = os.getenv(
    "POLYMARKET_SPORTS_WS_URL",
    "wss://sports-api.polymarket.com/ws"
)

# REST APIs
POLYMARKET_CLOB_API_URL = os.getenv(
    "POLYMARKET_CLOB_API_URL",
    "https://clob.polymarket.com"
)

POLYMARKET_REST_URL = os.getenv(
    "POLYMARKET_REST_URL", 
    "https://gamma-api.polymarket.com"
)

POLYMARKET_DATA_API_URL = os.getenv(
    "POLYMARKET_DATA_API_URL",
    "https://data-api.polymarket.com"
)


# ==============================================================================
# Message Types (CLOB WebSocket)
# ==============================================================================

class CLOBMessageType(Enum):
    """CLOB WebSocket message types"""
    # Market channel messages
    BOOK = "book"                      # Orderbook snapshot/update
    PRICE_CHANGE = "price_change"      # Price change event
    TICK_SIZE_CHANGE = "tick_size_change"  # Tick size change
    LAST_TRADE_PRICE = "last_trade_price"  # Last trade price
    BEST_BID_ASK = "best_bid_ask"      # Best bid/ask update
    NEW_MARKET = "new_market"          # New market created
    MARKET_RESOLVED = "market_resolved"  # Market resolved
    
    # User channel messages (authenticated)
    TRADE = "trade"                    # Trade event (user channel)
    ORDER = "order"                    # Order placement/update/cancellation


class OrderEventType(Enum):
    """Order event types (User channel)"""
    PLACEMENT = "PLACEMENT"
    UPDATE = "UPDATE"
    CANCELLATION = "CANCELLATION"


# ==============================================================================
# Data Classes
# ==============================================================================

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
    best_bid: float = 0.0
    best_ask: float = 0.0
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


@dataclass
class PolymarketPrice:
    """Price update from Polymarket"""
    token_id: str
    market_id: str
    price: float
    prev_price: float
    change_pct: float
    timestamp: int


@dataclass
class PolymarketAuth:
    """Authentication for User channel"""
    api_key: str
    secret: str
    passphrase: str


# ==============================================================================
# CLOB WebSocket Service
# ==============================================================================

class PolymarketCLOBService:
    """
    Polymarket CLOB WebSocket client for real-time data streaming.
    
    Connects to CLOB WebSocket (wss://ws-subscriptions-clob.polymarket.com/ws/)
    
    Channels:
    - Market channel (public): orderbook updates, price changes, trades
    - User channel (authenticated): order fills, cancellations
    
    Heartbeat: Send PING every ~10 seconds; server responds with PONG.
    """
    
    # Heartbeat interval in seconds (Polymarket recommends ~10 seconds)
    HEARTBEAT_INTERVAL = 10
    
    def __init__(self, ws_manager=None, auth: Optional[PolymarketAuth] = None):
        self.ws_manager = ws_manager
        self.auth = auth
        self.websocket = None
        self.connected = False
        
        # Data caches
        self.markets: Dict[str, PolymarketMarket] = {}
        self.orderbooks: Dict[str, PolymarketOrderBook] = {}
        self.recent_trades: List[PolymarketTrade] = []
        self.prices: Dict[str, PolymarketPrice] = {}
        self.max_trades = 100
        
        # Subscriptions
        self.subscribed_assets: set = set()  # asset_ids (token IDs)
        self.subscribed_markets: set = set()  # condition_ids (for user channel)
        
        # Callbacks
        self.on_price_update: Optional[Callable] = None
        self.on_orderbook_update: Optional[Callable] = None
        self.on_trade: Optional[Callable] = None
        self.on_order_update: Optional[Callable] = None
        
        # Background tasks
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._receive_task: Optional[asyncio.Task] = None
        
        # Message sequence for debugging
        self._message_count = 0
        self._last_message_at: Optional[datetime] = None
    
    async def connect(self) -> bool:
        """Connect to Polymarket CLOB WebSocket"""
        try:
            import websockets
            import ssl
            
            logger.info(f"Connecting to Polymarket CLOB: {POLYMARKET_CLOB_WS_URL}")
            
            # Create SSL context - try to use certifi for macOS compatibility
            ssl_context = ssl.create_default_context()
            try:
                import certifi
                ssl_context.load_verify_locations(certifi.where())
            except ImportError:
                # certifi not available, use system certificates
                pass
            
            self.websocket = await websockets.connect(
                POLYMARKET_CLOB_WS_URL,
                ping_interval=None,  # We handle ping/pong manually
                ping_timeout=None,
                close_timeout=5,
                ssl=ssl_context
            )
            
            self.connected = True
            logger.info("Connected to Polymarket CLOB WebSocket")
            
            # Start heartbeat
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Polymarket CLOB: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Polymarket WebSocket"""
        # Cancel background tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
            self._heartbeat_task = None
        
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None
        
        # Close websocket
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception:
                pass
            self.websocket = None
        
        self.connected = False
        logger.info("Disconnected from Polymarket CLOB WebSocket")
    
    async def _heartbeat_loop(self):
        """Send PING messages every 10 seconds to keep connection alive"""
        while self.connected and self.websocket:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                
                if self.websocket:
                    # Send PING message
                    await self.websocket.send("PING")
                    logger.debug("Sent PING to Polymarket CLOB")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Heartbeat error: {e}")
    
    # ==========================================================================
    # Market Channel Subscriptions (Public)
    # ==========================================================================
    
    async def subscribe_market(self, asset_ids: List[str], custom_feature_enabled: bool = True) -> bool:
        """
        Subscribe to Market channel for given token IDs (asset_ids).
        
        Args:
            asset_ids: List of token IDs to subscribe to
            custom_feature_enabled: Enable custom features (default True)
        
        Messages received:
            - book: Orderbook snapshot/update
            - price_change: Price change event
            - tick_size_change: Tick size change
            - last_trade_price: Last trade price
            - best_bid_ask: Best bid/ask update
            - new_market: New market created
            - market_resolved: Market resolved
        """
        if not self.connected or not self.websocket:
            logger.warning("Cannot subscribe: not connected")
            return False
        
        try:
            # Polymarket CLOB subscription format
            sub_msg = {
                "type": "market",
                "assets_ids": asset_ids,
                "custom_feature_enabled": custom_feature_enabled
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            self.subscribed_assets.update(asset_ids)
            
            logger.info(f"Subscribed to market channel for {len(asset_ids)} assets")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to market channel: {e}")
            return False
    
    async def subscribe_assets_dynamic(self, asset_ids: List[str]) -> bool:
        """
        Dynamically subscribe to additional assets without disconnecting.
        
        Uses the 'subscribe' operation for dynamic subscriptions.
        """
        if not self.connected or not self.websocket:
            return False
        
        try:
            sub_msg = {
                "assets_ids": asset_ids,
                "operation": "subscribe"
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            self.subscribed_assets.update(asset_ids)
            
            logger.info(f"Dynamically subscribed to {len(asset_ids)} assets")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe dynamically: {e}")
            return False
    
    async def unsubscribe_assets(self, asset_ids: List[str]) -> bool:
        """
        Unsubscribe from assets.
        
        Uses the 'unsubscribe' operation.
        """
        if not self.connected or not self.websocket:
            return False
        
        try:
            unsub_msg = {
                "assets_ids": asset_ids,
                "operation": "unsubscribe"
            }
            
            await self.websocket.send(json.dumps(unsub_msg))
            self.subscribed_assets.difference_update(asset_ids)
            
            logger.info(f"Unsubscribed from {len(asset_ids)} assets")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe: {e}")
            return False
    
    # ==========================================================================
    # User Channel Subscriptions (Authenticated)
    # ==========================================================================
    
    async def subscribe_user(self, market_ids: List[str]) -> bool:
        """
        Subscribe to User channel for authenticated updates.
        
        Requires authentication credentials.
        
        Args:
            market_ids: List of condition IDs to subscribe to
        
        Messages received:
            - trade: Trade event (fill)
            - order: Order placement/update/cancellation
        """
        if not self.connected or not self.websocket:
            logger.warning("Cannot subscribe: not connected")
            return False
        
        if not self.auth:
            logger.warning("Cannot subscribe to user channel: no authentication")
            return False
        
        try:
            # User channel subscription with authentication
            sub_msg = {
                "type": "user",
                "markets": market_ids,
                "auth": {
                    "apiKey": self.auth.api_key,
                    "secret": self.auth.secret,
                    "passphrase": self.auth.passphrase
                }
            }
            
            await self.websocket.send(json.dumps(sub_msg))
            self.subscribed_markets.update(market_ids)
            
            logger.info(f"Subscribed to user channel for {len(market_ids)} markets")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to user channel: {e}")
            return False
    
    # ==========================================================================
    # Message Receiving
    # ==========================================================================
    
    async def receive_messages(self):
        """Main message receiving loop"""
        if not self.connected or not self.websocket:
            return
        
        try:
            async for message in self.websocket:
                self._message_count += 1
                self._last_message_at = datetime.now()
                
                # Handle PONG response
                if message == "PONG":
                    logger.debug("Received PONG from Polymarket CLOB")
                    continue
                
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
        
        # Market channel messages
        if msg_type == CLOBMessageType.BOOK.value:
            return await self._handle_orderbook(data)
        
        elif msg_type == CLOBMessageType.PRICE_CHANGE.value:
            return await self._handle_price_change(data)
        
        elif msg_type == CLOBMessageType.LAST_TRADE_PRICE.value:
            return await self._handle_last_trade_price(data)
        
        elif msg_type == CLOBMessageType.BEST_BID_ASK.value:
            return await self._handle_best_bid_ask(data)
        
        elif msg_type == CLOBMessageType.TICK_SIZE_CHANGE.value:
            return await self._handle_tick_size_change(data)
        
        elif msg_type == CLOBMessageType.NEW_MARKET.value:
            return await self._handle_new_market(data)
        
        elif msg_type == CLOBMessageType.MARKET_RESOLVED.value:
            return await self._handle_market_resolved(data)
        
        # User channel messages
        elif msg_type == CLOBMessageType.TRADE.value:
            return await self._handle_trade(data)
        
        elif msg_type == CLOBMessageType.ORDER.value:
            return await self._handle_order(data)
        
        # Control messages
        elif msg_type in ("connected", "subscribed", "pong", "ack"):
            logger.debug(f"Polymarket control message: {msg_type}")
            return None
        
        else:
            logger.debug(f"Unknown Polymarket message type: {msg_type}")
            return None
    
    # ==========================================================================
    # Message Handlers
    # ==========================================================================
    
    async def _handle_orderbook(self, data: dict) -> dict:
        """Handle orderbook snapshot/update"""
        asset_id = data.get("asset_id")
        market_id = data.get("market") or data.get("condition_id")
        
        bids = data.get("bids", [])
        asks = data.get("asks", [])
        
        # Parse bids and asks
        parsed_bids = [{"price": float(b.get("price", 0)), "size": float(b.get("size", 0))} for b in bids[:10]]
        parsed_asks = [{"price": float(a.get("price", 0)), "size": float(a.get("size", 0))} for a in asks[:10]]
        
        # Calculate spread and mid price
        best_bid = parsed_bids[0]["price"] if parsed_bids else 0
        best_ask = parsed_asks[0]["price"] if parsed_asks else 1
        spread = best_ask - best_bid
        mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else 0
        
        # Update cache
        self.orderbooks[asset_id] = PolymarketOrderBook(
            market_id=market_id or "",
            token_id=asset_id,
            outcome="Yes" if data.get("outcome") == "Yes" else "No",
            bids=parsed_bids,
            asks=parsed_asks,
            spread=spread,
            mid_price=mid_price,
            best_bid=best_bid,
            best_ask=best_ask,
            updated_at=int(datetime.now().timestamp() * 1000)
        )
        
        result = {
            "type": "orderbook_update",
            "platform": "polymarket",
            "data": {
                "token_id": asset_id,
                "market_id": market_id,
                "bids": parsed_bids,
                "asks": parsed_asks,
                "spread": round(spread, 4),
                "mid_price": round(mid_price, 4),
                "best_bid": best_bid,
                "best_ask": best_ask,
                "timestamp": self.orderbooks[asset_id].updated_at
            }
        }
        
        if self.on_orderbook_update:
            await self.on_orderbook_update(result["data"])
        
        return result
    
    async def _handle_price_change(self, data: dict) -> dict:
        """Handle price change event"""
        asset_id = data.get("asset_id")
        market_id = data.get("market") or data.get("condition_id")
        price = float(data.get("price", 0))
        
        # Get previous price
        prev_price = self.prices.get(asset_id, PolymarketPrice(
            token_id=asset_id, market_id=market_id or "", 
            price=price, prev_price=price, change_pct=0, timestamp=0
        )).price
        
        change_pct = ((price - prev_price) / prev_price * 100) if prev_price > 0 else 0
        timestamp = int(datetime.now().timestamp() * 1000)
        
        # Update cache
        self.prices[asset_id] = PolymarketPrice(
            token_id=asset_id,
            market_id=market_id or "",
            price=price,
            prev_price=prev_price,
            change_pct=change_pct,
            timestamp=timestamp
        )
        
        result = {
            "type": "price_update",
            "platform": "polymarket",
            "data": {
                "token_id": asset_id,
                "market_id": market_id,
                "price": price,
                "prev_price": prev_price,
                "change_pct": round(change_pct, 4),
                "timestamp": timestamp
            }
        }
        
        if self.on_price_update:
            await self.on_price_update(result["data"])
        
        return result
    
    async def _handle_last_trade_price(self, data: dict) -> dict:
        """Handle last trade price update"""
        asset_id = data.get("asset_id")
        market_id = data.get("market") or data.get("condition_id")
        price = float(data.get("price", 0))
        
        result = {
            "type": "last_trade_price",
            "platform": "polymarket",
            "data": {
                "token_id": asset_id,
                "market_id": market_id,
                "price": price,
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
        
        return result
    
    async def _handle_best_bid_ask(self, data: dict) -> dict:
        """Handle best bid/ask update"""
        asset_id = data.get("asset_id")
        
        result = {
            "type": "best_bid_ask",
            "platform": "polymarket",
            "data": {
                "token_id": asset_id,
                "best_bid": float(data.get("best_bid", 0)),
                "best_ask": float(data.get("best_ask", 0)),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
        
        # Update orderbook cache if exists
        if asset_id in self.orderbooks:
            self.orderbooks[asset_id].best_bid = result["data"]["best_bid"]
            self.orderbooks[asset_id].best_ask = result["data"]["best_ask"]
        
        return result
    
    async def _handle_tick_size_change(self, data: dict) -> dict:
        """Handle tick size change"""
        return {
            "type": "tick_size_change",
            "platform": "polymarket",
            "data": {
                "asset_id": data.get("asset_id"),
                "old_tick_size": data.get("old_tick_size"),
                "new_tick_size": data.get("new_tick_size"),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
    
    async def _handle_new_market(self, data: dict) -> dict:
        """Handle new market creation"""
        return {
            "type": "new_market",
            "platform": "polymarket",
            "data": {
                "market_id": data.get("condition_id"),
                "question": data.get("question", ""),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
    
    async def _handle_market_resolved(self, data: dict) -> dict:
        """Handle market resolution"""
        return {
            "type": "market_resolved",
            "platform": "polymarket",
            "data": {
                "market_id": data.get("condition_id"),
                "outcome": data.get("outcome"),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
    
    async def _handle_trade(self, data: dict) -> dict:
        """Handle trade event (user channel)"""
        trade = PolymarketTrade(
            id=data.get("id", str(self._message_count)),
            market_id=data.get("market") or data.get("condition_id") or "",
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
    
    async def _handle_order(self, data: dict) -> dict:
        """Handle order event (user channel)"""
        event_type = data.get("event_type", "UPDATE")  # PLACEMENT, UPDATE, CANCELLATION
        
        result = {
            "type": "order",
            "platform": "polymarket",
            "data": {
                "order_id": data.get("order_id"),
                "event_type": event_type,
                "market_id": data.get("market") or data.get("condition_id"),
                "asset_id": data.get("asset_id"),
                "side": data.get("side"),
                "price": float(data.get("price", 0)),
                "size": float(data.get("size", 0)),
                "filled_size": float(data.get("filled_size", 0)),
                "status": data.get("status"),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }
        
        if self.on_order_update:
            await self.on_order_update(result["data"])
        
        return result
    
    # ==========================================================================
    # Accessors
    # ==========================================================================
    
    def get_orderbook(self, token_id: str) -> Optional[PolymarketOrderBook]:
        """Get cached order book for a token"""
        return self.orderbooks.get(token_id)
    
    def get_price(self, token_id: str) -> Optional[PolymarketPrice]:
        """Get cached price for a token"""
        return self.prices.get(token_id)
    
    def get_recent_trades(self, limit: int = 10) -> List[PolymarketTrade]:
        """Get recent trades"""
        return self.recent_trades[:limit]
    
    def get_status(self) -> dict:
        """Get service status"""
        return {
            "connected": self.connected,
            "endpoint": POLYMARKET_CLOB_WS_URL,
            "subscribed_assets": list(self.subscribed_assets),
            "subscribed_markets": list(self.subscribed_markets),
            "cached_orderbooks": len(self.orderbooks),
            "cached_prices": len(self.prices),
            "recent_trades_count": len(self.recent_trades),
            "message_count": self._message_count,
            "last_message_at": self._last_message_at.isoformat() if self._last_message_at else None,
            "heartbeat_interval": self.HEARTBEAT_INTERVAL
        }


# ==============================================================================
# RTDS WebSocket Service (Real-Time Data Socket)
# ==============================================================================

class PolymarketRTDSService:
    """
    Polymarket RTDS (Real-Time Data Socket) for crypto prices and comments.
    
    Endpoint: wss://ws-live-data.polymarket.com
    
    Topics:
    - crypto_prices: Binance symbols (e.g., btcusdt)
    - crypto_prices_chainlink: Chainlink symbols (e.g., eth/usd)
    - comments: Comment events
    
    Heartbeat: Send PING every 5 seconds
    """
    
    HEARTBEAT_INTERVAL = 5  # RTDS recommends 5 seconds
    
    def __init__(self):
        self.websocket = None
        self.connected = False
        self.subscriptions: Dict[str, List[str]] = {}  # topic -> symbols
        self.crypto_prices: Dict[str, float] = {}
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._message_count = 0
    
    async def connect(self) -> bool:
        """Connect to RTDS WebSocket"""
        try:
            import websockets
            
            logger.info(f"Connecting to Polymarket RTDS: {POLYMARKET_RTDS_WS_URL}")
            
            self.websocket = await websockets.connect(
                POLYMARKET_RTDS_WS_URL,
                ping_interval=None,
                ping_timeout=None,
                close_timeout=5
            )
            
            self.connected = True
            logger.info("Connected to Polymarket RTDS")
            
            # Start heartbeat
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to RTDS: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from RTDS"""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception:
                pass
        
        self.connected = False
    
    async def _heartbeat_loop(self):
        """Send PING every 5 seconds"""
        while self.connected and self.websocket:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                if self.websocket:
                    await self.websocket.send("PING")
                    logger.debug("Sent PING to RTDS")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"RTDS heartbeat error: {e}")
    
    async def subscribe(self, subscriptions: List[Dict]) -> bool:
        """
        Subscribe to RTDS topics.
        
        Example:
            await service.subscribe([
                {"topic": "crypto_prices", "type": "update"},
                {"topic": "comments", "type": "comment_created"}
            ])
        """
        if not self.connected or not self.websocket:
            return False
        
        try:
            msg = {
                "action": "subscribe",
                "subscriptions": subscriptions
            }
            
            await self.websocket.send(json.dumps(msg))
            logger.info(f"Subscribed to RTDS topics: {subscriptions}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to RTDS: {e}")
            return False
    
    async def subscribe_crypto_prices(self, symbols: List[str], source: str = "binance") -> bool:
        """
        Subscribe to crypto price updates.
        
        Args:
            symbols: List of symbols (e.g., ["btcusdt", "ethusdt"])
            source: "binance" for crypto_prices, "chainlink" for crypto_prices_chainlink
        """
        topic = "crypto_prices" if source == "binance" else "crypto_prices_chainlink"
        
        return await self.subscribe([
            {"topic": topic, "type": "update", "symbols": symbols}
        ])


# ==============================================================================
# Sports WebSocket Service
# ==============================================================================

class PolymarketSportsService:
    """
    Polymarket Sports WebSocket for auto-broadcast sports updates.
    
    Endpoint: wss://sports-api.polymarket.com/ws
    
    No subscription needed - auto-broadcasts all sports updates.
    Respond to ping with pong within 10 seconds.
    """
    
    def __init__(self):
        self.websocket = None
        self.connected = False
        self._message_count = 0
    
    async def connect(self) -> bool:
        """Connect to Sports WebSocket"""
        try:
            import websockets
            
            logger.info(f"Connecting to Polymarket Sports: {POLYMARKET_SPORTS_WS_URL}")
            
            self.websocket = await websockets.connect(
                POLYMARKET_SPORTS_WS_URL,
                ping_interval=None,
                ping_timeout=None,
                close_timeout=5
            )
            
            self.connected = True
            logger.info("Connected to Polymarket Sports WebSocket")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Sports WebSocket: {e}")
            self.connected = False
            return False
    
    async def receive_messages(self):
        """Receive messages and respond to pings"""
        if not self.connected or not self.websocket:
            return
        
        try:
            async for message in self.websocket:
                self._message_count += 1
                
                # Respond to ping
                if message == "ping":
                    await self.websocket.send("pong")
                    logger.debug("Responded pong to Sports WebSocket")
                    continue
                
                try:
                    data = json.loads(message)
                    # Process sports update
                    yield data
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from Sports WebSocket")
                    
        except Exception as e:
            logger.warning(f"Sports WebSocket connection lost: {e}")
            self.connected = False


# ==============================================================================
# Legacy Compatibility
# ==============================================================================

# Alias for backward compatibility
PolymarketWebSocketService = PolymarketCLOBService


# Message handler for the WebSocket manager
async def polymarket_message_handler(data: dict) -> Optional[dict]:
    """
    Process incoming Polymarket WebSocket messages.
    This is called by the WebSocket manager for each message.
    """
    service = PolymarketCLOBService()
    return await service._process_message(data)


# Singleton service instance
_polymarket_service: Optional[PolymarketCLOBService] = None


def get_polymarket_service() -> PolymarketCLOBService:
    """Get or create the Polymarket CLOB service singleton"""
    global _polymarket_service
    if _polymarket_service is None:
        _polymarket_service = PolymarketCLOBService()
    return _polymarket_service


# ==============================================================================
# Market Discovery and Auto-Subscription
# ==============================================================================

async def fetch_markets(
    limit: int = 100,
    active_only: bool = True,
    sort_by: str = "liquidity"
) -> List[Dict]:
    """
    Fetch markets from Polymarket REST API (Gamma API).
    
    Args:
        limit: Maximum number of markets to fetch
        active_only: Only return active (non-closed) markets
        sort_by: Sort criteria ('liquidity', 'volume', 'volume_24h')
    
    Returns:
        List of market dictionaries sorted by criteria
    """
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Polymarket Gamma API endpoint for markets
            # Use closed=false to get active markets
            params = {
                "limit": limit,
                "closed": "false" if active_only else None,
            }
            # Remove None values
            params = {k: v for k, v in params.items() if v is not None}
            
            response = await client.get(
                f"{POLYMARKET_REST_URL}/markets",
                params=params
            )
            
            if response.status_code == 200:
                markets = response.json()
                logger.info(f"Fetched {len(markets)} markets from Polymarket")
                return markets
            else:
                logger.error(f"Failed to fetch markets: {response.status_code} - {response.text[:200]}")
                return []
                
    except Exception as e:
        logger.error(f"Error fetching markets: {e}")
        return []


async def get_top_liquid_markets(count: int = 20) -> List[Dict]:
    """
    Get the top N most liquid markets.
    
    Args:
        count: Number of markets to return (default 20)
    
    Returns:
        List of top liquid markets with token info
    """
    # Fetch more markets to ensure we get enough liquid ones
    markets = await fetch_markets(limit=200, active_only=True)
    
    # Filter out markets with no liquidity and sort by liquidityNum
    liquid_markets = [m for m in markets if float(m.get("liquidityNum", 0)) > 0]
    
    sorted_markets = sorted(
        liquid_markets,
        key=lambda m: float(m.get("liquidityNum", 0)),
        reverse=True
    )[:count]
    
    logger.info(f"Top {count} markets by liquidity:")
    for i, market in enumerate(sorted_markets, 1):
        liq = float(market.get("liquidityNum", 0))
        question = market.get('question', 'Unknown')[:50]
        logger.info(f"  {i}. {question}... (Liquidity: ${liq:,.0f})")
    
    return sorted_markets



def extract_token_ids(markets: List[Dict]) -> List[str]:
    """
    Extract all token IDs from a list of markets.
    
    Each market has two tokens (YES and NO) stored in `clobTokenIds`
    as a JSON string array.
    
    Args:
        markets: List of market dictionaries
    
    Returns:
        List of token IDs (asset_ids)
    """
    token_ids = []
    
    for market in markets:
        # clobTokenIds is a JSON string like '["id1", "id2"]'
        clob_tokens_str = market.get("clobTokenIds", "[]")
        
        try:
            if isinstance(clob_tokens_str, str):
                clob_tokens = json.loads(clob_tokens_str)
            else:
                clob_tokens = clob_tokens_str or []
            
            for token_id in clob_tokens:
                if token_id and isinstance(token_id, str):
                    token_ids.append(token_id)
                    
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse clobTokenIds for market {market.get('id', 'unknown')}")
            continue
    
    logger.info(f"Extracted {len(token_ids)} token IDs from {len(markets)} markets")
    return token_ids


async def subscribe_top_liquid_markets(
    service: Optional[PolymarketCLOBService] = None,
    count: int = 20
) -> bool:
    """
    Subscribe to the top N most liquid markets.
    
    This function:
    1. Fetches markets from REST API
    2. Sorts by liquidity
    3. Extracts token IDs
    4. Subscribes via WebSocket
    
    Args:
        service: PolymarketCLOBService instance (uses singleton if None)
        count: Number of top markets to subscribe to
    
    Returns:
        True if subscription successful, False otherwise
    
    Example:
        >>> service = get_polymarket_service()
        >>> await service.connect()
        >>> await subscribe_top_liquid_markets(service, count=20)
    """
    if service is None:
        service = get_polymarket_service()
    
    if not service.connected:
        logger.warning("Service not connected, attempting connection...")
        connected = await service.connect()
        if not connected:
            logger.error("Failed to connect to Polymarket CLOB")
            return False
    
    # Fetch top liquid markets
    top_markets = await get_top_liquid_markets(count)
    
    if not top_markets:
        logger.error("No markets found")
        return False
    
    # Extract token IDs
    token_ids = extract_token_ids(top_markets)
    
    if not token_ids:
        logger.error("No token IDs extracted")
        return False
    
    # Subscribe to market channel
    success = await service.subscribe_market(token_ids)
    
    if success:
        logger.info(f"✅ Subscribed to {len(token_ids)} tokens from top {count} liquid markets")
        
        # Store market info in service for reference
        service.markets = {
            market.get("condition_id"): PolymarketMarket(
                id=market.get("id", ""),
                condition_id=market.get("condition_id", ""),
                question=market.get("question", ""),
                slug=market.get("slug", ""),
                tokens=market.get("tokens", []),
                liquidity=float(market.get("liquidity", 0)),
                volume=float(market.get("volume", 0)),
                volume_24h=float(market.get("volume_24h", 0)),
                active=market.get("active", True),
                closed=market.get("closed", False)
            )
            for market in top_markets
        }
        
        return True
    else:
        logger.error("Failed to subscribe to markets")
        return False


async def auto_connect_and_subscribe(count: int = 20) -> PolymarketCLOBService:
    """
    Convenience function to connect and subscribe to top liquid markets.
    
    Args:
        count: Number of top markets to subscribe to
    
    Returns:
        Connected and subscribed PolymarketCLOBService instance
    
    Example:
        >>> import asyncio
        >>> service = asyncio.run(auto_connect_and_subscribe(20))
        >>> # Now receiving updates from top 20 markets
    """
    service = get_polymarket_service()
    
    # Connect
    logger.info("Connecting to Polymarket CLOB WebSocket...")
    connected = await service.connect()
    
    if not connected:
        raise ConnectionError("Failed to connect to Polymarket CLOB")
    
    # Subscribe to top liquid markets
    logger.info(f"Subscribing to top {count} liquid markets...")
    subscribed = await subscribe_top_liquid_markets(service, count)
    
    if not subscribed:
        raise ConnectionError("Failed to subscribe to markets")
    
    logger.info("✅ Ready to receive market updates!")
    return service


# ==============================================================================
# CLI Entry Point for Testing
# ==============================================================================

async def _main():
    """
    CLI entry point for testing the Polymarket WebSocket subscription.
    
    Usage:
        python -m app.services.polymarket_ws
    """
    import signal
    import sys
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("=" * 60)
    print("Polymarket CLOB WebSocket - Top 20 Liquid Markets")
    print("=" * 60)
    
    # Connect and subscribe
    try:
        service = await auto_connect_and_subscribe(count=20)
    except ConnectionError as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    # Handle graceful shutdown
    def shutdown(signum, frame):
        print("\n\nShutting down...")
        asyncio.create_task(service.disconnect())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    print("\n📡 Receiving updates (Ctrl+C to stop)...\n")
    
    # Start receiving messages
    await service.receive_messages()


if __name__ == "__main__":
    asyncio.run(_main())

