'use client';

import React, { useState, useMemo } from 'react';
import {
  ArbitrageStrategy,
  type ArbitrageAnalysisResult,
  type CircuitBreakerState,
  type L2OrderBook,
} from '@/lib/arbitrage';

// ============================================================================
// DEMO DATA (Replace with real WebSocket data in production)
// ============================================================================

const generateDemoOpportunities = (): ArbitrageAnalysisResult[] => {
  const opportunities: ArbitrageAnalysisResult[] = [];

  // Single-market arbitrage
  opportunities.push({
    opportunity: {
      id: 'single-1',
      polymarket_market_id: 'market-1',
      polymarket_question: 'Bitcoin > $100,000 by end of 2024?',
      polymarket_yes_price: 0.52,
      polymarket_no_price: 0.45,
      spread_pct: 3,
      spread_absolute: 0.03,
      direction: 'poly_internal',
      action: 'buy_poly_yes',
      gross_profit_pct: 3,
      estimated_gas_cost: 0.03,
      platform_fees: 0,
      net_profit_pct: 2.5,
      net_profit_usd: 2.5,
      min_size: 10,
      max_size: 5000,
      available_liquidity: 15000,
      slippage_estimate: 0.1,
      confidence: 0.92,
      risk_score: 1,
      discovered_at: Date.now(),
      time_sensitive: true,
      status: 'active',
    },
    can_execute: true,
    optimal_size_usd: 2500,
    expected_slippage_cents: 0.5,
    vwap_yes: 52,
    vwap_no: 45,
    confidence_score: 0.92,
    risk_assessment: {
      overall_risk: 'low',
      liquidity_risk: 2,
      execution_risk: 2,
      timing_risk: 2,
      warnings: [],
    },
    execution_plan: {
      yes_leg_size: 2500,
      no_leg_size: 2500,
      total_cost_usd: 2425,
      expected_profit_usd: 75,
      gas_estimate_usd: 0.06,
    },
    validation_errors: [],
  });

  // Multi-outcome arbitrage (election)
  opportunities.push({
    opportunity: {
      id: 'multi-1',
      polymarket_market_id: 'market-2',
      polymarket_question: 'Who will win the 2024 US Presidential Election?',
      polymarket_yes_price: 0.95, // Sum of all candidates
      polymarket_no_price: 0,
      spread_pct: 5,
      spread_absolute: 0.05,
      direction: 'poly_internal',
      action: 'buy_poly_yes',
      gross_profit_pct: 5,
      estimated_gas_cost: 0.09,
      platform_fees: 0,
      net_profit_pct: 4.1,
      net_profit_usd: 4.1,
      min_size: 25,
      max_size: 3000,
      available_liquidity: 8000,
      slippage_estimate: 0.4,
      confidence: 0.78,
      risk_score: 4,
      discovered_at: Date.now(),
      time_sensitive: true,
      status: 'active',
    },
    can_execute: true,
    optimal_size_usd: 1800,
    expected_slippage_cents: 1.5,
    vwap_yes: 95,
    vwap_no: 0,
    confidence_score: 0.78,
    risk_assessment: {
      overall_risk: 'medium',
      liquidity_risk: 4,
      execution_risk: 4,
      timing_risk: 3,
      warnings: ['Multi-outcome execution requires 3+ trades', 'Higher slippage expected'],
    },
    execution_plan: {
      yes_leg_size: 600,
      no_leg_size: 600,
      total_cost_usd: 1725,
      expected_profit_usd: 75,
      gas_estimate_usd: 0.09,
    },
    validation_errors: [],
  });

  // Cross-platform arbitrage
  opportunities.push({
    opportunity: {
      id: 'cross-1',
      polymarket_market_id: 'market-3',
      polymarket_question: 'Ethereum > $5,000 by Q1 2025?',
      polymarket_yes_price: 0.61,
      polymarket_no_price: 0,
      limitless_price: 0.35,
      spread_pct: 4,
      spread_absolute: 0.04,
      direction: 'poly_to_limitless',
      action: 'buy_poly_yes',
      gross_profit_pct: 4,
      estimated_gas_cost: 0.06,
      platform_fees: 0,
      net_profit_pct: 3.2,
      net_profit_usd: 3.2,
      min_size: 10,
      max_size: 2000,
      available_liquidity: 5000,
      slippage_estimate: 0.2,
      confidence: 0.85,
      risk_score: 2,
      discovered_at: Date.now(),
      time_sensitive: true,
      status: 'active',
    },
    can_execute: true,
    optimal_size_usd: 1200,
    expected_slippage_cents: 1,
    vwap_yes: 61,
    vwap_no: 35,
    confidence_score: 0.85,
    risk_assessment: {
      overall_risk: 'low',
      liquidity_risk: 3,
      execution_risk: 3,
      timing_risk: 4,
      warnings: ['Cross-platform timing risk'],
    },
    execution_plan: {
      yes_leg_size: 1200,
      no_leg_size: 1200,
      total_cost_usd: 1152,
      expected_profit_usd: 48,
      gas_estimate_usd: 0.06,
    },
    validation_errors: [],
  });

  return opportunities;
};

