'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';
import { SimulationResponse } from '@/types/api';
import { WidgetType, LayoutPreset, WIDGET_CONFIGS } from '@/types/dashboard';

// Analysis Widget Components
import MonteCarloViz from "@/components/MonteCarloViz";
import RevenueProjectionViz from "@/components/RevenueProjectionViz";
import AgentPanel from "@/components/AgentPanel";
import KellyDisplay from "@/components/KellyDisplay";

// Evaluation Widget Components
import BacktestSummary from '@/components/dashboard/evaluation/BacktestSummary';
import ModelVariantComparison from '@/components/dashboard/evaluation/ModelVariantComparison';
import StressTestDashboard from '@/components/dashboard/evaluation/StressTestDashboard';
import StatisticalTestsPanel from '@/components/dashboard/evaluation/StatisticalTestsPanel';
import LLMExportPanel from '@/components/dashboard/evaluation/LLMExportPanel';

// Polymarket Widget Components
import PolymarketPricesPanel from '@/components/dashboard/polymarket/PolymarketPricesPanel';
import PolymarketOrderBookPanel from '@/components/dashboard/polymarket/PolymarketOrderBookPanel';
import PolymarketTradesPanel from '@/components/dashboard/polymarket/PolymarketTradesPanel';

// Limitless Widget Components
import LimitlessPoolsPanel from '@/components/dashboard/limitless/LimitlessPoolsPanel';
import LimitlessPricesPanel from '@/components/dashboard/limitless/LimitlessPricesPanel';

// Arbitrage Widget Components
import ArbitrageOpportunitiesPanel from '@/components/dashboard/arbitrage/ArbitrageOpportunitiesPanel';
import SpreadMonitorPanel from '@/components/dashboard/arbitrage/SpreadMonitorPanel';
import ProfitCalculatorPanel from '@/components/dashboard/arbitrage/ProfitCalculatorPanel';

// Synthetic data for evaluation components
import { generateSyntheticBacktest, generateModelComparison, generateStressTestScenarios, generateModelVariants } from '@/lib/syntheticBacktestData';

// ============================================================================
// Inline Widget Components
// ============================================================================

const OpportunityWidget = ({ data }: { data: SimulationResponse }) => (
  <div className="panel-body" style={{ padding: 0 }}>
     <div className="grid-4" style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'
          }}>
            {/* Trading Pair */}
            <div style={{
              padding: 'var(--space-3)',
              border: 'var(--border-thin)',
              background: 'var(--bg-layer-1)'
            }}>
              <div className="stat-label">Trading Pair</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                marginBottom: 'var(--space-1)',
                color: 'var(--ink-charcoal)'
              }}>
                {data.opportunity.pair}
              </div>
              <div className="annotation">
                {data.opportunity.dex_a} / {data.opportunity.dex_b}
              </div>
            </div>

            {/* Price Spread */}
            <div style={{
              padding: 'var(--space-3)',
              border: 'var(--border-thin)',
              background: 'var(--bg-layer-2)'
            }}>
              <div className="stat-label">Price Spread</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-data)',
                marginBottom: 'var(--space-1)',
                color: 'var(--accent-safety-yellow)'
              }}>
                {data.opportunity.spread_pct.toFixed(2)}%
              </div>
               <div className="annotation">
                Diff: ${(data.opportunity.price_b - data.opportunity.price_a).toFixed(4)}
              </div>
            </div>

            {/* Expected Return */}
            <div style={{
              padding: 'var(--space-3)',
              border: 'var(--border-thin)',
              background: data.opportunity.expected_return >= 0
                ? 'var(--success-ag-green)'
                : 'var(--alert-signal-red)',
              color: 'var(--ink-charcoal)'
            }}>
              <div className="stat-label" style={{ opacity: 0.7, color: 'inherit' }}>Return</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-data)',
                marginBottom: 'var(--space-1)'
              }}>
                {data.opportunity.expected_return.toFixed(2)}%
              </div>
              <div className="annotation" style={{ opacity: 0.8, color: 'inherit' }}>
                Win: {(data.opportunity.win_probability * 100).toFixed(0)}%
              </div>
            </div>

             {/* Liquidity */}
            <div style={{
              padding: 'var(--space-3)',
              border: 'var(--border-thin)',
              background: 'var(--bg-layer-3)'
            }}>
              <div className="stat-label">Liquidity</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-data)',
                marginBottom: 'var(--space-1)',
                color: 'var(--ink-charcoal)'
              }}>
                ${data.opportunity.liquidity.toFixed(0)}
              </div>
              <div className="annotation">
                Gas: ${data.opportunity.gas_estimate.toFixed(2)}
              </div>
            </div>
    </div>
  </div>
);

