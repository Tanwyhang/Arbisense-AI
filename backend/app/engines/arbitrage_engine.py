"""
Arbitrage Engine
Real-time cross-platform arbitrage detection, profit calculation, and signal generation
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import math

logger = logging.getLogger(__name__)


class ArbitrageDirection(Enum):
    POLY_TO_LIMITLESS = "poly_to_limitless"
    LIMITLESS_TO_POLY = "limitless_to_poly"
    POLY_INTERNAL = "poly_internal"  # Yes/No mispricing within Polymarket


class SignalStrength(Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"
    VERY_STRONG = "very_strong"


class AlertPriority(Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ArbitrageOpportunity:
    """Detected arbitrage opportunity"""
    id: str
    
    # Market identifiers
    polymarket_market_id: str
    polymarket_question: str
    limitless_pool: Optional[str] = None
    
    # Prices
    polymarket_yes_price: float = 0.0
    polymarket_no_price: float = 0.0
    limitless_price: Optional[float] = None
    
    # Spread analysis
    spread_pct: float = 0.0
    spread_absolute: float = 0.0
    direction: ArbitrageDirection = ArbitrageDirection.POLY_INTERNAL
    action: str = ""
    
    # Profit calculation
    gross_profit_pct: float = 0.0
    estimated_gas_cost: float = 0.0
    platform_fees: float = 0.0
    net_profit_pct: float = 0.0
    net_profit_usd: float = 0.0
    
    # Execution feasibility
    min_size: float = 10.0
    max_size: float = 1000.0
    available_liquidity: float = 0.0
    slippage_estimate: float = 0.0
    
    # Risk metrics
    confidence: float = 0.0
    risk_score: int = 5  # 1-10
    
    # Timing
    discovered_at: int = 0
    expires_at: Optional[int] = None
    time_sensitive: bool = False
    
    # Status
    status: str = "active"


@dataclass
class ArbitrageSignal:
    """Trading signal for an arbitrage opportunity"""
    id: str
    opportunity_id: str
    
    type: str  # 'entry', 'exit', 'hold', 'warning'
    strength: SignalStrength = SignalStrength.MODERATE
    confidence_score: float = 0.0
    
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    target_profit_pct: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    
    recommendation: str = ""
    rationale: str = ""
    
    generated_at: int = 0
    valid_until: int = 0
    status: str = "active"


@dataclass
class ArbitrageAlert:
    """Alert notification for significant events"""
    id: str
    priority: AlertPriority
    category: str  # 'opportunity', 'execution', 'risk', 'system'
    
    title: str
    message: str
    details: Optional[Dict] = None
    
    opportunity_id: Optional[str] = None
    
    created_at: int = 0
    acknowledged: bool = False


@dataclass
class ArbitrageConfig:
    """Configuration for arbitrage detection"""
    # Thresholds
    min_spread_pct: float = 0.5
    min_profit_usd: float = 1.0
    max_risk_score: int = 8
    
    # Size limits
    min_trade_size_usd: float = 10.0
    max_trade_size_usd: float = 10000.0
    
    # Fee assumptions
    polymarket_fee_pct: float = 0.3
    limitless_fee_pct: float = 0.3
    default_slippage_pct: float = 0.1
    
    # Gas settings (in USD)
    base_gas_cost_usd: float = 0.50
    max_gas_cost_usd: float = 5.0
    
    # Timing
    signal_validity_seconds: int = 60
    stale_data_threshold_ms: int = 5000
    
    # Alerts
    high_spread_threshold_pct: float = 2.0


class ArbitrageEngine:
    """
    Real-time arbitrage detection and analysis engine.
    
    Features:
    - Cross-platform spread calculation (Polymarket vs Limitless)
    - Fee-adjusted profit calculation
    - Signal generation with confidence scores
    - Alert system for threshold breaches
    """
    
    def __init__(self, config: Optional[ArbitrageConfig] = None):
        self.config = config or ArbitrageConfig()
        
        # Opportunity tracking
        self.opportunities: Dict[str, ArbitrageOpportunity] = {}
        self.signals: List[ArbitrageSignal] = []
        self.alerts: List[ArbitrageAlert] = []
        
        # Asset matching
        self.asset_mappings: Dict[str, str] = {}  # polymarket_id -> limitless_pool
        
        # Market data caches (populated by services)
        self.polymarket_prices: Dict[str, Dict] = {}
        self.limitless_prices: Dict[str, Dict] = {}
        self.polymarket_orderbooks: Dict[str, Dict] = {}
        
        # Metrics
        self.total_opportunities_found = 0
        self.profitable_opportunities_count = 0
        
        # Running state
        self._running = False
        self._scan_task: Optional[asyncio.Task] = None
        self._opportunity_counter = 0
        self._signal_counter = 0
        self._alert_counter = 0
        
        # Callbacks
        self.on_opportunity: Optional[callable] = None
        self.on_signal: Optional[callable] = None
        self.on_alert: Optional[callable] = None
    
    async def start(self):
        """Start the arbitrage engine"""
        self._running = True
        self._scan_task = asyncio.create_task(self._scan_loop())
        logger.info("Arbitrage engine started")
    
    async def stop(self):
        """Stop the arbitrage engine"""
        self._running = False
        if self._scan_task:
            self._scan_task.cancel()
            try:
                await self._scan_task
            except asyncio.CancelledError:
                pass
        logger.info("Arbitrage engine stopped")
    
    async def _scan_loop(self):
        """Background scanning loop"""
        while self._running:
            try:
                await self.scan_for_opportunities()
                await asyncio.sleep(1)  # Scan every second
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scan loop error: {e}")
                await asyncio.sleep(1)
    
    # =========================================================================
    # Price Updates
    # =========================================================================
    
    def update_polymarket_price(
        self,
        market_id: str,
        yes_price: float,
        no_price: float,
        question: str = "",
        liquidity: float = 0.0
    ):
        """Update Polymarket price data"""
        self.polymarket_prices[market_id] = {
            "yes_price": yes_price,
            "no_price": no_price,
            "question": question,
            "liquidity": liquidity,
            "updated_at": int(datetime.now().timestamp() * 1000)
        }
    
    def update_limitless_price(
        self,
        pool_address: str,
        price: float,
        pair: str = "",
        liquidity: float = 0.0
    ):
        """Update Limitless price data"""
        self.limitless_prices[pool_address] = {
            "price": price,
            "pair": pair,
            "liquidity": liquidity,
            "updated_at": int(datetime.now().timestamp() * 1000)
        }
    
    def update_orderbook(self, market_id: str, orderbook: Dict):
        """Update order book data"""
        self.polymarket_orderbooks[market_id] = {
            **orderbook,
            "updated_at": int(datetime.now().timestamp() * 1000)
        }
    
    def add_asset_mapping(self, polymarket_id: str, limitless_pool: str):
        """Add a mapping between Polymarket market and Limitless pool"""
        self.asset_mappings[polymarket_id] = limitless_pool
    
    # =========================================================================
    # Opportunity Detection
    # =========================================================================
    
    async def scan_for_opportunities(self) -> List[ArbitrageOpportunity]:
        """Scan for arbitrage opportunities across all tracked markets"""
        opportunities = []
        
        # Scan Polymarket internal arbitrage (Yes + No != 1)
        for market_id, data in self.polymarket_prices.items():
            if self._is_data_stale(data.get("updated_at", 0)):
                continue
            
            opp = self._check_polymarket_internal(market_id, data)
            if opp:
                opportunities.append(opp)
        
        # Scan cross-platform arbitrage
        for poly_id, limitless_pool in self.asset_mappings.items():
            if poly_id not in self.polymarket_prices:
                continue
            if limitless_pool not in self.limitless_prices:
                continue
            
            poly_data = self.polymarket_prices[poly_id]
            limitless_data = self.limitless_prices[limitless_pool]
            
            if self._is_data_stale(poly_data.get("updated_at", 0)):
                continue
            if self._is_data_stale(limitless_data.get("updated_at", 0)):
                continue
            
            opp = self._check_cross_platform(poly_id, poly_data, limitless_pool, limitless_data)
            if opp:
                opportunities.append(opp)
        
        # Update opportunities map and generate signals/alerts
        for opp in opportunities:
            existing = self.opportunities.get(opp.id)
            self.opportunities[opp.id] = opp
            
            if not existing:
                self.total_opportunities_found += 1
                await self._on_new_opportunity(opp)
            elif abs(opp.spread_pct - existing.spread_pct) > 0.1:
                await self._on_opportunity_update(opp, existing)
        
        return opportunities
    
    def _check_polymarket_internal(
        self,
        market_id: str,
        data: Dict
    ) -> Optional[ArbitrageOpportunity]:
        """Check for internal Polymarket mispricing (Yes + No != 1)"""
        yes_price = data.get("yes_price", 0)
        no_price = data.get("no_price", 0)
        
        if yes_price <= 0 or no_price <= 0:
            return None
        
        total = yes_price + no_price
        spread = abs(1.0 - total)
        spread_pct = spread * 100
        
        if spread_pct < self.config.min_spread_pct:
            return None
        
        # Determine action
        if total < 1.0:
            action = "buy_both"  # Buy both Yes and No
            gross_profit_pct = (1.0 - total) / total * 100
        else:
            action = "sell_both"  # Arbitrage not possible without shorting
            return None  # Skip for now
        
        # Calculate profit
        profit = self._calculate_profit(
            entry_price=total,
            exit_price=1.0,
            size_usd=100.0,
            direction=ArbitrageDirection.POLY_INTERNAL
        )
        
        if profit["net_profit_usd"] < self.config.min_profit_usd:
            return None
        
        self._opportunity_counter += 1
        
        return ArbitrageOpportunity(
            id=f"poly_internal_{market_id}_{self._opportunity_counter}",
            polymarket_market_id=market_id,
            polymarket_question=data.get("question", ""),
            polymarket_yes_price=yes_price,
            polymarket_no_price=no_price,
            spread_pct=spread_pct,
            spread_absolute=spread,
            direction=ArbitrageDirection.POLY_INTERNAL,
            action=action,
            gross_profit_pct=gross_profit_pct,
            estimated_gas_cost=profit["gas_cost"],
            platform_fees=profit["fees"],
            net_profit_pct=profit["net_profit_pct"],
            net_profit_usd=profit["net_profit_usd"],
            available_liquidity=data.get("liquidity", 0),
            confidence=self._calculate_confidence(spread_pct, data.get("liquidity", 0)),
            risk_score=self._calculate_risk_score(spread_pct, data.get("liquidity", 0)),
            discovered_at=int(datetime.now().timestamp() * 1000),
            time_sensitive=spread_pct > 1.0
        )
    
    def _check_cross_platform(
        self,
        poly_id: str,
        poly_data: Dict,
        limitless_pool: str,
        limitless_data: Dict
    ) -> Optional[ArbitrageOpportunity]:
        """Check for cross-platform arbitrage opportunity"""
        poly_yes = poly_data.get("yes_price", 0)
        limitless_price = limitless_data.get("price", 0)
        
        if poly_yes <= 0 or limitless_price <= 0:
            return None
        
        # Calculate spread
        spread = abs(poly_yes - limitless_price)
        spread_pct = spread / min(poly_yes, limitless_price) * 100
        
        if spread_pct < self.config.min_spread_pct:
            return None
        
        # Determine direction and action
        if poly_yes < limitless_price:
            direction = ArbitrageDirection.POLY_TO_LIMITLESS
            action = "buy_poly_yes"
        else:
            direction = ArbitrageDirection.LIMITLESS_TO_POLY
            action = "buy_limitless"
        
        # Calculate profit
        entry_price = min(poly_yes, limitless_price)
        exit_price = max(poly_yes, limitless_price)
        
        profit = self._calculate_profit(
            entry_price=entry_price,
            exit_price=exit_price,
            size_usd=100.0,
            direction=direction
        )
        
        if profit["net_profit_usd"] < self.config.min_profit_usd:
            return None
        
        self._opportunity_counter += 1
        
        return ArbitrageOpportunity(
            id=f"cross_{poly_id}_{self._opportunity_counter}",
            polymarket_market_id=poly_id,
            polymarket_question=poly_data.get("question", ""),
            limitless_pool=limitless_pool,
            polymarket_yes_price=poly_yes,
            polymarket_no_price=poly_data.get("no_price", 0),
            limitless_price=limitless_price,
            spread_pct=spread_pct,
            spread_absolute=spread,
            direction=direction,
            action=action,
            gross_profit_pct=profit["gross_profit_pct"],
            estimated_gas_cost=profit["gas_cost"],
            platform_fees=profit["fees"],
            net_profit_pct=profit["net_profit_pct"],
            net_profit_usd=profit["net_profit_usd"],
            available_liquidity=min(
                poly_data.get("liquidity", 0),
                limitless_data.get("liquidity", 0)
            ),
            confidence=self._calculate_confidence(
                spread_pct,
                min(poly_data.get("liquidity", 0), limitless_data.get("liquidity", 0))
            ),
            risk_score=self._calculate_risk_score(
                spread_pct,
                min(poly_data.get("liquidity", 0), limitless_data.get("liquidity", 0))
            ),
            discovered_at=int(datetime.now().timestamp() * 1000),
            time_sensitive=True  # Cross-platform always time-sensitive
        )
    
    # =========================================================================
    # Profit Calculation
    # =========================================================================
    
    def _calculate_profit(
        self,
        entry_price: float,
        exit_price: float,
        size_usd: float,
        direction: ArbitrageDirection
    ) -> Dict[str, float]:
        """Calculate fee-adjusted profit"""
        gross_spread = exit_price - entry_price
        gross_profit_pct = (gross_spread / entry_price) * 100 if entry_price > 0 else 0
        gross_profit_usd = size_usd * (gross_spread / entry_price) if entry_price > 0 else 0
        
        # Calculate fees
        entry_fee = size_usd * (self.config.polymarket_fee_pct / 100)
        exit_fee = size_usd * (self.config.limitless_fee_pct / 100 if direction != ArbitrageDirection.POLY_INTERNAL else self.config.polymarket_fee_pct / 100)
        slippage = size_usd * (self.config.default_slippage_pct / 100)
        
        # Gas cost (double for cross-platform)
        gas_cost = self.config.base_gas_cost_usd
        if direction != ArbitrageDirection.POLY_INTERNAL:
            gas_cost *= 2
        
        total_fees = entry_fee + exit_fee + slippage
        total_costs = total_fees + gas_cost
        
        net_profit_usd = gross_profit_usd - total_costs
        net_profit_pct = (net_profit_usd / size_usd) * 100 if size_usd > 0 else 0
        
        return {
            "gross_profit_pct": gross_profit_pct,
            "gross_profit_usd": gross_profit_usd,
            "fees": total_fees,
            "gas_cost": gas_cost,
            "net_profit_usd": net_profit_usd,
            "net_profit_pct": net_profit_pct
        }
    
    def calculate_optimal_size(
        self,
        opportunity: ArbitrageOpportunity
    ) -> Dict[str, float]:
        """Calculate optimal trade size for an opportunity"""
        # Start with max size
        max_size = min(
            self.config.max_trade_size_usd,
            opportunity.available_liquidity * 0.1  # Max 10% of liquidity
        )
        
        # Find breakeven size (where fees equal profit)
        min_profitable_size = self.config.base_gas_cost_usd / (
            opportunity.gross_profit_pct / 100 - 
            (self.config.polymarket_fee_pct + self.config.limitless_fee_pct + self.config.default_slippage_pct) / 100
        ) if opportunity.gross_profit_pct > 0 else float('inf')
        
        if min_profitable_size < 0 or min_profitable_size > max_size:
            return {
                "is_profitable": False,
                "optimal_size": 0,
                "min_profitable_size": min_profitable_size,
                "max_size": max_size
            }
        
        # Optimal size is somewhere between min and max
        # Use a simple heuristic: 50% of max size if profitable
        optimal_size = min(max_size, max(min_profitable_size * 2, 100))
        
        return {
            "is_profitable": True,
            "optimal_size": optimal_size,
            "min_profitable_size": min_profitable_size,
            "max_size": max_size
        }
    
    # =========================================================================
    # Signal Generation
    # =========================================================================
    
    def _generate_signal(
        self,
        opportunity: ArbitrageOpportunity
    ) -> ArbitrageSignal:
        """Generate a trading signal for an opportunity"""
        self._signal_counter += 1
        
        # Determine signal strength
        if opportunity.net_profit_pct >= 2.0:
            strength = SignalStrength.VERY_STRONG
        elif opportunity.net_profit_pct >= 1.0:
            strength = SignalStrength.STRONG
        elif opportunity.net_profit_pct >= 0.5:
            strength = SignalStrength.MODERATE
        else:
            strength = SignalStrength.WEAK
        
        # Generate recommendation
        if opportunity.risk_score <= 3 and opportunity.confidence >= 0.7:
            recommendation = "execute"
            urgency = "immediate" if opportunity.time_sensitive else "soon"
        elif opportunity.risk_score <= 5:
            recommendation = "wait"
            urgency = "monitor"
        else:
            recommendation = "skip"
            urgency = "monitor"
        
        now = int(datetime.now().timestamp() * 1000)
        
        return ArbitrageSignal(
            id=f"sig_{self._signal_counter}",
            opportunity_id=opportunity.id,
            type="entry",
            strength=strength,
            confidence_score=opportunity.confidence * 100,
            entry_price=opportunity.polymarket_yes_price,
            target_profit_pct=opportunity.net_profit_pct,
            stop_loss_pct=-opportunity.net_profit_pct * 0.5,  # Stop at half the profit
            recommendation=recommendation,
            rationale=f"Spread: {opportunity.spread_pct:.2f}%, Net profit: {opportunity.net_profit_pct:.2f}%, Risk: {opportunity.risk_score}/10",
            generated_at=now,
            valid_until=now + self.config.signal_validity_seconds * 1000,
            status="active"
        )
    
    # =========================================================================
    # Alerts
    # =========================================================================
    
    def _generate_alert(
        self,
        opportunity: ArbitrageOpportunity,
        alert_type: str = "opportunity"
    ) -> ArbitrageAlert:
        """Generate an alert for an opportunity"""
        self._alert_counter += 1
        
        # Determine priority
        if opportunity.spread_pct >= self.config.high_spread_threshold_pct:
            priority = AlertPriority.HIGH
        elif opportunity.net_profit_pct >= 1.0:
            priority = AlertPriority.MEDIUM
        else:
            priority = AlertPriority.LOW
        
        return ArbitrageAlert(
            id=f"alert_{self._alert_counter}",
            priority=priority,
            category=alert_type,
            title=f"Arbitrage: {opportunity.spread_pct:.2f}% spread",
            message=f"{opportunity.polymarket_question[:50]}... - Net profit: ${opportunity.net_profit_usd:.2f}",
            details={
                "spread_pct": opportunity.spread_pct,
                "net_profit_usd": opportunity.net_profit_usd,
                "direction": opportunity.direction.value
            },
            opportunity_id=opportunity.id,
            created_at=int(datetime.now().timestamp() * 1000)
        )
    
    # =========================================================================
    # Helpers
    # =========================================================================
    
    def _is_data_stale(self, updated_at: int) -> bool:
        """Check if data is too old"""
        now = int(datetime.now().timestamp() * 1000)
        return (now - updated_at) > self.config.stale_data_threshold_ms
    
    def _calculate_confidence(self, spread_pct: float, liquidity: float) -> float:
        """Calculate confidence score (0-1)"""
        # Higher spread = higher confidence up to a point
        spread_factor = min(spread_pct / 5.0, 1.0)
        
        # Higher liquidity = higher confidence
        liquidity_factor = min(liquidity / 10000, 1.0)
        
        return (spread_factor * 0.6 + liquidity_factor * 0.4)
    
    def _calculate_risk_score(self, spread_pct: float, liquidity: float) -> int:
        """Calculate risk score (1-10, lower is better)"""
        # Very high spreads can indicate data issues
        if spread_pct > 10:
            return 9
        
        # Low liquidity = higher risk
        if liquidity < 1000:
            liquidity_risk = 3
        elif liquidity < 10000:
            liquidity_risk = 2
        else:
            liquidity_risk = 1
        
        # Base risk
        base_risk = 3
        
        return min(10, max(1, base_risk + liquidity_risk))
    
    async def _on_new_opportunity(self, opportunity: ArbitrageOpportunity):
        """Handle new opportunity detection"""
        signal = self._generate_signal(opportunity)
        self.signals.append(signal)
        
        if opportunity.spread_pct >= self.config.high_spread_threshold_pct:
            alert = self._generate_alert(opportunity)
            self.alerts.append(alert)
            
            if self.on_alert:
                await self.on_alert(alert)
        
        if self.on_opportunity:
            await self.on_opportunity(opportunity)
        
        if self.on_signal:
            await self.on_signal(signal)
        
        logger.info(
            f"New opportunity: {opportunity.id} - "
            f"Spread: {opportunity.spread_pct:.2f}%, "
            f"Net profit: ${opportunity.net_profit_usd:.2f}"
        )
    
    async def _on_opportunity_update(
        self,
        opportunity: ArbitrageOpportunity,
        previous: ArbitrageOpportunity
    ):
        """Handle opportunity update"""
        if self.on_opportunity:
            await self.on_opportunity(opportunity)
    
    # =========================================================================
    # Data Access
    # =========================================================================
    
    def get_active_opportunities(self) -> List[ArbitrageOpportunity]:
        """Get all active opportunities"""
        return [
            opp for opp in self.opportunities.values()
            if opp.status == "active"
        ]
    
    def get_recent_signals(self, limit: int = 10) -> List[ArbitrageSignal]:
        """Get recent signals"""
        return self.signals[-limit:]
    
    def get_unacknowledged_alerts(self) -> List[ArbitrageAlert]:
        """Get unacknowledged alerts"""
        return [a for a in self.alerts if not a.acknowledged]
    
    def acknowledge_alert(self, alert_id: str):
        """Acknowledge an alert"""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                break
    
    def get_status(self) -> dict:
        """Get engine status"""
        return {
            "running": self._running,
            "total_opportunities_found": self.total_opportunities_found,
            "active_opportunities": len(self.get_active_opportunities()),
            "active_signals": len([s for s in self.signals if s.status == "active"]),
            "pending_alerts": len(self.get_unacknowledged_alerts()),
            "tracked_polymarket_markets": len(self.polymarket_prices),
            "tracked_limitless_pools": len(self.limitless_prices),
            "asset_mappings": len(self.asset_mappings)
        }
    
    def to_broadcast_format(self) -> dict:
        """Format data for WebSocket broadcast"""
        opportunities = self.get_active_opportunities()
        
        return {
            "type": "arbitrage_update",
            "data": {
                "opportunities": [
                    {
                        "id": o.id,
                        "question": o.polymarket_question[:100],
                        "spread_pct": round(o.spread_pct, 2),
                        "net_profit_usd": round(o.net_profit_usd, 2),
                        "direction": o.direction.value,
                        "action": o.action,
                        "confidence": round(o.confidence, 2),
                        "risk_score": o.risk_score,
                        "time_sensitive": o.time_sensitive
                    }
                    for o in sorted(opportunities, key=lambda x: -x.net_profit_usd)[:10]
                ],
                "signals": [
                    {
                        "id": s.id,
                        "strength": s.strength.value,
                        "recommendation": s.recommendation,
                        "confidence": round(s.confidence_score, 1)
                    }
                    for s in self.get_recent_signals(5)
                ],
                "alerts": [
                    {
                        "id": a.id,
                        "priority": a.priority.value,
                        "title": a.title,
                        "message": a.message
                    }
                    for a in self.get_unacknowledged_alerts()[:5]
                ],
                "status": self.get_status(),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        }


# Singleton instance
_arbitrage_engine: Optional[ArbitrageEngine] = None


def get_arbitrage_engine() -> ArbitrageEngine:
    """Get or create the arbitrage engine singleton"""
    global _arbitrage_engine
    if _arbitrage_engine is None:
        _arbitrage_engine = ArbitrageEngine()
    return _arbitrage_engine