const generateDemoCircuitBreakerStatus = () => ({
  state: CircuitBreakerState.CLOSED,
  can_trade: true,
  error_count: 0,
  consecutive_errors: 0,
  daily_pnl_usd: 125.50,
  daily_loss_remaining_usd: 374.50,
  total_positions: 3,
  trip_time: null,
});

// ============================================================================
// COMPONENT
// ============================================================================

interface AdvancedArbitragePanelProps {
  maxItems?: number;
}

export default function AdvancedArbitragePanel({ maxItems = 10 }: AdvancedArbitragePanelProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ArbitrageStrategy | 'ALL'>('ALL');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);

  // Demo data (replace with real WebSocket data)
  const opportunities = useMemo(() => generateDemoOpportunities(), []);
  const circuitBreakerStatus = useMemo(() => generateDemoCircuitBreakerStatus(), []);

  // Filter by strategy
  const filteredOpportunities = useMemo(() => {
    if (selectedStrategy === 'ALL') return opportunities;
    return opportunities.filter(opp => {
      // Would need to add strategy type to opportunity
      return true;
    });
  }, [opportunities, selectedStrategy]);

  // Sort by confidence and profit
  const sortedOpportunities = useMemo(() => {
    return [...filteredOpportunities]
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, maxItems);
  }, [filteredOpportunities, maxItems]);

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'var(--success-ag-green)';
      case 'medium': return 'var(--accent-amber)';
      case 'high': return 'var(--accent-safety-yellow)';
      case 'extreme': return 'var(--alert-signal-red)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="panel-body" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            ADVANCED ARBITRAGE ENGINE
          </span>
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            padding: '2px 6px',
            background: 'rgba(0, 200, 117, 0.1)',
            color: 'var(--success-ag-green)',
            border: '1px solid var(--success-ag-green)'
          }}>
            MIGRATED FROM RUST BOT
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {/* Strategy filter */}
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value as any)}
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              padding: '4px 8px',
              background: 'var(--bg-layer-2)',
              color: 'var(--text-white)',
              border: '1px solid var(--border-dim)',
              borderRadius: 2
            }}
          >
            <option value="ALL">All Strategies</option>
            <option value={ArbitrageStrategy.SingleMarket}>Single Market</option>
            <option value={ArbitrageStrategy.CrossPlatform}>Cross Platform</option>
            <option value={ArbitrageStrategy.MultiOutcome}>Multi Outcome</option>
            <option value={ArbitrageStrategy.ThreeWayMarket}>3-Way Sports</option>
          </select>

          {/* Circuit breaker status */}
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            padding: '2px 6px',
            background: circuitBreakerStatus.can_trade
              ? 'rgba(0, 200, 117, 0.1)'
              : 'rgba(254, 56, 85, 0.1)',
            color: circuitBreakerStatus.can_trade
              ? 'var(--success-ag-green)'
              : 'var(--alert-signal-red)',
            border: `1px solid ${circuitBreakerStatus.can_trade ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`
          }}>
            CB: {circuitBreakerStatus.state}
          </div>
        </div>
      </div>

      {/* Circuit Breaker Info Bar */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--bg-layer-1)',
        borderBottom: '1px solid var(--border-dim)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-2)',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-data)',
        flexShrink: 0
      }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Daily P&L: </span>
          <span style={{ color: circuitBreakerStatus.daily_pnl_usd >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)', fontWeight: 700 }}>
            ${circuitBreakerStatus.daily_pnl_usd.toFixed(2)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Error Count: </span>
          <span style={{ color: 'var(--text-white)', fontWeight: 700 }}>
            {circuitBreakerStatus.error_count}/{circuitBreakerStatus.consecutive_errors}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Loss Limit: </span>
          <span style={{ color: 'var(--text-white)', fontWeight: 700 }}>
            ${circuitBreakerStatus.daily_loss_remaining_usd.toFixed(0)} remaining
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Open Positions: </span>
          <span style={{ color: 'var(--accent-financial-blue)', fontWeight: 700 }}>
            {circuitBreakerStatus.total_positions}
          </span>
        </div>
      </div>

      {/* Opportunities List */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-2)' }}>
        {sortedOpportunities.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            gap: 'var(--space-2)'
          }}>
            <div style={{ fontSize: '2rem', opacity: 0.5 }}>🔍</div>
            <div>No arbitrage opportunities found</div>
            <div style={{ fontSize: '0.7rem' }}>Waiting for market inefficiencies...</div>
          </div>
        ) : (
          sortedOpportunities.map((analysis, index) => (
            <AdvancedOpportunityCard
              key={analysis.opportunity.id}
              analysis={analysis}
              rank={index + 1}
              isSelected={selectedOpportunity === analysis.opportunity.id}
              onSelect={() => setSelectedOpportunity(
                selectedOpportunity === analysis.opportunity.id ? null : analysis.opportunity.id
              )}
              getRiskColor={getRiskColor}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        borderTop: '1px solid var(--border-dim)',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-data)',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>L2 VWAP Sizing: ENABLED</span>
        <span>Circuit Breaker: {circuitBreakerStatus.state}</span>
        <span>Position Tracking: ACTIVE</span>
      </div>
    </div>
  );
}