const PipelinePerfWidget = ({ data }: { data: SimulationResponse }) => (
  <div style={{
          padding: 'var(--space-4)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)'
          }}>
            <div>
              <div className="stat-label">Total Time</div>
              <div className="stat-value" style={{
                fontSize: '1.5rem',
                color: data.total_computation_time_ms < 1100
                  ? 'var(--success-ag-green)'
                  : 'var(--accent-safety-yellow)'
              }}>
                {data.total_computation_time_ms.toFixed(0)}ms
              </div>
            </div>

            <div>
              <div className="stat-label">Status</div>
               <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: data.total_computation_time_ms < 1100
                  ? 'var(--success-ag-green)'
                  : 'var(--alert-signal-red)'
              }}>
                {data.total_computation_time_ms < 1100 ? 'PASS' : 'WARN'}
              </div>
            </div>
            
             <div>
              <div className="stat-label">Efficiency</div>
              <div className="stat-value" style={{
                fontSize: '1.5rem',
                color: 'var(--ink-charcoal)'
              }}>
                {Math.min(100, (1100 / Math.max(1, data.total_computation_time_ms)) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="divider"></div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-data)',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>MC: {data.monte_carlo.computation_time_ms.toFixed(0)}</span>
              <span>•</span>
              <span>Agents: {data.consensus.computation_time_ms.toFixed(0)}</span>
              <span>•</span>
              <span>Kelly: {data.kelly.computation_time_ms.toFixed(0)}</span>
            </div>
            {data.performance_warning && (
              <span style={{ color: 'var(--accent-amber)' }}>⚠️ SLO BREACH</span>
            )}
          </div>
  </div>
);

// Droppable placeholder for empty containers
const DroppablePlaceholder = ({ id, label }: { id: string; label: string }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      style={{ 
        height: '100px', 
        border: `1px dashed ${isOver ? 'var(--accent-financial-blue)' : 'var(--border-dim)'}`, 
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        background: isOver ? 'rgba(0, 102, 255, 0.05)' : 'transparent',
        transition: 'all 0.2s ease'
      }}
    >
      {label}
    </div>
  );
};

// ============================================================================
// Widget Configuration
// ============================================================================

// All available widgets
const ALL_WIDGETS: WidgetType[] = [
  // Analysis
  'opportunity', 'consensus', 'kelly', 'monte_carlo', 'revenue', 'pipeline_perf',
  // Evaluation
  'backtest_summary', 'model_variant_comparison', 'stress_test', 'statistical_tests', 'llm_export',
  // Polymarket
  'polymarket_prices', 'polymarket_orderbook', 'polymarket_trades',
  // Limitless
  'limitless_pools', 'limitless_prices',
  // Arbitrage
  'arbitrage_opportunities', 'spread_monitor', 'profit_calculator'
];

const WIDGET_TITLES: Record<WidgetType, string> = {
  opportunity: '01 OPTY_ANALYSIS',
  consensus: '02 AGENT_CONSENSUS',
  kelly: '03 KELLY_SIZING',
  monte_carlo: '04 MONTE_CARLO',
  revenue: '05 REVENUE_PROJ',
  pipeline_perf: '06 PIPELINE_METRICS',
  backtest_summary: '07 BACKTEST_SUMMARY',
  model_variant_comparison: '08 MODEL_VARIANTS',
  stress_test: '09 STRESS_TESTS',
  statistical_tests: '10 STAT_TESTS',
  llm_export: '11 LLM_EXPORT',
  polymarket_prices: '12 POLY_MARKETS',
  polymarket_orderbook: '13 POLY_ORDERBOOK',
  polymarket_trades: '14 POLY_TRADES',
  limitless_pools: '15 LIMITLESS_POOLS',
  limitless_prices: '16 LIMITLESS_PRICES',
  arbitrage_monitor: '17 ARB_MONITOR',
  arbitrage_opportunities: '18 ARB_OPPORTUNITIES',
  spread_monitor: '19 SPREAD_MONITOR',
  profit_calculator: '20 PROFIT_CALC',
  arbitrage_alerts: '21 ARB_ALERTS',
};

