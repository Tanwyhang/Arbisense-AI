"""
API Endpoints for Advanced Arbitrage System
Provides REST and WebSocket interfaces for arbitrage detection and analysis
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import Optional, List, Dict
import logging
import asyncio
from datetime import datetime

from app.models.arbitrage import (
    ArbitrageOpportunity,
    ArbitrageAnalysis,
    RiskAssessment,
    ExecutionPlan,
    CircuitBreakerStatus,
    ArbitrageStrategy,
)
from app.engines.advanced_arbitrage import (
    detect_single_market_arbitrage,
    detect_multi_outcome_arbitrage,
    detect_three_way_arbitrage,
    detect_cross_platform_arbitrage,
    calculate_confidence,
)
from app.engines.circuit_breaker import CircuitBreaker, create_circuit_breaker
from app.engines.l2_calculator import (
    calculate_buy_vwap,
    calculate_sell_vwap,
    calculate_arbitrage_vwap,
    OrderbookConfig,
)

logger = logging.getLogger(__name__)

# Initialize circuit breaker
circuit_breaker = create_circuit_breaker()

router = APIRouter(prefix="/api/arbitrage", tags=["arbitrage"])


# ============================================================================
# REST ENDPOINTS
# ============================================================================

@router.get("/opportunities")
async def get_opportunities(
    strategy: Optional[str] = Query(None, description="Filter by strategy"),
    min_profit: Optional[float] = Query(None, description="Minimum profit in USD"),
    min_confidence: Optional[float] = Query(None, description="Minimum confidence score"),
    limit: int = Query(50, description="Maximum results to return"),
) -> Dict:
    """
    Get current arbitrage opportunities

    Scans all markets and returns opportunities matching criteria
    """
    try:
        # This would scan actual markets in production
        # For now, return demo data
        opportunities = await _scan_markets()

        # Apply filters
        if strategy:
            opportunities = [o for o in opportunities if strategy in o.direction]

        if min_profit:
            opportunities = [o for o in opportunities if o.net_profit_usd >= min_profit]

        if min_confidence:
            opportunities = [o for o in opportunities if o.confidence >= min_confidence]

        # Sort by profit then confidence
        opportunities.sort(
            key=lambda o: (o.net_profit_usd, o.confidence), reverse=True
        )

        return {
            "opportunities": opportunities[:limit],
            "count": len(opportunities[:limit]),
            "timestamp": datetime.now().isoformat(),
            "circuit_breaker_status": circuit_breaker.get_status().__dict__,
        }
    except Exception as e:
        logger.error(f"Error getting opportunities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{opportunity_id}")
async def analyze_opportunity(
    opportunity_id: str,
    target_size: float = Query(1000.0, description="Target trade size in USD"),
) -> Dict:
    """
    Analyze specific arbitrage opportunity with L2 VWAP and circuit breaker validation

    Returns complete analysis including:
    - Optimal sizing using L2 VWAP
    - Expected slippage
    - Confidence score
    - Risk assessment
    - Execution plan
    """
    try:
        # Get opportunity (in production, would fetch from database or cache)
        opportunity = await _get_opportunity(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        # Get orderbooks (in production, would fetch from WebSocket cache)
        yes_orderbook = await _get_orderbook(f"{opportunity.polymarket_market_id}-yes")
        no_orderbook = await _get_orderbook(f"{opportunity.polymarket_market_id}-no")

        # Calculate VWAP for both legs
        vwap_result = calculate_arbitrage_vwap(
            yes_orderbook, no_orderbook, target_size, OrderbookConfig()
        )

        # Determine if execution is possible
        optimal_size = vwap_result["combined_optimal_size"]
        can_execute = (
            vwap_result["can_execute"]
            and optimal_size >= opportunity.min_size
        )

        # Validate against circuit breaker
        validation = circuit_breaker.validate_trade(
            opportunity.polymarket_market_id,
            optimal_size,
            opportunity.max_loss_usd or 5.0,
        )

        if not validation.can_execute:
            can_execute = False

        # Calculate confidence score
        confidence = calculate_confidence(
            opportunity.spread_pct,
            opportunity.available_liquidity,
            opportunity.risk_score,
            vwap_result["total_slippage_cents"] / 100,
        )

        # Risk assessment
        risk_assessment = _assess_risk(
            opportunity, vwap_result["total_slippage_cents"]
        )

        # Build execution plan
        execution_plan = None
        if can_execute:
            execution_plan = ExecutionPlan(
                yes_leg_size=optimal_size,
                no_leg_size=optimal_size,
                total_cost_usd=(optimal_size * vwap_result["yes_leg"].vwap_cents / 100)
                + (optimal_size * vwap_result["no_leg"].vwap_cents / 100),
                expected_profit_usd=optimal_size
                * (1 - vwap_result["yes_leg"].vwap_cents / 100)
                + optimal_size * (1 - vwap_result["no_leg"].vwap_cents / 100),
                gas_estimate_usd=opportunity.estimated_gas_cost * 2,
            )

        return {
            "opportunity_id": opportunity_id,
            "can_execute": can_execute and validation.can_execute,
            "optimal_size_usd": optimal_size,
            "expected_slippage_cents": vwap_result["total_slippage_cents"],
            "vwap_yes": vwap_result["yes_leg"].vwap_cents,
            "vwap_no": vwap_result["no_leg"].vwap_cents,
            "confidence_score": confidence,
            "risk_assessment": risk_assessment.__dict__,
            "execution_plan": execution_plan.__dict__ if execution_plan else None,
            "validation": {
                "can_execute": validation.can_execute,
                "reason": validation.reason,
            },
            "circuit_breaker": circuit_breaker.get_status().__dict__,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing opportunity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status() -> Dict:
    """Get arbitrage system status including circuit breaker"""
    status = circuit_breaker.get_status()
    return {
        "circuit_breaker": status.__dict__,
        "strategies_enabled": [
            "single_market",
            "cross_platform",
            "multi_outcome",
            "three_way_market",
        ],
        "last_scan": datetime.now().isoformat(),
        "scan_frequency_ms": 1000,
    }


@router.post("/execute/{opportunity_id}")
async def execute_opportunity(
    opportunity_id: str,
    target_size: float = Query(1000.0, description="Trade size in USD"),
) -> Dict:
    """
    Execute arbitrage opportunity (if auto-trading enabled)

    WARNING: This will execute real trades!
    """
    # Check if circuit breaker allows trading
    if not circuit_breaker.can_trade():
        raise HTTPException(
            status_code=403,
            detail=f"Circuit breaker is {circuit_breaker.get_state().value}",
        )

    # Get and analyze opportunity
    opportunity = await _get_opportunity(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Validate trade
    validation = circuit_breaker.validate_trade(
        opportunity.polymarket_market_id,
        target_size,
        opportunity.max_loss_usd or 5.0,
    )

    if not validation.can_execute:
        raise HTTPException(status_code=403, detail=validation.reason)

    # Execute trade (in production, would call execution engine)
    # For now, just return success message
    return {
        "success": True,
        "message": "Trade execution simulated (auto-trading not yet implemented)",
        "opportunity_id": opportunity_id,
        "target_size": target_size,
    }


@router.get("/circuit-breaker/status")
async def get_circuit_breaker_status() -> Dict:
    """Get detailed circuit breaker status"""
    return circuit_breaker.get_diagnostics()


@router.post("/circuit-breaker/reset")
async def reset_circuit_breaker() -> Dict:
    """Manually reset circuit breaker (use with caution)"""
    circuit_breaker.manual_reset()
    return {
        "success": True,
        "message": "Circuit breaker manually reset",
        "state": circuit_breaker.get_state().value,
    }


@router.post("/circuit-breaker/trip")
async def trip_circuit_breaker(reason: str = "Manual trip") -> Dict:
    """Manually trip circuit breaker (emergency stop)"""
    circuit_breaker.manual_trip(reason)
    return {
        "success": True,
        "message": f"Circuit breaker manually tripped: {reason}",
        "state": circuit_breaker.get_state().value,
    }


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@router.websocket("/ws/stream")
async def arbitrage_websocket(websocket: WebSocket):
    """
    Real-time arbitrage opportunity stream

    Sends updates every second when new opportunities detected
    """
    await websocket.accept()
    logger.info("WebSocket connected")

    try:
        while True:
            # Scan for opportunities
            opportunities = await _scan_markets()

            # Send to client
            await websocket.send_json(
                {
                    "type": "opportunities_update",
                    "data": opportunities,
                    "timestamp": datetime.now().isoformat(),
                    "circuit_breaker": circuit_breaker.get_status().__dict__,
                }
            )

            # Wait before next scan
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


# ============================================================================
# HELPER FUNCTIONS (DEMO DATA)
# ============================================================================

async def _scan_markets() -> List[Dict]:
    """
    Scan markets for arbitrage opportunities

    In production, this would:
    - Fetch markets from Polymarket API
    - Fetch prices from WebSocket feeds
    - Run all strategy detectors
    - Return opportunities
    """
    # Demo data for now
    return [
        {
            "id": "demo-1",
            "polymarket_market_id": "market-1",
            "polymarket_question": "Bitcoin > $100,000 by end of 2024?",
            "spread_pct": 3.0,
            "net_profit_usd": 2.50,
            "confidence": 0.92,
            "risk_score": 1,
            "direction": "poly_internal",
            "time_sensitive": True,
        },
        {
            "id": "demo-2",
            "polymarket_market_id": "market-2",
            "polymarket_question": "Who will win the 2024 US Presidential Election?",
            "spread_pct": 5.0,
            "net_profit_usd": 4.10,
            "confidence": 0.78,
            "risk_score": 4,
            "direction": "poly_internal",
            "time_sensitive": True,
        },
    ]


async def _get_opportunity(opportunity_id: str) -> Optional[Dict]:
    """Get specific opportunity by ID"""
    opportunities = await _scan_markets()
    for opp in opportunities:
        if opp["id"] == opportunity_id:
            return opp
    return None


async def _get_orderbook(market_id: str) -> Dict:
    """
    Get L2 orderbook for market

    In production, would fetch from WebSocket cache
    """
    from app.models.arbitrage import L2OrderBook, OrderBookLevel

    # Demo orderbook
    return L2OrderBook(
        market_id=market_id,
        token_id=f"token-{market_id}",
        outcome="yes" if "yes" in market_id else "no",
        bids=[
            OrderBookLevel(price=51.0, size=5000),
            OrderBookLevel(price=50.0, size=3000),
            OrderBookLevel(price=49.0, size=2000),
        ],
        asks=[
            OrderBookLevel(price=52.0, size=4000),
            OrderBookLevel(price=53.0, size=6000),
            OrderBookLevel(price=54.0, size=8000),
        ],
        last_update=int(datetime.now().timestamp() * 1000),
    ).__dict__


def _assess_risk(opportunity: Dict, slippage_cents: float) -> RiskAssessment:
    """Assess risk for opportunity"""
    liquidity_risk = 8 if opportunity["available_liquidity"] < 1000 else 3
    execution_risk = 7 if slippage_cents > 2 else 3
    timing_risk = 6 if opportunity["time_sensitive"] else 2

    overall_risk_score = (
        liquidity_risk * 0.3 + execution_risk * 0.4 + timing_risk * 0.3
    )

    if overall_risk_score <= 3:
        overall_risk = "low"
    elif overall_risk_score <= 5:
        overall_risk = "medium"
    elif overall_risk_score <= 7:
        overall_risk = "high"
    else:
        overall_risk = "extreme"

    warnings = []
    if liquidity_risk >= 7:
        warnings.append("Low liquidity - high slippage expected")
    if execution_risk >= 7:
        warnings.append("High expected slippage")
    if timing_risk >= 6:
        warnings.append("Time-sensitive opportunity - requires fast execution")

    return RiskAssessment(
        overall_risk=overall_risk,
        liquidity_risk=liquidity_risk,
        execution_risk=execution_risk,
        timing_risk=timing_risk,
        warnings=warnings,
    )
