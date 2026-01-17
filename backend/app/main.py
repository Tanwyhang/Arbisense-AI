"""
ARBISENSE FastAPI Application
Real-Time Multi-Agent Arbitrage Oracle with WebSocket Support
"""
import time
import asyncio
import logging
from typing import List
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.models import SimulationRequest, SimulationResponse
from app.utils.synthetic import generate_opportunity
from app.engines.monte_carlo import run_monte_carlo
from app.engines.agents import run_consensus
from app.engines.kelly import calculate_kelly
from app.engines.revenue import project_revenue
from app.engines.arbitrage_engine import get_arbitrage_engine, ArbitrageEngine
from app.config import config
from app.websocket_manager import ws_manager, WebSocketManager
from app.services import get_polymarket_service, get_limitless_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 ARBISENSE starting up...")
    print(f"⚙️  Environment: {config.environment}")
    
    # Warm-up simulation
    print("⚡ Running warm-up simulation...")
    try:
        opp = generate_opportunity("BTC-YES", "Polymarket", "Limitless")
        mc = run_monte_carlo(opp, num_paths=config.warmup_paths)
        print("✅ Warm-up complete")
    except Exception as e:
        print(f"⚠️  Warm-up failed: {e}")
    
    # Start WebSocket manager
    print("🔌 Starting WebSocket manager...")
    await ws_manager.start()
    
    # Start Limitless service (polling-based)
    print("📊 Starting Limitless service...")
    limitless = get_limitless_service()
    await limitless.start()
    
    # Start arbitrage engine
    print("🔍 Starting arbitrage engine...")
    arb_engine = get_arbitrage_engine()
    await arb_engine.start()
    
    print("✅ All services started")
    
    yield
    
    # Shutdown
    print("👋 ARBISENSE shutting down...")
    
    await arb_engine.stop()
    await limitless.stop()
    await ws_manager.stop()
    
    print("✅ Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="ARBISENSE API",
    description="Real-Time Multi-Agent Arbitrage Oracle",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=config.cors_credentials,
    allow_methods=config.cors_methods,
    allow_headers=config.cors_headers,
)


# =============================================================================
# REST Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment validation"""
    return {
        "status": "healthy",
        "service": "ARBISENSE",
        "version": "2.0.0",
        "websocket": ws_manager.get_status()
    }


@app.post("/simulate", response_model=SimulationResponse)
async def simulate_arbitrage(request: SimulationRequest):
    """
    Main simulation endpoint - runs all quant engines
    """
    pipeline_start = time.time()
    
    try:
        # Step 1: Generate synthetic opportunity data
        opportunity = generate_opportunity(
            pair=request.pair,
            dex_a=request.dex_a,
            dex_b=request.dex_b
        )
        
        # Step 2: Run Monte Carlo simulation
        monte_carlo_result = run_monte_carlo(opportunity, num_paths=config.monte_carlo_paths)
        
        # Step 3: Run multi-agent consensus
        consensus_result = run_consensus(opportunity, monte_carlo_result)
        
        # Step 4: Calculate Kelly position sizing
        kelly_result = calculate_kelly(opportunity)
        
        # Step 5: Project 30-day revenue across stress scenarios
        revenue_projection = project_revenue(opportunity, kelly_result)
        
        # Calculate total computation time
        total_time = (time.time() - pipeline_start) * 1000
        
        performance_warning = None
        if total_time > config.max_compute_time_ms:
            performance_warning = f"Computation time ({total_time:.0f}ms) exceeded target ({config.max_compute_time_ms}ms)."
        
        response = SimulationResponse(
            opportunity=opportunity,
            monte_carlo=monte_carlo_result,
            consensus=consensus_result,
            kelly=kelly_result,
            revenue_projection=revenue_projection,
            total_computation_time_ms=total_time,
            performance_warning=performance_warning
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}"
        )


