"""
WebSocket Manager
Connection pooling, message broadcasting, and reconnection logic
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)


class ConnectionStatus(Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    RECONNECTING = "reconnecting"


@dataclass
class ConnectionInfo:
    """Information about a WebSocket connection"""
    name: str
    url: str
    status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    websocket: Optional[Any] = None
    last_message_at: Optional[datetime] = None
    reconnect_attempts: int = 0
    max_reconnect_attempts: int = 10
    reconnect_delay: float = 1.0
    max_reconnect_delay: float = 60.0
    error_message: Optional[str] = None
    subscriptions: Set[str] = field(default_factory=set)


class WebSocketManager:
    """
    Manages multiple WebSocket connections with:
    - Connection pooling for external feeds (Polymarket, Limitless)
    - Message broadcasting to frontend clients
    - Automatic reconnection with exponential backoff
    - Error handling and logging
    """
    
    def __init__(self):
        # External source connections (Polymarket, etc.)
        self.source_connections: Dict[str, ConnectionInfo] = {}
        
        # Frontend client connections
        self.client_connections: Set[Any] = set()
        
        # Message handlers per source
        self.message_handlers: Dict[str, Callable] = {}
        
        # Connection lock
        self._lock = asyncio.Lock()
        
        # Background tasks
        self._tasks: Dict[str, asyncio.Task] = {}
        
        # Message queue for broadcasting
        self._broadcast_queue: asyncio.Queue = asyncio.Queue()
        
        # Running flag
        self._running = False
    
    async def start(self):
        """Start the WebSocket manager"""
        self._running = True
        
        # Start broadcast worker
        self._tasks['broadcast'] = asyncio.create_task(self._broadcast_worker())
        
        logger.info("WebSocket Manager started")
    
    async def stop(self):
        """Stop the WebSocket manager and all connections"""
        self._running = False
        
        # Close all source connections
        for name, conn in self.source_connections.items():
            await self._close_connection(conn)
        
        # Close all client connections
        for client in self.client_connections.copy():
            try:
                await client.close()
            except Exception:
                pass
        
        # Cancel background tasks
        for task in self._tasks.values():
            task.cancel()
        
        logger.info("WebSocket Manager stopped")
    
    # =========================================================================
    # Source Connection Management
    # =========================================================================
    
    async def add_source_connection(
        self,
        name: str,
        url: str,
        message_handler: Optional[Callable] = None,
        auto_connect: bool = True
    ) -> ConnectionInfo:
        """Add a new source WebSocket connection"""
        async with self._lock:
            conn = ConnectionInfo(name=name, url=url)
            self.source_connections[name] = conn
            
            if message_handler:
                self.message_handlers[name] = message_handler
            
            if auto_connect:
                self._tasks[f'connect_{name}'] = asyncio.create_task(
                    self._connect_with_retry(name)
                )
            
            return conn
    
    async def remove_source_connection(self, name: str):
        """Remove a source connection"""
        async with self._lock:
            if name in self.source_connections:
                await self._close_connection(self.source_connections[name])
                del self.source_connections[name]
            
            if name in self.message_handlers:
                del self.message_handlers[name]
            
            task_key = f'connect_{name}'
            if task_key in self._tasks:
                self._tasks[task_key].cancel()
                del self._tasks[task_key]
    
    async def _connect_with_retry(self, name: str):
        """Connect to a source with exponential backoff retry"""
        conn = self.source_connections.get(name)
        if not conn:
            return
        
        while self._running and conn.reconnect_attempts < conn.max_reconnect_attempts:
            try:
                conn.status = ConnectionStatus.CONNECTING
                logger.info(f"Connecting to {name} at {conn.url}...")
                
                # Import websockets here to avoid circular imports
                import websockets
                
                conn.websocket = await websockets.connect(
                    conn.url,
                    ping_interval=30,
                    ping_timeout=10,
                    close_timeout=5
                )
                
                conn.status = ConnectionStatus.CONNECTED
                conn.reconnect_attempts = 0
                conn.reconnect_delay = 1.0
                conn.error_message = None
                
                logger.info(f"Connected to {name}")
                
                # Start receiving messages
                await self._receive_messages(name)
                
            except Exception as e:
                conn.status = ConnectionStatus.ERROR
                conn.error_message = str(e)
                conn.reconnect_attempts += 1
                
                # Exponential backoff
                delay = min(
                    conn.reconnect_delay * (2 ** (conn.reconnect_attempts - 1)),
                    conn.max_reconnect_delay
                )
                
                logger.warning(
                    f"Connection to {name} failed: {e}. "
                    f"Retrying in {delay:.1f}s (attempt {conn.reconnect_attempts})"
                )
                
                conn.status = ConnectionStatus.RECONNECTING
                await asyncio.sleep(delay)
        
        if conn.reconnect_attempts >= conn.max_reconnect_attempts:
            logger.error(f"Max reconnection attempts reached for {name}")
            conn.status = ConnectionStatus.DISCONNECTED
    
    async def _receive_messages(self, name: str):
        """Receive and process messages from a source connection"""
        conn = self.source_connections.get(name)
        if not conn or not conn.websocket:
            return
        
        try:
            async for message in conn.websocket:
                conn.last_message_at = datetime.now()
                
                try:
                    # Parse JSON message
                    data = json.loads(message) if isinstance(message, str) else message
                    
                    # Call message handler if registered
                    handler = self.message_handlers.get(name)
                    if handler:
                        processed = await handler(data)
                        if processed:
                            # Queue for broadcast to clients
                            await self._broadcast_queue.put({
                                'source': name,
                                'data': processed,
                                'timestamp': datetime.now().isoformat()
                            })
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON from {name}: {e}")
                except Exception as e:
                    logger.error(f"Error processing message from {name}: {e}")
                    traceback.print_exc()
                    
        except Exception as e:
            logger.warning(f"Connection to {name} lost: {e}")
            conn.status = ConnectionStatus.DISCONNECTED
            
            # Attempt reconnection
            if self._running:
                self._tasks[f'connect_{name}'] = asyncio.create_task(
                    self._connect_with_retry(name)
                )
    
    async def _close_connection(self, conn: ConnectionInfo):
        """Close a source connection"""
        if conn.websocket:
            try:
                await conn.websocket.close()
            except Exception:
                pass
            conn.websocket = None
        conn.status = ConnectionStatus.DISCONNECTED
    
    async def send_to_source(self, name: str, message: dict):
        """Send a message to a source connection"""
        conn = self.source_connections.get(name)
        if not conn or not conn.websocket or conn.status != ConnectionStatus.CONNECTED:
            logger.warning(f"Cannot send to {name}: not connected")
            return False
        
        try:
            await conn.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"Error sending to {name}: {e}")
            return False
    
    async def subscribe(self, name: str, channel: str, **kwargs):
        """Subscribe to a channel on a source connection"""
        conn = self.source_connections.get(name)
        if not conn:
            return False
        
        conn.subscriptions.add(channel)
        
        # Send subscription message (format depends on the platform)
        subscription_msg = {
            'type': 'subscribe',
            'channel': channel,
            **kwargs
        }
        
        return await self.send_to_source(name, subscription_msg)
    
    # =========================================================================
    # Client Connection Management
    # =========================================================================
    
    async def add_client(self, websocket):
        """Add a frontend client connection"""
        self.client_connections.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.client_connections)}")
        
        # Send current connection status
        await self._send_status_update(websocket)
    
    async def remove_client(self, websocket):
        """Remove a frontend client connection"""
        self.client_connections.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.client_connections)}")
    
    async def _send_status_update(self, websocket):
        """Send connection status to a specific client"""
        status = {
            'type': 'connection_status',
            'connections': {
                name: {
                    'status': conn.status.value,
                    'last_message_at': conn.last_message_at.isoformat() if conn.last_message_at else None,
                    'reconnect_attempts': conn.reconnect_attempts,
                    'error_message': conn.error_message,
                    'subscriptions': list(conn.subscriptions)
                }
                for name, conn in self.source_connections.items()
            },
            'client_count': len(self.client_connections),
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            await websocket.send_json(status)
        except Exception as e:
            logger.warning(f"Error sending status to client: {e}")
    
    async def broadcast_to_clients(self, message: dict):
        """Broadcast a message to all connected frontend clients"""
        if not self.client_connections:
            return
        
        disconnected = set()
        
        for client in self.client_connections:
            try:
                await client.send_json(message)
            except Exception:
                disconnected.add(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self.client_connections.discard(client)
    
    async def _broadcast_worker(self):
        """Background worker to process broadcast queue"""
        while self._running:
            try:
                message = await asyncio.wait_for(
                    self._broadcast_queue.get(),
                    timeout=1.0
                )
                await self.broadcast_to_clients(message)
                
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Broadcast worker error: {e}")
    
    # =========================================================================
    # Status and Monitoring
    # =========================================================================
    
    def get_status(self) -> dict:
        """Get current status of all connections"""
        return {
            'sources': {
                name: {
                    'status': conn.status.value,
                    'url': conn.url,
                    'last_message_at': conn.last_message_at.isoformat() if conn.last_message_at else None,
                    'reconnect_attempts': conn.reconnect_attempts,
                    'subscriptions': list(conn.subscriptions),
                    'error': conn.error_message
                }
                for name, conn in self.source_connections.items()
            },
            'clients': len(self.client_connections),
            'running': self._running
        }
    
    def get_connection_status(self, name: str) -> Optional[ConnectionStatus]:
        """Get status of a specific source connection"""
        conn = self.source_connections.get(name)
        return conn.status if conn else None


# Global WebSocket manager instance
ws_manager = WebSocketManager()
