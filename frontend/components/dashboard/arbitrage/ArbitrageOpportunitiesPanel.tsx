'use client';

import React, { useMemo } from 'react';
import { useMarketData } from '@/contexts/MarketDataContext';

interface ArbitrageOpportunitiesPanelProps {
  maxItems?: number;
}

export default function ArbitrageOpportunitiesPanel({ maxItems = 15 }: ArbitrageOpportunitiesPanelProps) {
  const { arbitrageOpportunities, isArbitrageConnected, arbitrageStatus } = useMarketData();
  
  // Sort by net profit
  const sortedOpportunities = useMemo(() => {
    return [...arbitrageOpportunities]
      .sort((a, b) => b.net_profit_usd - a.net_profit_usd)
      .slice(0, maxItems);
  }, [arbitrageOpportunities, maxItems]);
  
  // Get risk color
  const getRiskColor = (score: number) => {
    if (score <= 3) return 'var(--success-ag-green)';
    if (score <= 5) return 'var(--accent-amber)';
    if (score <= 7) return 'var(--accent-safety-yellow)';
    return 'var(--alert-signal-red)';
  };
  
  // Get signal strength color
  const getStrengthColor = (confidence: number) => {
    if (confidence >= 0.7) return 'var(--success-ag-green)';
    if (confidence >= 0.4) return 'var(--accent-amber)';
    return 'var(--text-muted)';
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
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isArbitrageConnected ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
            animation: sortedOpportunities.length > 0 && isArbitrageConnected ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            {sortedOpportunities.length} OPPORTUNITIES
          </span>
        </div>
        
        {/* Engine status */}
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          padding: '2px 6px',
          background: arbitrageStatus?.engine_status === 'running' 
            ? 'rgba(0, 200, 117, 0.1)' 
            : 'rgba(254, 56, 85, 0.1)',
          color: arbitrageStatus?.engine_status === 'running'
            ? 'var(--success-ag-green)'
            : 'var(--alert-signal-red)',
          border: `1px solid ${arbitrageStatus?.engine_status === 'running' ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`
        }}>
          {arbitrageStatus?.engine_status?.toUpperCase() || 'UNKNOWN'}
        </span>
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
            <div>{isArbitrageConnected ? 'Scanning for opportunities...' : 'Disconnected'}</div>
            {isArbitrageConnected && (
              <div style={{ fontSize: '0.7rem' }}>
                Tracked markets: {arbitrageStatus?.tracked_polymarket_markets || 0}
              </div>
            )}
          </div>
        ) : (
          sortedOpportunities.map((opp, index) => (
            <OpportunityCard
              key={opp.id || index}
              opportunity={opp}
              getRiskColor={getRiskColor}
              getStrengthColor={getStrengthColor}
              rank={index + 1}
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
        <span>
          Total found (24h): {arbitrageStatus?.total_opportunities_found || 0}
        </span>
        <span>
          Active signals: {arbitrageStatus?.active_signals || 0}
        </span>
      </div>
    </div>
  );
}

// Opportunity card component
const OpportunityCard = React.memo(({
  opportunity,
  getRiskColor,
  getStrengthColor,
  rank
}: {
  opportunity: any;
  getRiskColor: (score: number) => string;
  getStrengthColor: (confidence: number) => string;
  rank: number;
}) => {
  const isTimeSensitive = opportunity.time_sensitive;
  
  return (
    <div style={{
      padding: 'var(--space-3)',
      marginBottom: 'var(--space-2)',
      border: '1px solid var(--border-dim)',
      background: 'var(--bg-layer-2)',
      borderLeft: `3px solid ${opportunity.net_profit_usd > 5 ? 'var(--success-ag-green)' : 'var(--accent-amber)'}`,
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent-financial-blue)';
      e.currentTarget.style.background = 'var(--bg-layer-3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-dim)';
      e.currentTarget.style.background = 'var(--bg-layer-2)';
    }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-2)'
      }}>
        {/* Rank and title */}
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
            {isTimeSensitive && (
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
            {opportunity.question || 'Unknown Market'}
          </div>
        </div>
        
        {/* Profit badge */}
        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--success-ag-green)'
          }}>
            +${opportunity.net_profit_usd?.toFixed(2) || '0.00'}
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)'
          }}>
            {opportunity.net_profit_pct?.toFixed(2) || '0.00'}% net
          </div>
        </div>
      </div>
      
      {/* Metrics row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) 0',
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)'
      }}>
        {/* Spread */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            SPREAD
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--accent-amber)'
          }}>
            {opportunity.spread_pct?.toFixed(2) || '0.00'}%
          </div>
        </div>
        
        {/* Direction */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            DIRECTION
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--accent-cyan)'
          }}>
            {opportunity.direction?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
          </div>
        </div>
        
        {/* Confidence */}
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            CONF
          </div>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: getStrengthColor(opportunity.confidence || 0)
          }}>
            {((opportunity.confidence || 0) * 100).toFixed(0)}%
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
            color: getRiskColor(opportunity.risk_score || 5)
          }}>
            {opportunity.risk_score || 5}/10
          </div>
        </div>
      </div>
      
      {/* Action row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'var(--space-2)'
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.7rem',
          padding: '2px 8px',
          background: 'rgba(0, 102, 255, 0.1)',
          color: 'var(--accent-financial-blue)',
          border: '1px solid var(--accent-financial-blue)'
        }}>
          {opportunity.action?.replace(/_/g, ' ').toUpperCase() || 'VIEW'}
        </span>
        
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)'
        }}>
          ID: {opportunity.id?.substring(0, 12) || 'N/A'}
        </span>
      </div>
    </div>
  );
});

OpportunityCard.displayName = 'OpportunityCard';