@app.get("/api/arbitrage/opportunities")
async def get_arbitrage_opportunities():
    """Get current arbitrage opportunities"""
    engine = get_arbitrage_engine()
    opportunities = engine.get_active_opportunities()
    
    return {
        "opportunities": [
            {
                "id": o.id,
                "polymarket_market_id": o.polymarket_market_id,
                "question": o.polymarket_question,
                "spread_pct": round(o.spread_pct, 2),
                "net_profit_usd": round(o.net_profit_usd, 2),
                "net_profit_pct": round(o.net_profit_pct, 2),
                "direction": o.direction.value,
                "action": o.action,
                "confidence": round(o.confidence, 2),
                "risk_score": o.risk_score,
                "time_sensitive": o.time_sensitive,
                "discovered_at": o.discovered_at
            }
            for o in sorted(opportunities, key=lambda x: -x.net_profit_usd)
        ],
        "count": len(opportunities),
        "status": engine.get_status()
    }


@app.get("/api/arbitrage/signals")
async def get_arbitrage_signals():
    """Get recent arbitrage signals"""
    engine = get_arbitrage_engine()
    signals = engine.get_recent_signals(limit=20)
    
    return {
        "signals": [
            {
                "id": s.id,
                "opportunity_id": s.opportunity_id,
                "type": s.type,
                "strength": s.strength.value,
                "confidence_score": round(s.confidence_score, 1),
                "recommendation": s.recommendation,
                "rationale": s.rationale,
                "generated_at": s.generated_at,
                "valid_until": s.valid_until,
                "status": s.status
            }
            for s in signals
        ],
        "count": len(signals)
    }


@app.get("/api/arbitrage/alerts")
async def get_arbitrage_alerts():
    """Get unacknowledged arbitrage alerts"""
    engine = get_arbitrage_engine()
    alerts = engine.get_unacknowledged_alerts()
    
    return {
        "alerts": [
            {
                "id": a.id,
                "priority": a.priority.value,
                "category": a.category,
                "title": a.title,
                "message": a.message,
                "opportunity_id": a.opportunity_id,
                "created_at": a.created_at
            }
            for a in alerts
        ],
        "count": len(alerts)
    }


@app.post("/api/arbitrage/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an arbitrage alert"""
    engine = get_arbitrage_engine()
    engine.acknowledge_alert(alert_id)
    return {"acknowledged": True, "alert_id": alert_id}


@app.get("/api/market-data/status")
async def get_market_data_status():
    """Get status of all market data connections"""
    polymarket = get_polymarket_service()
    limitless = get_limitless_service()
    
    return {
        "websocket_manager": ws_manager.get_status(),
        "polymarket": polymarket.get_status(),
        "limitless": limitless.get_status(),
        "arbitrage": get_arbitrage_engine().get_status()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ARBISENSE",
        "version": "2.0.0",
        "description": "Real-Time Multi-Agent Arbitrage Oracle",
        "endpoints": {
            "health": "/health",
            "simulate": "/simulate (POST)",
            "arbitrage_opportunities": "/api/arbitrage/opportunities",
            "arbitrage_signals": "/api/arbitrage/signals",
            "arbitrage_alerts": "/api/arbitrage/alerts",
            "market_data_status": "/api/market-data/status",
            "ws_market_data": "/ws/market-data",
            "ws_arbitrage": "/ws/arbitrage"
        }
    }


# =============================================================================
# WebSocket Endpoints
# =============================================================================

@app.websocket("/ws/market-data")
async def websocket_market_data(websocket: WebSocket):
    """
    WebSocket endpoint for live market data streaming.
    
    Streams:
    - Polymarket price updates
    - Polymarket order book changes
    - Polymarket trades
    - Limitless pool updates
    - Limitless price updates
    """
    await websocket.accept()
    await ws_manager.add_client(websocket)
    
    logger.info("Market data WebSocket client connected")
    
    push_task = None
    
    try:
        # Small delay to ensure connection is fully established (helps with proxies)
        await asyncio.sleep(0.05)
        
        # Check if connection is still open before sending
        try:
            await websocket.send_json({
                "type": "connection_status",
                "status": "connected",
                "message": "Connected to market data stream",
                "timestamp": int(time.time() * 1000)
            })
        except Exception as e:
            logger.warning(f"Failed to send initial status: {e}")
            return
        
        # Start periodic data push
        async def push_data():
            while True:
                try:
                    # Get latest data from services
                    limitless = get_limitless_service()
                    
                    # Send Limitless data
                    await websocket.send_json(limitless.to_broadcast_format())
                    
                    await asyncio.sleep(2)  # Push every 2 seconds
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.debug(f"Push data loop ended: {e}")
                    break
        
        push_task = asyncio.create_task(push_data())
        
        # Handle incoming messages
        try:
            while True:
                data = await websocket.receive_json()
                
                # Handle subscription requests
                if data.get("type") == "subscribe":
                    channel = data.get("channel")
                    logger.info(f"Client subscribed to: {channel}")
                    
                    await websocket.send_json({
                        "type": "subscribed",
                        "channel": channel,
                        "timestamp": int(time.time() * 1000)
                    })
                
                # Handle ping
                elif data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": int(time.time() * 1000)
                    })
                    
        except WebSocketDisconnect:
            logger.debug("Market data WebSocket client disconnected gracefully")
            
    except Exception as e:
        if str(e):  # Only log if there's an actual error message
            logger.error(f"Market data WebSocket error: {e}")
    finally:
        if push_task:
            push_task.cancel()
            try:
                await push_task
            except asyncio.CancelledError:
                pass
        await ws_manager.remove_client(websocket)
        logger.info("Market data WebSocket client disconnected")


