# Polymarket WebSocket Integration

Complete documentation for implementing Polymarket WebSocket connections in ARBISENSE.

## WebSocket Endpoints

### 1. CLOB WebSocket (Main Market Data)

**Endpoint:** `wss://ws-subscriptions-clob.polymarket.com/ws/`

This is the primary WebSocket for real-time market data. It provides:
- Orderbook updates
- Price changes
- Trade events
- Market lifecycle events

### 2. RTDS (Real-Time Data Socket)

**Endpoint:** `wss://ws-live-data.polymarket.com`

For real-time crypto prices and comments:
- Crypto prices from Binance
- Crypto prices from Chainlink
- Comment events

### 3. Sports WebSocket

**Endpoint:** `wss://sports-api.polymarket.com/ws`

Auto-broadcasts all sports updates. No subscription needed.

---

## CLOB WebSocket Implementation

### Channels

#### Market Channel (Public)

Subscribe with `assets_ids` (token IDs) to receive:
- `book` - Orderbook snapshot/update
- `price_change` - Price change event
- `tick_size_change` - Tick size change
- `last_trade_price` - Last trade price
- `best_bid_ask` - Best bid/ask update
- `new_market` - New market created
- `market_resolved` - Market resolved

#### User Channel (Authenticated)

Subscribe with `markets` (condition IDs) + `auth` object to receive:
- `trade` - Trade event (fills)
- `order` - Order placement/update/cancellation

### Subscription Messages

#### Initial Market Subscription

```json
{
  "type": "market",
  "assets_ids": ["TOKEN_ID_1", "TOKEN_ID_2"],
  "custom_feature_enabled": true
}
```

#### Dynamic Subscribe (Add markets without disconnecting)

```json
{
  "assets_ids": ["NEW_TOKEN_ID"],
  "operation": "subscribe"
}
```

#### Dynamic Unsubscribe

```json
{
  "assets_ids": ["TOKEN_ID_TO_REMOVE"],
  "operation": "unsubscribe"
}
```

#### User Channel (Authenticated)

```json
{
  "type": "user",
  "markets": ["CONDITION_ID_1", "CONDITION_ID_2"],
  "auth": {
    "apiKey": "YOUR_API_KEY",
    "secret": "YOUR_SECRET",
    "passphrase": "YOUR_PASSPHRASE"
  }
}
```

### Heartbeat

Send `PING` every ~10 seconds. Server responds with `PONG`.

```python
# Python implementation
async def heartbeat_loop():
    while connected:
        await asyncio.sleep(10)
        await websocket.send("PING")
```

### Message Examples

#### Orderbook Update (`book`)

```json
{
  "type": "book",
  "asset_id": "TOKEN_ID",
  "market": "CONDITION_ID",
  "bids": [
    {"price": "0.51", "size": "1000"},
    {"price": "0.50", "size": "2500"}
  ],
  "asks": [
    {"price": "0.52", "size": "1500"},
    {"price": "0.53", "size": "3000"}
  ]
}
```

#### Price Change (`price_change`)

```json
{
  "type": "price_change",
  "asset_id": "TOKEN_ID",
  "market": "CONDITION_ID",
  "price": "0.515"
}
```

#### Last Trade Price (`last_trade_price`)

```json
{
  "type": "last_trade_price",
  "asset_id": "TOKEN_ID",
  "price": "0.52"
}
```

#### Best Bid/Ask (`best_bid_ask`)

```json
{
  "type": "best_bid_ask",
  "asset_id": "TOKEN_ID",
  "best_bid": "0.51",
  "best_ask": "0.52"
}
```

#### Trade Event (`trade` - User Channel)

```json
{
  "type": "trade",
  "id": "TRADE_ID",
  "asset_id": "TOKEN_ID",
  "market": "CONDITION_ID",
  "side": "buy",
  "price": "0.52",
  "size": "100",
  "maker": "0x...",
  "taker": "0x...",
  "timestamp": 1705477800000
}
```

#### Order Event (`order` - User Channel)

```json
{
  "type": "order",
  "event_type": "PLACEMENT",
  "order_id": "ORDER_ID",
  "asset_id": "TOKEN_ID",
  "market": "CONDITION_ID",
  "side": "buy",
  "price": "0.51",
  "size": "100",
  "filled_size": "0",
  "status": "pending"
}
```

Event types: `PLACEMENT`, `UPDATE`, `CANCELLATION`

---

## RTDS Implementation

### Subscription Format

```json
{
  "action": "subscribe",
  "subscriptions": [
    {"topic": "crypto_prices", "type": "update"},
    {"topic": "comments", "type": "comment_created"}
  ]
}
```

