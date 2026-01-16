'use client';

import React, { useState, useMemo, useCallback } from 'react';

interface ProfitCalculatorPanelProps {
  defaultEntryPrice?: number;
  defaultExitPrice?: number;
  defaultTradeSize?: number;
}

export default function ProfitCalculatorPanel({
  defaultEntryPrice = 0.45,
  defaultExitPrice = 0.52,
  defaultTradeSize = 100
}: ProfitCalculatorPanelProps) {
  // Input state
  const [entryPlatform, setEntryPlatform] = useState<'polymarket' | 'limitless'>('polymarket');
  const [exitPlatform, setExitPlatform] = useState<'polymarket' | 'limitless'>('limitless');
  const [entryPrice, setEntryPrice] = useState(defaultEntryPrice);
  const [exitPrice, setExitPrice] = useState(defaultExitPrice);
  const [tradeSize, setTradeSize] = useState(defaultTradeSize);
  
  // Fee settings
  const [polymarketFee, setPolymarketFee] = useState(0.3);
  const [limitlessFee, setLimitlessFee] = useState(0.3);
  const [gasPrice, setGasPrice] = useState(30); // gwei
  const [ethPrice, setEthPrice] = useState(3500);
  const [slippage, setSlippage] = useState(0.1);
  
  // Calculate results
  const calculation = useMemo(() => {
    // Gross spread
    const grossSpreadPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    const grossProfitUsd = tradeSize * (grossSpreadPct / 100);
    
    // Fees
    const entryFeeRate = entryPlatform === 'polymarket' ? polymarketFee : limitlessFee;
    const exitFeeRate = exitPlatform === 'polymarket' ? polymarketFee : limitlessFee;
    
    const entryFeeUsd = tradeSize * (entryFeeRate / 100);
    const exitFeeUsd = tradeSize * (exitFeeRate / 100);
    const slippageUsd = tradeSize * (slippage / 100);
    
    // Gas cost (simplified: assume 100k gas per transaction, 2 txs)
    const gasUsed = 200000;
    const gasCostEth = (gasUsed * gasPrice) / 1e9;
    const gasCostUsd = gasCostEth * ethPrice;
    
    // Total costs
    const totalFeesUsd = entryFeeUsd + exitFeeUsd + slippageUsd;
    const totalCostsUsd = totalFeesUsd + gasCostUsd;
    const totalFeesPct = (totalCostsUsd / tradeSize) * 100;
    
    // Net profit
    const netProfitUsd = grossProfitUsd - totalCostsUsd;
    const netProfitPct = (netProfitUsd / tradeSize) * 100;
    const returnOnCapital = (netProfitUsd / tradeSize) * 100;
    
    // Breakeven
    const breakevenSpreadPct = totalFeesPct;
    const profitMarginPct = grossSpreadPct - breakevenSpreadPct;
    
    // Min size for profit
    const fixedCosts = gasCostUsd;
    const variableCostRate = (entryFeeRate + exitFeeRate + slippage) / 100;
    const minSizeForProfit = fixedCosts / (grossSpreadPct / 100 - variableCostRate);
    
    return {
      grossSpreadPct,
      grossProfitUsd,
      entryFeeUsd,
      exitFeeUsd,
      slippageUsd,
      gasCostUsd,
      totalFeesUsd,
      totalCostsUsd,
      totalFeesPct,
      netProfitUsd,
      netProfitPct,
      returnOnCapital,
      breakevenSpreadPct,
      profitMarginPct,
      minSizeForProfit: Math.max(0, minSizeForProfit),
      isProfitable: netProfitUsd > 0
    };
  }, [entryPrice, exitPrice, tradeSize, entryPlatform, exitPlatform, polymarketFee, limitlessFee, gasPrice, ethPrice, slippage]);
  
  return (
    <div className="panel-body" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--border-dim)',
        fontFamily: 'var(--font-data)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        flexShrink: 0
      }}>
        FEE-ADJUSTED PROFIT CALCULATOR
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-3)' }}>
        {/* Platform Selection */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 1fr', 
            gap: 'var(--space-2)',
            alignItems: 'center'
          }}>
            {/* Entry Platform */}
            <div>
              <label style={labelStyle}>Entry Platform</label>
              <select
                value={entryPlatform}
                onChange={(e) => setEntryPlatform(e.target.value as any)}
                style={selectStyle}
              >
                <option value="polymarket">Polymarket</option>
                <option value="limitless">Limitless</option>
              </select>
            </div>
            
            <div style={{ 
              fontFamily: 'var(--font-data)', 
              color: 'var(--accent-cyan)',
              fontSize: '1.2rem'
            }}>
              →
            </div>
            
            {/* Exit Platform */}
            <div>
              <label style={labelStyle}>Exit Platform</label>
              <select
                value={exitPlatform}
                onChange={(e) => setExitPlatform(e.target.value as any)}
                style={selectStyle}
              >
                <option value="polymarket">Polymarket</option>
                <option value="limitless">Limitless</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Trade Parameters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)'
        }}>
          <div>
            <label style={labelStyle}>Entry Price</label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Exit Price</label>
            <input
              type="number"
              step="0.01"
              value={exitPrice}
              onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Trade Size ($)</label>
            <input
              type="number"
              step="10"
              value={tradeSize}
              onChange={(e) => setTradeSize(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>
        
        {/* Fee Settings (collapsible) */}
        <details style={{ marginBottom: 'var(--space-3)' }}>
          <summary style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            marginBottom: 'var(--space-2)'
          }}>
            Fee Settings ▼
          </summary>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 'var(--space-2)',
            padding: 'var(--space-2)',
            background: 'var(--bg-layer-2)',
            border: '1px solid var(--border-dim)'
          }}>
            <div>
              <label style={labelStyle}>Polymarket Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={polymarketFee}
                onChange={(e) => setPolymarketFee(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Limitless Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={limitlessFee}
                onChange={(e) => setLimitlessFee(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gas Price (gwei)</label>
              <input
                type="number"
                step="1"
                value={gasPrice}
                onChange={(e) => setGasPrice(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>ETH Price ($)</label>
              <input
                type="number"
                step="10"
                value={ethPrice}
                onChange={(e) => setEthPrice(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Expected Slippage (%)</label>
              <input
                type="number"
                step="0.05"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>
        </details>
        
        {/* Results */}
        <div style={{
          border: `2px solid ${calculation.isProfitable ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'}`,
          background: calculation.isProfitable ? 'rgba(0, 200, 117, 0.05)' : 'rgba(254, 56, 85, 0.05)',
          padding: 'var(--space-3)'
        }}>
          {/* Net Profit (prominent) */}
          <div style={{
            textAlign: 'center',
            marginBottom: 'var(--space-3)',
            paddingBottom: 'var(--space-2)',
            borderBottom: '1px solid var(--border-dim)'
          }}>
            <div style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)'
            }}>
              NET PROFIT
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 900,
              color: calculation.isProfitable ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
            }}>
              {calculation.isProfitable ? '+' : ''}{calculation.netProfitUsd.toFixed(2)}
              <span style={{ fontSize: '1rem', marginLeft: 4 }}>USD</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.85rem',
              color: calculation.isProfitable ? 'var(--success-ag-green)' : 'var(--alert-signal-red)'
            }}>
              {calculation.netProfitPct.toFixed(2)}% ROC
            </div>
          </div>
          
          {/* Breakdown */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 'var(--space-2)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-data)'
          }}>
            <ResultRow label="Gross Spread" value={`${calculation.grossSpreadPct.toFixed(2)}%`} />
            <ResultRow label="Gross Profit" value={`$${calculation.grossProfitUsd.toFixed(2)}`} positive />
            <ResultRow label="Entry Fee" value={`-$${calculation.entryFeeUsd.toFixed(2)}`} negative />
            <ResultRow label="Exit Fee" value={`-$${calculation.exitFeeUsd.toFixed(2)}`} negative />
            <ResultRow label="Slippage" value={`-$${calculation.slippageUsd.toFixed(2)}`} negative />
            <ResultRow label="Gas Cost" value={`-$${calculation.gasCostUsd.toFixed(2)}`} negative />
            <ResultRow label="Total Fees" value={`${calculation.totalFeesPct.toFixed(2)}%`} />
            <ResultRow label="Breakeven" value={`${calculation.breakevenSpreadPct.toFixed(2)}%`} />
            <ResultRow 
              label="Min Size" 
              value={calculation.minSizeForProfit > 0 ? `$${calculation.minSizeForProfit.toFixed(0)}` : 'N/A'} 
            />
            <ResultRow 
              label="Status" 
              value={calculation.isProfitable ? 'PROFITABLE' : 'UNPROFITABLE'} 
              positive={calculation.isProfitable}
              negative={!calculation.isProfitable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-data)',
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  marginBottom: '4px',
  textTransform: 'uppercase'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-1) var(--space-2)',
  border: '1px solid var(--border-dim)',
  background: 'var(--bg-layer-2)',
  color: 'var(--text-white)',
  fontFamily: 'var(--font-data)',
  fontSize: '0.85rem'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer'
};

// Result row component
const ResultRow = ({ 
  label, 
  value, 
  positive, 
  negative 
}: { 
  label: string; 
  value: string; 
  positive?: boolean;
  negative?: boolean;
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: 'var(--space-1) 0',
    borderBottom: '1px solid var(--border-dim)'
  }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ 
      color: positive ? 'var(--success-ag-green)' : negative ? 'var(--alert-signal-red)' : 'var(--text-white)',
      fontWeight: 700
    }}>
      {value}
    </span>
  </div>
);