@app.websocket("/ws/arbitrage")
async def websocket_arbitrage(websocket: WebSocket):
    """
    WebSocket endpoint for arbitrage opportunities streaming.
    
    Streams:
    - New arbitrage opportunities
    - Opportunity updates
    - Trading signals
    - Alerts
    """
    await websocket.accept()
    
    logger.info("Arbitrage WebSocket client connected")
    
    push_task = None
    
    try:
        # Small delay to ensure connection is fully established (helps with proxies)
        await asyncio.sleep(0.05)
        
        # Send initial status
        engine = get_arbitrage_engine()
        
        try:
            await websocket.send_json({
                "type": "connection_status",
                "status": "connected",
                "message": "Connected to arbitrage stream",
                "engine_status": engine.get_status(),
                "timestamp": int(time.time() * 1000)
            })
        except Exception as e:
            logger.warning(f"Failed to send initial arbitrage status: {e}")
            return
        
        # Start periodic data push
        async def push_arb_data():
            while True:
                try:
                    await websocket.send_json(engine.to_broadcast_format())
                    await asyncio.sleep(1)  # Push every second
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.debug(f"Arb push loop ended: {e}")
                    break
        
        push_task = asyncio.create_task(push_arb_data())
        
        # Handle incoming messages
        try:
            while True:
                data = await websocket.receive_json()
                
                # Handle alert acknowledgment
                if data.get("type") == "acknowledge_alert":
                    alert_id = data.get("alert_id")
                    engine.acknowledge_alert(alert_id)
                    
                    await websocket.send_json({
                        "type": "alert_acknowledged",
                        "alert_id": alert_id,
                        "timestamp": int(time.time() * 1000)
                    })
                
                # Handle status request
                elif data.get("type") == "status":
                    await websocket.send_json({
                        "type": "status_response",
                        "status": engine.get_status(),
                        "timestamp": int(time.time() * 1000)
                    })
                
                # Handle ping
                elif data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": int(time.time() * 1000)
                    })
                    
        except WebSocketDisconnect:
            logger.debug("Arbitrage WebSocket client disconnected gracefully")
            
    except Exception as e:
        if str(e):  # Only log if there's an actual error message
            logger.error(f"Arbitrage WebSocket error: {e}")
    finally:
        if push_task:
            push_task.cancel()
            try:
                await push_task
            except asyncio.CancelledError:
                pass
        logger.info("Arbitrage WebSocket client disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=config.server_host, 
        port=config.server_port,
        reload=config.server_reload
    )