### Crypto Price Topics

#### Binance Prices

Topic: `crypto_prices`
Symbols: `btcusdt`, `ethusdt`, etc.

```json
{
  "action": "subscribe",
  "subscriptions": [
    {"topic": "crypto_prices", "type": "update", "symbols": ["btcusdt", "ethusdt"]}
  ]
}
```

#### Chainlink Prices

Topic: `crypto_prices_chainlink`
Symbols: `eth/usd`, `btc/usd`, etc.

```json
{
  "action": "subscribe",
  "subscriptions": [
    {"topic": "crypto_prices_chainlink", "type": "update", "symbols": ["eth/usd"]}
  ]
}
```

### Heartbeat

Send `PING` every 5 seconds (more frequent than CLOB).

```python
async def rtds_heartbeat_loop():
    while connected:
        await asyncio.sleep(5)  # 5 seconds for RTDS
        await websocket.send("PING")
```

---

## Sports WebSocket Implementation

### Connection

Simply connect - no subscription needed. Server auto-broadcasts all sports updates.

```python
import websockets

async def connect_sports():
    async with websockets.connect("wss://sports-api.polymarket.com/ws") as ws:
        async for message in ws:
            if message == "ping":
                await ws.send("pong")
            else:
                data = json.loads(message)
                process_sports_update(data)
```

### Heartbeat

Server sends `ping`, you must respond with `pong` within 10 seconds.

---

## Python Implementation

### Complete CLOB Client Example

```python
import asyncio
import json
import websockets

class PolymarketCLOBClient:
    WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/"
    HEARTBEAT_INTERVAL = 10
    
    def __init__(self):
        self.ws = None
        self.connected = False
        self.orderbooks = {}
        self.prices = {}
    
    async def connect(self):
        """Connect to CLOB WebSocket"""
        self.ws = await websockets.connect(
            self.WS_URL,
            ping_interval=None,  # Manual ping handling
            ping_timeout=None
        )
        self.connected = True
        
        # Start heartbeat task
        asyncio.create_task(self._heartbeat_loop())
        
        return True
    
    async def _heartbeat_loop(self):
        """Send PING every 10 seconds"""
        while self.connected and self.ws:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                await self.ws.send("PING")
            except Exception:
                break
    
    async def subscribe_markets(self, token_ids: list):
        """Subscribe to market channel"""
        msg = {
            "type": "market",
            "assets_ids": token_ids,
            "custom_feature_enabled": True
        }
        await self.ws.send(json.dumps(msg))
    
    async def subscribe_user(self, condition_ids: list, api_key: str, secret: str, passphrase: str):
        """Subscribe to user channel (authenticated)"""
        msg = {
            "type": "user",
            "markets": condition_ids,
            "auth": {
                "apiKey": api_key,
                "secret": secret,
                "passphrase": passphrase
            }
        }
        await self.ws.send(json.dumps(msg))
    
    async def add_subscription(self, token_ids: list):
        """Dynamically add subscriptions"""
        msg = {
            "assets_ids": token_ids,
            "operation": "subscribe"
        }
        await self.ws.send(json.dumps(msg))
    
    async def remove_subscription(self, token_ids: list):
        """Dynamically remove subscriptions"""
        msg = {
            "assets_ids": token_ids,
            "operation": "unsubscribe"
        }
        await self.ws.send(json.dumps(msg))
    
    async def receive_messages(self):
        """Main message loop"""
        async for message in self.ws:
            if message == "PONG":
                continue  # Heartbeat response
            
            try:
                data = json.loads(message)
                await self._handle_message(data)
            except json.JSONDecodeError:
                continue
    
    async def _handle_message(self, data: dict):
        """Process incoming message"""
        msg_type = data.get("type")
        
        if msg_type == "book":
            await self._handle_orderbook(data)
        elif msg_type == "price_change":
            await self._handle_price_change(data)
        elif msg_type == "last_trade_price":
            await self._handle_last_trade_price(data)
        elif msg_type == "best_bid_ask":
            await self._handle_best_bid_ask(data)
        elif msg_type == "trade":
            await self._handle_trade(data)
        elif msg_type == "order":
            await self._handle_order(data)
        elif msg_type in ("connected", "subscribed", "ack"):
            pass  # Control messages
        else:
            print(f"Unknown message type: {msg_type}")
    
    async def _handle_orderbook(self, data: dict):
        """Process orderbook update"""
        asset_id = data.get("asset_id")
        bids = data.get("bids", [])
        asks = data.get("asks", [])
        
        self.orderbooks[asset_id] = {
            "bids": bids,
            "asks": asks,
            "best_bid": float(bids[0]["price"]) if bids else 0,
            "best_ask": float(asks[0]["price"]) if asks else 0,
        }
        
        print(f"Orderbook update for {asset_id}: {len(bids)} bids, {len(asks)} asks")
    
    async def _handle_price_change(self, data: dict):
        """Process price change"""
        asset_id = data.get("asset_id")
        price = float(data.get("price", 0))
        
        old_price = self.prices.get(asset_id, price)
        self.prices[asset_id] = price
        
        change = (price - old_price) / old_price * 100 if old_price else 0
        print(f"Price change for {asset_id}: {price} ({change:+.2f}%)")
    
    async def _handle_last_trade_price(self, data: dict):
        """Process last trade price"""
        asset_id = data.get("asset_id")
        price = float(data.get("price", 0))
        print(f"Last trade price for {asset_id}: {price}")
    
    async def _handle_best_bid_ask(self, data: dict):
        """Process best bid/ask update"""
        asset_id = data.get("asset_id")
        best_bid = float(data.get("best_bid", 0))
        best_ask = float(data.get("best_ask", 0))
        spread = best_ask - best_bid
        print(f"Best bid/ask for {asset_id}: {best_bid}/{best_ask} (spread: {spread:.4f})")
    
    async def _handle_trade(self, data: dict):
        """Process trade event (user channel)"""
        print(f"Trade: {data.get('side')} {data.get('size')} @ {data.get('price')}")
    
    async def _handle_order(self, data: dict):
        """Process order event (user channel)"""
        event_type = data.get("event_type")
        print(f"Order {event_type}: {data.get('order_id')}")


# Usage example
async def main():
    client = PolymarketCLOBClient()
    await client.connect()
    
    # Subscribe to some markets
    await client.subscribe_markets([
        "TOKEN_ID_1",
        "TOKEN_ID_2"
    ])
    
    # Receive messages
    await client.receive_messages()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Error Handling

### Connection Errors

```python
async def connect_with_retry(max_attempts=10):
    attempt = 0
    delay = 1.0
    
    while attempt < max_attempts:
        try:
            await client.connect()
            return True
        except Exception as e:
            attempt += 1
            print(f"Connection failed (attempt {attempt}): {e}")
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)  # Exponential backoff, max 60s
    
    return False
