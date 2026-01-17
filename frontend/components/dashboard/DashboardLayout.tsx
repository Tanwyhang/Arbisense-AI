'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

     <div style={{
            display: 'grid',
            border: 'none',
            background: 'transparent',
            padding: 0,
            gap: '1px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
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
const PRESETS: Record<LayoutPreset, { sidebar: WidgetType[]; col1: WidgetType[]; col2: WidgetType[]; col3: WidgetType[]; col4: WidgetType[]; fullWidth: WidgetType[] }> = {
  DEFAULT: {
    sidebar: [],
    col1: ['opportunity'],
    col2: ['consensus', 'kelly'],
    col3: ['revenue'],
    col4: ['pipeline_perf'],
    fullWidth: ['monte_carlo'],
  },
  EXECUTION: {
    sidebar: [],
    col1: ['opportunity'],
    col2: ['consensus'],
    col3: ['kelly'],
    col4: ['revenue', 'pipeline_perf'],
    fullWidth: ['monte_carlo'],
  },
  ANALYTICAL: {
    sidebar: [],
    col1: ['opportunity'],
    col2: ['consensus'],
    col3: ['kelly'],
    col4: ['pipeline_perf'],
    fullWidth: ['monte_carlo', 'revenue'],
  },
  STACKED: {
    sidebar: [],
    col1: [],
    col2: [],
    col3: [],
    col4: [],
    fullWidth: ['opportunity', 'consensus', 'kelly', 'monte_carlo', 'revenue', 'pipeline_perf'],
  },
  COMPREHENSIVE: {
    sidebar: [],
    col1: ['polymarket_prices'],
    col2: ['arbitrage_opportunities'],
    col3: ['spread_monitor', 'limitless_pools'],
    col4: ['profit_calculator', 'pipeline_perf'],
    fullWidth: [],
  },
  TRADING: {
    sidebar: [],
    col1: ['polymarket_prices'],
    col2: ['polymarket_orderbook', 'polymarket_trades'],
    col3: ['limitless_pools', 'limitless_prices'],
    col4: ['arbitrage_opportunities'],
    fullWidth: [],
  },
  ANALYTICS: {
    sidebar: [],
    col1: ['backtest_summary'],
    col2: ['stress_test'],
    col3: ['model_variant_comparison'],
    col4: ['statistical_tests'],
    fullWidth: [],
  },
  ARBITRAGE: {
    sidebar: [],
    col1: ['arbitrage_opportunities'],
    col2: ['spread_monitor'],
    col3: ['profit_calculator'],
    col4: ['polymarket_prices'],
    fullWidth: [],
  },
};

// ============================================================================
// Main Component
// ============================================================================

interface DashboardLayoutProps {
  data: SimulationResponse;
}

export default function DashboardLayout({ data }: DashboardLayoutProps) {
  const [items, setItems] = useState<{ sidebar: WidgetType[]; col1: WidgetType[]; col2: WidgetType[]; col3: WidgetType[]; col4: WidgetType[]; fullWidth: WidgetType[] }>(PRESETS.DEFAULT);
  const [activeId, setActiveId] = useState<WidgetType | null>(null);
  const [focusedWidget, setFocusedWidget] = useState<WidgetType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all widgets in order for Tab navigation
  const getAllWidgets = useCallback(() => {
    return [...items.fullWidth, ...items.col1, ...items.col2, ...items.col3, ...items.col4, ...items.sidebar];
  }, [items]);

  // Find which container a widget is in
  const findContainer = useCallback((widgetId: WidgetType): 'fullWidth' | 'col1' | 'col2' | 'col3' | 'col4' | 'sidebar' | null => {
    if (items.fullWidth.includes(widgetId)) return 'fullWidth';
    if (items.col1.includes(widgetId)) return 'col1';
    if (items.col2.includes(widgetId)) return 'col2';
    if (items.col3.includes(widgetId)) return 'col3';
    if (items.col4.includes(widgetId)) return 'col4';
    if (items.sidebar.includes(widgetId)) return 'sidebar';
    return null;
  }, [items]);

  // Move widget within container (j/k - up/down)
  const moveWithinContainer = useCallback((direction: 'up' | 'down') => {
    if (!focusedWidget) return;
    
    const container = findContainer(focusedWidget);
    if (!container) return;

    const containerItems = items[container];
    const currentIndex = containerItems.indexOf(focusedWidget);
    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(containerItems.length - 1, currentIndex + 1);

    if (currentIndex !== newIndex) {
      setIsAnimating(true);
      setItems(prev => {
        const newContainerItems = [...prev[container]];
        [newContainerItems[currentIndex], newContainerItems[newIndex]] = 
        [newContainerItems[newIndex], newContainerItems[currentIndex]];
        return { ...prev, [container]: newContainerItems };
      });
      setTimeout(() => setIsAnimating(false), 250);
    }
  }, [focusedWidget, findContainer, items]);

  // Move widget between containers (h/l - left/right)
  const moveBetweenContainers = useCallback((direction: 'left' | 'right') => {
    if (!focusedWidget) return;
    
    const container = findContainer(focusedWidget);
    if (!container) return;

    // Define container order: fullWidth -> col1 <-> col2 <-> col3 <-> col4 (sidebar is special)
    const containerOrder: ('fullWidth' | 'col1' | 'col2' | 'col3' | 'col4')[] = ['col1', 'col2', 'col3', 'col4'];
    const currentContainerIndex = containerOrder.indexOf(container as any);
    
    let targetContainer: 'fullWidth' | 'col1' | 'col2' | 'col3' | 'col4' | 'sidebar';
    
    if (container === 'fullWidth') {
      // From fullWidth, h goes to col1, l goes to col4 (wrap) or col1? Let's go col1
      targetContainer = direction === 'left' ? 'col1' : 'col4';
    } else if (container === 'sidebar') {
      // From sidebar, always go to col4
      targetContainer = 'col4';
    } else {
      // Between columns
      if (direction === 'left' && container === 'col1') {
        targetContainer = 'fullWidth'; // Move to fullWidth
      } else if (direction === 'right' && container === 'col4') {
        targetContainer = 'fullWidth'; // Move to fullWidth
      } else {
        const newIndex = direction === 'left' 
          ? Math.max(0, currentContainerIndex - 1)
          : Math.min(containerOrder.length - 1, currentContainerIndex + 1);
        targetContainer = containerOrder[newIndex];
      }
    }

    if (targetContainer !== container) {
      setIsAnimating(true);
      setItems(prev => {
        const sourceItems = [...prev[container]];
        const targetItems = [...prev[targetContainer]];
        
        sourceItems.splice(sourceItems.indexOf(focusedWidget), 1);
        targetItems.push(focusedWidget);
        
        return {
          ...prev,
          [container]: sourceItems,
          [targetContainer]: targetItems
        };
      });
      setTimeout(() => setIsAnimating(false), 250);
    }
  }, [focusedWidget, findContainer]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const allWidgets = getAllWidgets();
      if (allWidgets.length === 0) return;

      switch (e.key.toLowerCase()) {
        case 'tab':
          e.preventDefault();
          // Cycle through widgets
          if (!focusedWidget) {
            setFocusedWidget(allWidgets[0]);
          } else {
            const currentIndex = allWidgets.indexOf(focusedWidget);
            const nextIndex = e.shiftKey 
              ? (currentIndex - 1 + allWidgets.length) % allWidgets.length
              : (currentIndex + 1) % allWidgets.length;
            setFocusedWidget(allWidgets[nextIndex]);
          }
          break;
        case 'j': // Move down
          if (focusedWidget) {
            e.preventDefault();
            moveWithinContainer('down');
          }
          break;
        case 'k': // Move up
          if (focusedWidget) {
            e.preventDefault();
            moveWithinContainer('up');
          }
          break;
        case 'h': // Move left
          if (focusedWidget) {
            e.preventDefault();
            moveBetweenContainers('left');
          }
          break;
        case 'l': // Move right
          if (focusedWidget) {
            e.preventDefault();
            moveBetweenContainers('right');
          }
          break;
        case 'escape':
          setFocusedWidget(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedWidget, getAllWidgets, moveWithinContainer, moveBetweenContainers]);
  
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
    const findContainer = (id: string): 'sidebar' | 'col1' | 'col2' | 'col3' | 'col4' | undefined => {
      if (items.sidebar.includes(id as WidgetType)) return 'sidebar';
      if (items.col1.includes(id as WidgetType)) return 'col1';
      if (items.col2.includes(id as WidgetType)) return 'col2';
      if (items.col3.includes(id as WidgetType)) return 'col3';
      if (items.col4.includes(id as WidgetType)) return 'col4';
      if (id === 'sidebar_container') return 'sidebar';
      if (id === 'col1_container') return 'col1';
      if (id === 'col2_container') return 'col2';
      if (id === 'col3_container') return 'col3';
      if (id === 'col4_container') return 'col4';
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
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            LAYOUT PRESETS:
          </span>
          <span style={{ 
            fontFamily: 'var(--font-data)', 
            fontSize: '0.65rem', 
            color: focusedWidget ? 'var(--accent-cyan)' : 'var(--text-muted)',
            opacity: 0.7,
            padding: '2px 8px',
            background: focusedWidget ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
            borderRadius: '3px',
            border: focusedWidget ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            transition: 'all 220ms cubic-bezier(0.05, 0.9, 0.1, 1.05)'
          }}>
            ⌨ Tab: select • H←  J↓  K↑  L→: move • Esc: deselect
          </span>
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
        {/* Full-Width Section (e.g., Monte Carlo) */}
        {items.fullWidth && items.fullWidth.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            {/* Sidebar spacer */}
            <div style={{ gridColumn: 'span 2' }} />
            
            {/* Full-width widgets */}
            <div style={{ gridColumn: 'span 10' }}>
              <SortableContext
                id="fullwidth_container"
                items={items.fullWidth}
                strategy={verticalListSortingStrategy}
              >
                <div id="fullwidth_container">
                  {items.fullWidth.map(id => (
                    <SortableWidget 
                      key={id} 
                      id={id} 
                      title={WIDGET_TITLES[id]}
                      isFocused={focusedWidget === id}
                      onClick={() => setFocusedWidget(id)}
                    >
                      {renderWidget(id)}
                    </SortableWidget>
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        )}

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
                    <SortableWidget 
                      key={id} 
                      id={id} 
                      title={WIDGET_TITLES[id]} 
                      minimal={true}
                      isFocused={focusedWidget === id}
                      onClick={() => setFocusedWidget(id)}
                    >
                        {null}
                    </SortableWidget>
                    ))}
                    {items.sidebar.length === 0 && (
                       <DroppablePlaceholder id="sidebar_container" label="All blocks active" />
                    )}
                  </div>
              </SortableContext>
          </div>

          {/* Col 1 */}
          <div style={{ gridColumn: 'span 2' }}>
              <SortableContext id="col1_container" items={items.col1} strategy={verticalListSortingStrategy}>
                  <div id="col1_container" style={{ minHeight: '100%' }}>
                    {items.col1.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]} isFocused={focusedWidget === id} onClick={() => setFocusedWidget(id)}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                    {items.col1.length === 0 && <DroppablePlaceholder id="col1_container" label="Col 1" />}
                  </div>
              </SortableContext>
          </div>

          {/* Col 2 */}
          <div style={{ gridColumn: 'span 3' }}>
              <SortableContext id="col2_container" items={items.col2} strategy={verticalListSortingStrategy}>
                  <div id="col2_container" style={{ minHeight: '100%' }}>
                    {items.col2.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]} isFocused={focusedWidget === id} onClick={() => setFocusedWidget(id)}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                    {items.col2.length === 0 && <DroppablePlaceholder id="col2_container" label="Col 2" />}
                  </div>
              </SortableContext>
          </div>

          {/* Col 3 */}
          <div style={{ gridColumn: 'span 3' }}>
              <SortableContext id="col3_container" items={items.col3} strategy={verticalListSortingStrategy}>
                  <div id="col3_container" style={{ minHeight: '100%' }}>
                    {items.col3.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]} isFocused={focusedWidget === id} onClick={() => setFocusedWidget(id)}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                    {items.col3.length === 0 && <DroppablePlaceholder id="col3_container" label="Col 3" />}
                  </div>
              </SortableContext>
          </div>

          {/* Col 4 */}
          <div style={{ gridColumn: 'span 2' }}>
              <SortableContext id="col4_container" items={items.col4} strategy={verticalListSortingStrategy}>
                  <div id="col4_container" style={{ minHeight: '100%' }}>
                    {items.col4.map(id => (
                    <SortableWidget key={id} id={id} title={WIDGET_TITLES[id]} isFocused={focusedWidget === id} onClick={() => setFocusedWidget(id)}>
                        {renderWidget(id)}
                    </SortableWidget>
                    ))}
                    {items.col4.length === 0 && <DroppablePlaceholder id="col4_container" label="Col 4" />}
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