// Layout presets
const PRESETS: Record<LayoutPreset, { sidebar: WidgetType[]; left: WidgetType[]; right: WidgetType[] }> = {
  DEFAULT: {
    sidebar: [],
    left: ['opportunity', 'consensus', 'kelly'],
    right: ['monte_carlo', 'revenue', 'pipeline_perf'],
  },
  EXECUTION: {
    sidebar: [],
    left: ['opportunity', 'consensus', 'pipeline_perf'],
    right: ['kelly', 'revenue', 'monte_carlo'],
  },
  ANALYTICAL: {
    sidebar: [],
    left: ['monte_carlo', 'revenue'],
    right: ['opportunity', 'consensus', 'kelly', 'pipeline_perf'],
  },
  STACKED: {
    sidebar: [],
    left: ['opportunity', 'consensus', 'kelly', 'monte_carlo', 'revenue', 'pipeline_perf'],
    right: [],
  },
  COMPREHENSIVE: {
    sidebar: [],
    left: ['polymarket_prices', 'arbitrage_opportunities', 'spread_monitor'],
    right: ['limitless_pools', 'profit_calculator', 'pipeline_perf'],
  },
  TRADING: {
    sidebar: [],
    left: ['polymarket_prices', 'polymarket_orderbook', 'polymarket_trades'],
    right: ['limitless_pools', 'limitless_prices', 'arbitrage_opportunities'],
  },
  ANALYTICS: {
    sidebar: [],
    left: ['backtest_summary', 'stress_test'],
    right: ['model_variant_comparison', 'statistical_tests'],
  },
  ARBITRAGE: {
    sidebar: [],
    left: ['arbitrage_opportunities', 'spread_monitor'],
    right: ['profit_calculator', 'polymarket_prices'],
  },
};

// ============================================================================
// Main Component
// ============================================================================

interface DashboardLayoutProps {
  data: SimulationResponse;
}