// ============================================================================
// OPPORTUNITY CARD COMPONENT
// ============================================================================

const AdvancedOpportunityCard = React.memo(({
  analysis,
  rank,
  isSelected,
  onSelect,
  getRiskColor,
}: {
  analysis: ArbitrageAnalysisResult;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  getRiskColor: (risk: string) => string;
}) => {
  const { opportunity, risk_assessment, execution_plan, confidence_score } = analysis;

  return (
    <div
      onClick={onSelect}
      style={{
        marginBottom: 'var(--space-2)',
        padding: 'var(--space-3)',
        background: isSelected ? 'var(--bg-layer-3)' : 'var(--bg-layer-2)',
        border: `1px solid ${isSelected ? 'var(--accent-financial-blue)' : 'var(--border-dim)'}`,
        borderLeft: `3px solid ${analysis.can_execute ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-2)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: '4px'
          }}>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-muted)'
            }}>
              #{rank}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.6rem',
              padding: '1px 4px',
              background: 'rgba(0, 102, 255, 0.1)',
              color: 'var(--accent-financial-blue)',
              border: '1px solid var(--accent-financial-blue)',
              fontWeight: 700
            }}>
              {opportunity.direction.replace(/_/g, ' ').toUpperCase()}
            </span>
            {opportunity.time_sensitive && (
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.6rem',
                padding: '1px 4px',
                background: 'rgba(254, 56, 85, 0.2)',
                color: 'var(--alert-signal-red)',
                border: '1px solid var(--alert-signal-red)',
                animation: 'pulse 1s infinite'
              }}>
                ⏱ URGENT
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.75rem',
            color: 'var(--text-white)',
            maxWidth: '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {opportunity.polymarket_question}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: analysis.can_execute ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
          }}>
            {analysis.can_execute ? '+' : ''}${opportunity.net_profit_usd?.toFixed(2) || '0.00'}
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)'
          }}>
            {(opportunity.net_profit_pct || 0).toFixed(2)}% net
          </div>
        </div>
      </div>

      {/* Advanced metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) 0',
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)'
      }}>
        {/* Confidence */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            CONFIDENCE
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: confidence_score >= 0.8 ? 'var(--success-ag-green)' : confidence_score >= 0.6 ? 'var(--accent-amber)' : 'var(--text-muted)'
          }}>
            {(confidence_score * 100).toFixed(0)}%
          </div>
        </div>

        {/* Risk */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            RISK
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: getRiskColor(risk_assessment.overall_risk)
          }}>
            {risk_assessment.overall_risk.toUpperCase()}
          </div>
        </div>

        {/* Optimal Size */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            OPTIMAL SIZE
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--accent-cyan)'
          }}>
            ${analysis.optimal_size_usd.toFixed(0)}
          </div>
        </div>

        {/* Slippage */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            EST. SLIPPAGE
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: analysis.expected_slippage_cents <= 1 ? 'var(--success-ag-green)' : 'var(--accent-amber)'
          }}>
            {analysis.expected_slippage_cents.toFixed(1)}¢
          </div>
        </div>
      </div>

      {/* Warnings */}
      {risk_assessment.warnings.length > 0 && (
        <div style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2)',
          background: 'rgba(254, 159, 67, 0.1)',
          border: '1px solid var(--accent-amber)',
          borderRadius: 2
        }}>
          {risk_assessment.warnings.slice(0, 2).map((warning, i) => (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.65rem',
                color: 'var(--accent-amber)',
                marginBottom: i < risk_assessment.warnings.length - 1 ? '2px' : 0
              }}
            >
              ⚠ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Execution plan (shown when selected) */}
      {isSelected && execution_plan && (
        <div style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2)',
          background: 'var(--bg-layer-1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-2)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-data)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>YES Leg</div>
            <div style={{ color: 'var(--accent-financial-blue)', fontWeight: 700 }}>
              ${execution_plan.yes_leg_size.toFixed(0)} @ {analysis.vwap_yes}¢
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>NO Leg</div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
              ${execution_plan.no_leg_size.toFixed(0)} @ {analysis.vwap_no}¢
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Expected Profit</div>
            <div style={{ color: 'var(--success-ag-green)', fontWeight: 700 }}>
              +${execution_plan.expected_profit_usd.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {analysis.validation_errors.length > 0 && (
        <div style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-2)',
          background: 'rgba(254, 56, 85, 0.1)',
          border: '1px solid var(--alert-signal-red)',
          borderRadius: 2
        }}>
          {analysis.validation_errors.map((error, i) => (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.65rem',
                color: 'var(--alert-signal-red)',
                marginBottom: i < analysis.validation_errors.length - 1 ? '2px' : 0
              }}
            >
              ❌ {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

AdvancedOpportunityCard.displayName = 'AdvancedOpportunityCard';