```

### Message Parsing Errors

```python
async def safe_receive(ws):
    try:
        message = await ws.recv()
        if message in ("PONG", "pong"):
            return None
        return json.loads(message)
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid JSON: {e}")
        return None
    except websockets.ConnectionClosed:
        raise
    except Exception as e:
        logger.error(f"Receive error: {e}")
        return None
```

---

## Environment Variables

```bash
# CLOB WebSocket
POLYMARKET_CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws/

# RTDS
POLYMARKET_RTDS_WS_URL=wss://ws-live-data.polymarket.com

# Sports
POLYMARKET_SPORTS_WS_URL=wss://sports-api.polymarket.com/ws

# REST API
POLYMARKET_REST_URL=https://gamma-api.polymarket.com

# Authentication (for User channel)
POLYMARKET_API_KEY=your_api_key
POLYMARKET_SECRET=your_secret
POLYMARKET_PASSPHRASE=your_passphrase
```

---

## Key Differences from Old Implementation

| Feature | Old Implementation | New Implementation |
|---------|-------------------|-------------------|
| **Endpoint** | `wss://clob.polymarket.com/ws` | `wss://ws-subscriptions-clob.polymarket.com/ws/` |
| **Subscription** | `{"type": "subscribe", "channel": "market"}` | `{"type": "market", "assets_ids": [...]}` |
| **Dynamic Sub** | Not supported | `{"assets_ids": [...], "operation": "subscribe"}` |
| **Heartbeat** | Automatic (websockets lib) | Manual PING every 10s |
| **User Channel** | Not implemented | Full support with auth |

---

## Testing WebSocket Connection

```bash
# Using websocat (install via: cargo install websocat)
websocat wss://ws-subscriptions-clob.polymarket.com/ws/

# Send subscription
{"type": "market", "assets_ids": ["YOUR_TOKEN_ID"], "custom_feature_enabled": true}

# Send ping
PING
```

---

## References

- [Polymarket WSS Overview](https://docs.polymarket.com/websockets)
- [Polymarket RTDS Overview](https://docs.polymarket.com/rtds)
- [Polymarket WSS Quickstart](https://docs.polymarket.com/websocket-quickstart)