export default function DashboardLayout({ data }: DashboardLayoutProps) {
  const [items, setItems] = useState<{ sidebar: WidgetType[]; left: WidgetType[]; right: WidgetType[] }>(PRESETS.DEFAULT);
  const [activeId, setActiveId] = useState<WidgetType | null>(null);
  
  // Synthetic data for evaluation components
  const [syntheticData] = useState(() => {
    const backtest = generateSyntheticBacktest();
    const modelComparison = generateModelComparison();
    const stressTests = generateStressTestScenarios();
    const variants = generateModelVariants(5);
    
    // Statistical tests from first variant
    const statisticalTests = variants[0]?.statistical_tests || null;
    
    return {
      backtest,
      modelComparison,
      stressTests,
      statisticalTests,
      // LLM export placeholder
      llmExport: null as any // Will be handled by component
    };
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const renderWidget = (id: WidgetType) => {
    switch (id) {
      // Analysis widgets
      case 'opportunity': return <OpportunityWidget data={data} />;
      case 'consensus': return <AgentPanel data={data.consensus} />;
      case 'kelly': return <KellyDisplay data={data.kelly} />;
      case 'monte_carlo': return <MonteCarloViz data={data.monte_carlo} />;
      case 'revenue': return <RevenueProjectionViz data={data.revenue_projection} />;
      case 'pipeline_perf': return <PipelinePerfWidget data={data} />;
      
      // Evaluation widgets
      case 'backtest_summary': return <BacktestSummary data={syntheticData.backtest} />;
      case 'model_variant_comparison': return <ModelVariantComparison data={syntheticData.modelComparison} />;
      case 'stress_test': return <StressTestDashboard data={syntheticData.stressTests} />;
      case 'statistical_tests': return syntheticData.statisticalTests ? <StatisticalTestsPanel data={syntheticData.statisticalTests} /> : <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No statistical tests available</div>;
      case 'llm_export': return <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>LLM Export - Coming soon</div>;
      
      // Polymarket widgets
      case 'polymarket_prices': return <PolymarketPricesPanel />;
      case 'polymarket_orderbook': return <PolymarketOrderBookPanel />;
      case 'polymarket_trades': return <PolymarketTradesPanel />;
      
      // Limitless widgets
      case 'limitless_pools': return <LimitlessPoolsPanel />;
      case 'limitless_prices': return <LimitlessPricesPanel />;
      
      // Arbitrage widgets
      case 'arbitrage_opportunities': return <ArbitrageOpportunitiesPanel />;
      case 'spread_monitor': return <SpreadMonitorPanel />;
      case 'profit_calculator': return <ProfitCalculatorPanel />;
      
      default: return <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>Widget not found: {id}</div>;
    }
  };

  const loadPreset = (presetName: LayoutPreset) => {
    setItems(PRESETS[presetName]);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as WidgetType;
    const overId = over.id as string;

    // Find source and destiny containers
    const findContainer = (id: string): 'sidebar' | 'left' | 'right' | undefined => {
      if (items.sidebar.includes(id as WidgetType)) return 'sidebar';
      if (items.left.includes(id as WidgetType)) return 'left';
      if (items.right.includes(id as WidgetType)) return 'right';
      if (id === 'sidebar_container') return 'sidebar';
      if (id === 'left_container') return 'left';
      if (id === 'right_container') return 'right';
      return undefined;
    };

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (activeContainer === overContainer) {
      // Reordering within the same container
      const containerItems = items[activeContainer];
      const oldIndex = containerItems.indexOf(activeId);
      const newIndex = overId === activeContainer + '_container' 
        ? containerItems.length 
        : containerItems.indexOf(overId as WidgetType);
      
      if (oldIndex !== newIndex && newIndex !== -1) {
         setItems((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], oldIndex, newIndex),
        }));
      }
    } else {
      // Moving to different container
      setItems((prev) => {
        const sourceItems = [...prev[activeContainer]];
        const destItems = [...prev[overContainer]];

        sourceItems.splice(sourceItems.indexOf(activeId), 1);
        
        const overIndex = overId === overContainer + '_container' 
          ? destItems.length 
          : destItems.indexOf(overId as WidgetType);

        const insertIndex = overIndex === -1 ? destItems.length : overIndex;
        
        destItems.splice(insertIndex, 0, activeId);

        return {
          ...prev,
          [activeContainer]: sourceItems,
          [overContainer]: destItems,
        };
      });
    }

    setActiveId(null);
  };

  // Preset button styles
  const getPresetButtonStyle = (preset: string, isActive: boolean) => ({
    padding: '6px 12px',
    border: `1px solid ${preset === 'ANALYTICS' || preset === 'TRADING' || preset === 'ARBITRAGE' || preset === 'COMPREHENSIVE' 
      ? 'var(--accent-cyan)' 
      : 'var(--accent-financial-blue)'}`,
    background: isActive ? 'rgba(0,102,255,0.2)' : 'rgba(0,0,0,0.2)',
    color: preset === 'ANALYTICS' || preset === 'TRADING' || preset === 'ARBITRAGE' || preset === 'COMPREHENSIVE'
      ? 'var(--accent-cyan)'
      : 'var(--accent-financial-blue)',
    fontFamily: 'var(--font-data)',
    fontSize: '0.7rem',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    transition: 'all 0.2s'
  });

  return (
    <div>
      {/* Preset Controls */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ marginRight: 'auto', fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          LAYOUT PRESETS:
        </div>
        {(Object.keys(PRESETS) as LayoutPreset[]).map(preset => (
          <button
            key={preset}
            onClick={() => loadPreset(preset)}
            style={getPresetButtonStyle(preset, false)}
            onMouseEnter={e => {
              e.currentTarget.style.background = preset === 'ANALYTICS' || preset === 'TRADING' || preset === 'ARBITRAGE' || preset === 'COMPREHENSIVE'
                ? 'var(--accent-cyan)'
                : 'var(--accent-financial-blue)';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
              e.currentTarget.style.color = preset === 'ANALYTICS' || preset === 'TRADING' || preset === 'ARBITRAGE' || preset === 'COMPREHENSIVE'
                ? 'var(--accent-cyan)'
                : 'var(--accent-financial-blue)';
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'var(--space-4)',
          minHeight: '80vh'
        }}>
           {/* Sidebar Pane (Available Widgets) */}
           <div style={{ gridColumn: 'span 2' }}>
              <div style={{
                 marginBottom: 'var(--space-2)',
                 fontFamily: 'var(--font-display)',
                 fontSize: '0.75rem',
                 fontWeight: 700,
                 color: 'var(--text-muted)',
                 letterSpacing: '0.1em'
              }}>
                AVAILABLE_BLOCKS
              </div>
              <SortableContext
                id="sidebar_container"
                items={items.sidebar}
                strategy={verticalListSortingStrategy}
              >
                  <div id="sidebar_container" style={{ 
                    minHeight: '200px', 
                    padding: 'var(--space-2)',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '4px',
                    border: '1px dashed var(--border-dim)'
                  }}>
                    {items.sidebar.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]} minimal={true}>
                        {null}
                    </SortableWidget>
                    ))}
                    {items.sidebar.length === 0 && (
                       <DroppablePlaceholder id="sidebar_container" label="All blocks active" />
                    )}
                  </div>
              </SortableContext>
          </div>

          {/* Left Pane */}
          <div style={{ gridColumn: 'span 4' }}>
              <SortableContext
                id="left_container"
                items={items.left}
                strategy={verticalListSortingStrategy}
              >
                  <div id="left_container" style={{ minHeight: '100%' }}>
                    {items.left.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                    {items.left.length === 0 && (
                        <DroppablePlaceholder id="left_container" label="Drop widgets here" />
                    )}
                  </div>
              </SortableContext>
          </div>

          {/* Right Pane */}
          <div style={{ gridColumn: 'span 6' }}>
              <SortableContext
                id="right_container"
                items={items.right}
                strategy={verticalListSortingStrategy}
              >
                 <div id="right_container" style={{ minHeight: '100%' }}>
                    {items.right.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                       {items.right.length === 0 && (
                        <DroppablePlaceholder id="right_container" label="Drop widgets here" />
                    )}
                  </div>
              </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <SortableWidget 
              id={activeId} 
              title={WIDGET_TITLES[activeId]} 
              minimal={items.sidebar.includes(activeId)}
            >
               {items.sidebar.includes(activeId) ? null : renderWidget(activeId)}
            </SortableWidget>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
