"""
Limitless Exchange Service
REST API and GraphQL integration for Limitless Exchange
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field
import os
import json

import httpx

logger = logging.getLogger(__name__)

# Limitless API endpoints (Limitlex Exchange)
LIMITLESS_API_URL = os.getenv("LIMITLESS_API_URL", "https://limitlex.com/api")


@dataclass
class LimitlessPool:
    """Limitless liquidity pool data"""
    address: str
    name: str
    token0: Dict[str, Any]
    token1: Dict[str, Any]
    tvl: float = 0.0
    volume_24h: float = 0.0
    volume_7d: float = 0.0
    apr: float = 0.0
    fee_tier: int = 30  # basis points
    token0_price: float = 0.0
    token1_price: float = 0.0
    updated_at: int = 0


@dataclass
class LimitlessPrice:
    """Trading pair price data"""
    pair: str
    token0_symbol: str
    token1_symbol: str
    price: float
    price_usd: float
    change_1h: float = 0.0
    change_24h: float = 0.0
    change_7d: float = 0.0
    volume_24h: float = 0.0
    updated_at: int = 0


@dataclass
class LimitlessTrade:
    """Trade event from Limitless"""
    id: str
    pool_address: str
    type: str  # 'swap', 'mint', 'burn'
    token_in: str
    token_out: str
    amount_in: float
    amount_out: float
    price_impact: float
    sender: str
    tx_hash: str
    timestamp: int


class LimitlessService:
    """
    Limitless Exchange API client.
    
    Uses REST API polling for pool and price data from Limitlex.
    """
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
        
        # Data caches
        self.pools: Dict[str, LimitlessPool] = {}
        self.prices: Dict[str, LimitlessPrice] = {}
        self.recent_trades: List[LimitlessTrade] = []
        self.max_trades = 100
        
        # Polling settings
        self.poll_interval_seconds = 5
        self.polling_active = False
        self._poll_task: Optional[asyncio.Task] = None
        
        # Last update timestamps
        self.last_pools_update: int = 0
        self.last_prices_update: int = 0
        
        # Callbacks
        self.on_pool_update: Optional[callable] = None
        self.on_price_update: Optional[callable] = None
    
    async def start(self):
        """Start the service and begin polling"""
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.polling_active = True
        
        # Initial data fetch
        await self.fetch_all_data()
        
        # Start polling task
        self._poll_task = asyncio.create_task(self._polling_loop())
        
        logger.info("Limitless service started")
    
    async def stop(self):
        """Stop the service"""
        self.polling_active = False
        
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
        
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
        
        logger.info("Limitless service stopped")
    
    async def _polling_loop(self):
        """Background polling loop"""
        while self.polling_active:
            try:
                await self.fetch_all_data()
                await asyncio.sleep(self.poll_interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Limitless polling error: {e}")
                await asyncio.sleep(self.poll_interval_seconds)
    
    async def fetch_all_data(self):
        """Fetch all data from Limitless API"""
        await asyncio.gather(
            self.fetch_pools(),
            self.fetch_prices(),
            return_exceptions=True
        )
    
    # =========================================================================
    # Pool Data
    # =========================================================================
    
    async def fetch_pools(self) -> List[LimitlessPool]:
        """Fetch liquidity pools from Limitless API"""
        try:
            await self._fetch_pools_from_api()
            self.last_pools_update = int(datetime.now().timestamp() * 1000)
            return list(self.pools.values())
            
        except Exception as e:
            logger.error(f"Failed to fetch pools: {e}")
            return list(self.pools.values())
    
    async def _fetch_pools_from_api(self) -> List[LimitlessPool]:
        """Fetch pools from Limitlex REST API using public endpoints"""
        if not self.http_client:
            return []
        
        try:
            # Use Limitlex's public pairs endpoint to get trading pairs
            response = await self.http_client.get(f"{LIMITLESS_API_URL}/public/pairs")
            
            if response.status_code == 200:
                data = response.json()
                # Limitlex wraps response in {"result": {"data": [...]}}
                result = data.get("result", data) if isinstance(data, dict) else data
                pairs = result.get("data", result) if isinstance(result, dict) else result if isinstance(result, list) else []
                
                for pair_data in pairs:
                    if isinstance(pair_data, dict):
                        pool = self._parse_limitlex_pair(pair_data)
                        if pool:
                            self.pools[pool.address] = pool
                            
                            if self.on_pool_update:
                                await self.on_pool_update(pool)
                
                logger.debug(f"Fetched {len(self.pools)} pools from Limitlex API")
                return list(self.pools.values())
            else:
                logger.warning(f"Limitlex API returned {response.status_code}")
                return []
                
        except httpx.RequestError as e:
            logger.warning(f"Limitlex API request failed: {e}")
            return []
    

    
    def _parse_pool(self, data: dict) -> Optional[LimitlessPool]:
        """Parse pool data from API response"""
        try:
            return LimitlessPool(
                address=data.get("address", data.get("id", "")),
                name=data.get("name", ""),
                token0={
                    "address": data.get("token0", {}).get("address", ""),
                    "symbol": data.get("token0", {}).get("symbol", ""),
                    "decimals": data.get("token0", {}).get("decimals", 18)
                },
                token1={
                    "address": data.get("token1", {}).get("address", ""),
                    "symbol": data.get("token1", {}).get("symbol", ""),
                    "decimals": data.get("token1", {}).get("decimals", 18)
                },
                tvl=float(data.get("tvl", 0)),
                volume_24h=float(data.get("volume24h", data.get("volume", 0))),
                volume_7d=float(data.get("volume7d", 0)),
                apr=float(data.get("apr", 0)),
                fee_tier=int(data.get("feeTier", data.get("fee", 30))),
                token0_price=float(data.get("token0Price", 0)),
                token1_price=float(data.get("token1Price", 0)),
                updated_at=int(datetime.now().timestamp() * 1000)
            )
        except Exception as e:
            logger.warning(f"Failed to parse pool: {e}")
            return None
    
    def _parse_limitlex_pair(self, data: dict) -> Optional[LimitlessPool]:
        """Parse trading pair data from Limitlex API response"""
        try:
            # Limitlex pairs format: {"id": "uuid:uuid", "currency_id_1": "...", "currency_id_2": "...", "decimals": 8}
            pair_id = data.get("id", "")
            currency_1 = data.get("currency_id_1", "")[:8]  # Truncate UUID for display
            currency_2 = data.get("currency_id_2", "")[:8]
            decimals = int(data.get("decimals", 8))
            
            if not pair_id:
                return None
            
            return LimitlessPool(
                address=pair_id,
                name=f"{currency_1[:4]}/{currency_2[:4]}",  # Short display name
                token0={
                    "address": data.get("currency_id_1", ""),
                    "symbol": currency_1[:4].upper(),
                    "decimals": decimals
                },
                token1={
                    "address": data.get("currency_id_2", ""),
                    "symbol": currency_2[:4].upper(),
                    "decimals": decimals
                },
                tvl=0.0,  # Not directly available from pairs endpoint
                volume_24h=0.0,
                volume_7d=0.0,
                apr=0.0,
                fee_tier=30,  # Default 0.3%
                token0_price=0.0,
                token1_price=0.0,
                updated_at=int(datetime.now().timestamp() * 1000)
            )
        except Exception as e:
            logger.warning(f"Failed to parse Limitlex pair: {e}")
            return None
    
    # =========================================================================
    # Price Data
    # =========================================================================
    
    async def fetch_prices(self) -> List[LimitlessPrice]:
        """Fetch current prices from Limitlex API using public ticker endpoint"""
        if not self.http_client:
            return list(self.prices.values())
        
        try:
            # Use Limitlex's public ticker endpoint for price data
            response = await self.http_client.get(f"{LIMITLESS_API_URL}/public/ticker")
            
            if response.status_code == 200:
                data = response.json()
                # Limitlex wraps response in {"result": [...]}
                result = data.get("result", data) if isinstance(data, dict) else data
                tickers = result if isinstance(result, list) else list(result.values()) if isinstance(result, dict) else []
                
                for ticker_data in tickers:
                    if isinstance(ticker_data, dict):
                        price = self._parse_limitlex_ticker(ticker_data)
                        if price:
                            self.prices[price.pair] = price
                            
                            if self.on_price_update:
                                await self.on_price_update(price)
                
                self.last_prices_update = int(datetime.now().timestamp() * 1000)
                logger.debug(f"Fetched {len(self.prices)} prices from Limitlex ticker")
                return list(self.prices.values())
                
            else:
                logger.debug(f"Limitlex ticker returned {response.status_code}, using pool-derived prices")
                return self._generate_prices_from_pools()
                
        except httpx.RequestError as e:
            logger.warning(f"Price fetch failed: {e}")
            return self._generate_prices_from_pools()
    
    def _parse_price(self, data: dict) -> Optional[LimitlessPrice]:
        """Parse price data from API response"""
        try:
            return LimitlessPrice(
                pair=data.get("pair", data.get("symbol", "")),
                token0_symbol=data.get("token0", data.get("baseToken", "")),
                token1_symbol=data.get("token1", data.get("quoteToken", "")),
                price=float(data.get("price", 0)),
                price_usd=float(data.get("priceUsd", data.get("price", 0))),
                change_1h=float(data.get("change1h", 0)),
                change_24h=float(data.get("change24h", 0)),
                change_7d=float(data.get("change7d", 0)),
                volume_24h=float(data.get("volume24h", 0)),
                updated_at=int(datetime.now().timestamp() * 1000)
            )
        except Exception as e:
            logger.warning(f"Failed to parse price: {e}")
            return None
    
    def _parse_limitlex_ticker(self, data: dict) -> Optional[LimitlessPrice]:
        """Parse ticker data from Limitlex API response"""
        try:
            # Limitlex ticker format: {"pair_id": "uuid:uuid", "last_price": "1.190", "volume_1": ..., "bid": ..., "ask": ...}
            pair = data.get("pair_id", data.get("pair", ""))
            if not pair:
                return None
            
            # Parse prices, handling None values
            last_price_str = data.get("last_price", data.get("last", "0"))
            last_price = float(last_price_str) if last_price_str else 0.0
            
            open_str = data.get("open")
            open_price = float(open_str) if open_str else last_price
            
            # Calculate 24h change
            change_24h = 0.0
            if data.get("percentage"):
                change_24h = float(data.get("percentage", 0))
            elif open_price > 0 and last_price > 0:
                change_24h = ((last_price - open_price) / open_price) * 100
            
            # Parse volume
            vol1 = data.get("volume_1")
            vol2 = data.get("volume_2")
            volume = float(vol1) if vol1 else (float(vol2) if vol2 else 0.0)
            
            # Create short pair name from UUIDs
            pair_short = pair[:8] if len(pair) > 8 else pair
            
            return LimitlessPrice(
                pair=pair_short.upper(),
                token0_symbol=data.get("currency_id_1", pair[:4])[:4].upper(),
                token1_symbol=data.get("currency_id_2", pair[-4:])[:4].upper(),
                price=last_price,
                price_usd=last_price,
                change_1h=0.0,
                change_24h=change_24h,
                change_7d=0.0,
                volume_24h=volume,
                updated_at=int(datetime.now().timestamp() * 1000)
            )
        except Exception as e:
            logger.warning(f"Failed to parse Limitlex ticker: {e}")
            return None
    
    def _generate_prices_from_pools(self) -> List[LimitlessPrice]:
        """Generate price data from cached pool data"""
        generated = []
        
        for pool in self.pools.values():
            if pool.token0_price > 0:
                price = LimitlessPrice(
                    pair=pool.name,
                    token0_symbol=pool.token0.get("symbol", ""),
                    token1_symbol=pool.token1.get("symbol", ""),
                    price=pool.token0_price,
                    price_usd=pool.token0_price,  # Simplified
                    volume_24h=pool.volume_24h,
                    updated_at=pool.updated_at
                )
                self.prices[price.pair] = price
                generated.append(price)
        
        return generated
    
    # =========================================================================
    # GraphQL Queries
    # =========================================================================
    

    
    async def fetch_pool_by_address(self, address: str) -> Optional[LimitlessPool]:
        """Fetch a specific pool by address from cache"""
        return self.pools.get(address)
    
    # =========================================================================
    # Data Access
    # =========================================================================
    
    def get_pool(self, address: str) -> Optional[LimitlessPool]:
        """Get cached pool by address"""
        return self.pools.get(address)
    
    def get_all_pools(self) -> List[LimitlessPool]:
        """Get all cached pools"""
        return list(self.pools.values())
    
    def get_price(self, pair: str) -> Optional[LimitlessPrice]:
        """Get cached price by pair"""
        return self.prices.get(pair)
    
    def get_all_prices(self) -> List[LimitlessPrice]:
        """Get all cached prices"""
        return list(self.prices.values())
    
    def get_status(self) -> dict:
        """Get service status"""
        return {
            "polling_active": self.polling_active,
            "poll_interval": self.poll_interval_seconds,
            "pools_count": len(self.pools),
            "prices_count": len(self.prices),
            "last_pools_update": self.last_pools_update,
            "last_prices_update": self.last_prices_update
        }
    
    def to_broadcast_format(self) -> dict:
        """Format data for WebSocket broadcast"""
        return {
            "type": "limitless_update",
            "platform": "limitless",
            "data": {
                "pools": [
                    {
                        "address": p.address,
                        "name": p.name,
                        "tvl": p.tvl,
                        "volume_24h": p.volume_24h,
                        "apr": p.apr,
                        "fee_tier": p.fee_tier,
                        "token0_price": p.token0_price,
                        "token1_price": p.token1_price
                    }
                    for p in list(self.pools.values())[:20]
                ],
                "prices": [
                    {
                        "pair": p.pair,
                        "price": p.price,
                        "price_usd": p.price_usd,
                        "change_24h": p.change_24h,
                        "volume_24h": p.volume_24h
                    }
                    for p in list(self.prices.values())[:20]
                ],
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }


# Singleton instance
_limitless_service: Optional[LimitlessService] = None


def get_limitless_service() -> LimitlessService:
    """Get or create the Limitless service singleton"""
    global _limitless_service
    if _limitless_service is None:
        _limitless_service = LimitlessService()
    return _limitless_service
