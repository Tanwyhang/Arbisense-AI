/**
 * Dashboard Types
 * Widget system, layouts, and dashboard configuration
 */

// ============================================================================
// WIDGET TYPES
// ============================================================================

export type WidgetType = 
  // Existing evaluation widgets
  | 'opportunity'
  | 'consensus'
  | 'kelly'
  | 'monte_carlo'
  | 'revenue'
  | 'pipeline_perf'
  
  // Evaluation analytics widgets
  | 'backtest_summary'
  | 'model_variant_comparison'
  | 'stress_test'
  | 'statistical_tests'
  | 'llm_export'
  
  // Polymarket widgets
  | 'polymarket_prices'
  | 'polymarket_orderbook'
  | 'polymarket_trades'
  
  // Limitless widgets
  | 'limitless_pools'
  | 'limitless_prices'
  
  // Arbitrage widgets
  | 'arbitrage_monitor'
  | 'arbitrage_opportunities'
  | 'spread_monitor'
  | 'profit_calculator'
  | 'arbitrage_alerts';

export interface WidgetConfig {
  id: WidgetType;
  title: string;
  description: string;
  category: 'analysis' | 'evaluation' | 'polymarket' | 'limitless' | 'arbitrage';
  
  // Display properties
  minWidth: number; // Grid columns (out of 12)
  minHeight: number; // Pixels
  defaultWidth: number;
  defaultHeight: number;
  
  // Capabilities
  isResizable: boolean;
  isCollapsible: boolean;
  hasRefresh: boolean;
  hasExport: boolean;
  
  // Data requirements
  requiresWebSocket: boolean;
  requiresBackendData: boolean;
  refreshInterval?: number; // ms
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  // Existing analysis widgets
  opportunity: {
    id: 'opportunity',
    title: 'OPTY_ANALYSIS',
    description: 'Current arbitrage opportunity metrics',
    category: 'analysis',
    minWidth: 3,
    minHeight: 150,
    defaultWidth: 6,
    defaultHeight: 200,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  consensus: {
    id: 'consensus',
    title: 'AGENT_CONSENSUS',
    description: 'Multi-agent decision consensus',
    category: 'analysis',
    minWidth: 3,
    minHeight: 200,
    defaultWidth: 4,
    defaultHeight: 250,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  kelly: {
    id: 'kelly',
    title: 'KELLY_SIZING',
    description: 'Kelly criterion position sizing',
    category: 'analysis',
    minWidth: 3,
    minHeight: 150,
    defaultWidth: 4,
    defaultHeight: 200,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  monte_carlo: {
    id: 'monte_carlo',
    title: 'MONTE_CARLO',
    description: 'Monte Carlo simulation visualization',
    category: 'analysis',
    minWidth: 4,
    minHeight: 250,
    defaultWidth: 6,
    defaultHeight: 350,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  revenue: {
    id: 'revenue',
    title: 'REVENUE_PROJ',
    description: '30-day revenue projection',
    category: 'analysis',
    minWidth: 4,
    minHeight: 250,
    defaultWidth: 6,
    defaultHeight: 350,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  pipeline_perf: {
    id: 'pipeline_perf',
    title: 'PIPELINE_METRICS',
    description: 'Computation performance metrics',
    category: 'analysis',
    minWidth: 3,
    minHeight: 120,
    defaultWidth: 4,
    defaultHeight: 150,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: false,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  
  // Evaluation analytics widgets
  backtest_summary: {
    id: 'backtest_summary',
    title: 'BACKTEST_SUMMARY',
    description: 'Comprehensive backtesting results',
    category: 'evaluation',
    minWidth: 6,
    minHeight: 400,
    defaultWidth: 12,
    defaultHeight: 500,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  model_variant_comparison: {
    id: 'model_variant_comparison',
    title: 'MODEL_VARIANTS',
    description: 'Compare model variant performance',
    category: 'evaluation',
    minWidth: 6,
    minHeight: 350,
    defaultWidth: 12,
    defaultHeight: 450,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  stress_test: {
    id: 'stress_test',
    title: 'STRESS_TESTS',
    description: 'Stress test scenario results',
    category: 'evaluation',
    minWidth: 6,
    minHeight: 400,
    defaultWidth: 12,
    defaultHeight: 500,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  statistical_tests: {
    id: 'statistical_tests',
    title: 'STATISTICAL_TESTS',
    description: 'Statistical validation results',
    category: 'evaluation',
    minWidth: 6,
    minHeight: 350,
    defaultWidth: 12,
    defaultHeight: 450,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  llm_export: {
    id: 'llm_export',
    title: 'LLM_EXPORT',
    description: 'Export data for LLM analysis',
    category: 'evaluation',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: false,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: true,
  },
  
  // Polymarket widgets
  polymarket_prices: {
    id: 'polymarket_prices',
    title: 'POLY_MARKETS',
    description: 'Live Polymarket prices',
    category: 'polymarket',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 1000,
  },
  polymarket_orderbook: {
    id: 'polymarket_orderbook',
    title: 'POLY_ORDERBOOK',
    description: 'Real-time order book depth',
    category: 'polymarket',
    minWidth: 4,
    minHeight: 350,
    defaultWidth: 6,
    defaultHeight: 450,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: false,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 500,
  },
  polymarket_trades: {
    id: 'polymarket_trades',
    title: 'POLY_TRADES',
    description: 'Recent trade feed',
    category: 'polymarket',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: false,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 500,
  },
  
  // Limitless widgets
  limitless_pools: {
    id: 'limitless_pools',
    title: 'LIMITLESS_POOLS',
    description: 'Liquidity pools with TVL/APR',
    category: 'limitless',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 5000,
  },
  limitless_prices: {
    id: 'limitless_prices',
    title: 'LIMITLESS_PRICES',
    description: 'Trading pair prices',
    category: 'limitless',
    minWidth: 4,
    minHeight: 250,
    defaultWidth: 6,
    defaultHeight: 350,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 2000,
  },
  
  // Arbitrage widgets
  arbitrage_monitor: {
    id: 'arbitrage_monitor',
    title: 'ARB_MONITOR',
    description: 'Overall arbitrage monitoring',
    category: 'arbitrage',
    minWidth: 6,
    minHeight: 200,
    defaultWidth: 12,
    defaultHeight: 250,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: false,
    requiresWebSocket: true,
    requiresBackendData: true,
    refreshInterval: 1000,
  },
  arbitrage_opportunities: {
    id: 'arbitrage_opportunities',
    title: 'ARB_OPPORTUNITIES',
    description: 'Live arbitrage opportunities',
    category: 'arbitrage',
    minWidth: 6,
    minHeight: 350,
    defaultWidth: 12,
    defaultHeight: 450,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: true,
    refreshInterval: 1000,
  },
  spread_monitor: {
    id: 'spread_monitor',
    title: 'SPREAD_MONITOR',
    description: 'Real-time spread visualization',
    category: 'arbitrage',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: true,
    hasExport: true,
    requiresWebSocket: true,
    requiresBackendData: true,
    refreshInterval: 500,
  },
  profit_calculator: {
    id: 'profit_calculator',
    title: 'PROFIT_CALC',
    description: 'Fee-adjusted profit calculator',
    category: 'arbitrage',
    minWidth: 4,
    minHeight: 300,
    defaultWidth: 6,
    defaultHeight: 400,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: false,
    hasExport: true,
    requiresWebSocket: false,
    requiresBackendData: false,
  },
  arbitrage_alerts: {
    id: 'arbitrage_alerts',
    title: 'ARB_ALERTS',
    description: 'Arbitrage alert notifications',
    category: 'arbitrage',
    minWidth: 3,
    minHeight: 200,
    defaultWidth: 4,
    defaultHeight: 300,
    isResizable: true,
    isCollapsible: true,
    hasRefresh: false,
    hasExport: false,
    requiresWebSocket: true,
    requiresBackendData: false,
    refreshInterval: 1000,
  },
};

// ============================================================================
// LAYOUT PRESETS
// ============================================================================

export type LayoutPreset = 
  | 'DEFAULT'
  | 'EXECUTION'
  | 'ANALYTICAL'
  | 'STACKED'
  | 'COMPREHENSIVE'
  | 'TRADING'
  | 'ANALYTICS'
  | 'ARBITRAGE';

export interface LayoutColumn {
  widgets: WidgetType[];
  width: number; // Grid columns (out of 12)
}

export interface DashboardLayout {
  id: LayoutPreset;
  name: string;
  description: string;
  sidebar: WidgetType[];
  columns: LayoutColumn[];
}

export const LAYOUT_PRESETS: Record<LayoutPreset, DashboardLayout> = {
  DEFAULT: {
    id: 'DEFAULT',
    name: 'Default',
    description: 'Standard analysis layout',
    sidebar: [],
    columns: [
      { widgets: ['opportunity', 'consensus', 'kelly'], width: 4 },
      { widgets: ['monte_carlo', 'revenue', 'pipeline_perf'], width: 6 },
    ],
  },
  EXECUTION: {
    id: 'EXECUTION',
    name: 'Execution',
    description: 'Optimized for trade execution',
    sidebar: [],
    columns: [
      { widgets: ['opportunity', 'consensus', 'pipeline_perf'], width: 4 },
      { widgets: ['kelly', 'revenue', 'monte_carlo'], width: 6 },
    ],
  },
  ANALYTICAL: {
    id: 'ANALYTICAL',
    name: 'Analytical',
    description: 'Deep analysis focus',
    sidebar: [],
    columns: [
      { widgets: ['monte_carlo', 'revenue'], width: 6 },
      { widgets: ['opportunity', 'consensus', 'kelly', 'pipeline_perf'], width: 6 },
    ],
  },
  STACKED: {
    id: 'STACKED',
    name: 'Stacked',
    description: 'Single column layout',
    sidebar: [],
    columns: [
      { widgets: ['opportunity', 'consensus', 'kelly', 'monte_carlo', 'revenue', 'pipeline_perf'], width: 10 },
    ],
  },
  COMPREHENSIVE: {
    id: 'COMPREHENSIVE',
    name: 'Comprehensive',
    description: 'All widgets - evaluation + live markets',
    sidebar: [],
    columns: [
      { widgets: ['polymarket_prices', 'limitless_pools', 'arbitrage_opportunities'], width: 6 },
      { widgets: ['backtest_summary', 'stress_test', 'statistical_tests'], width: 6 },
    ],
  },
  TRADING: {
    id: 'TRADING',
    name: 'Trading',
    description: 'Live markets + arbitrage focus',
    sidebar: [],
    columns: [
      { widgets: ['polymarket_prices', 'polymarket_orderbook', 'polymarket_trades'], width: 4 },
      { widgets: ['limitless_pools', 'limitless_prices'], width: 4 },
      { widgets: ['arbitrage_opportunities', 'spread_monitor', 'arbitrage_alerts'], width: 4 },
    ],
  },
  ANALYTICS: {
    id: 'ANALYTICS',
    name: 'Analytics',
    description: 'Evaluation and backtesting focus',
    sidebar: [],
    columns: [
      { widgets: ['backtest_summary', 'model_variant_comparison'], width: 6 },
      { widgets: ['stress_test', 'statistical_tests', 'llm_export'], width: 6 },
    ],
  },
  ARBITRAGE: {
    id: 'ARBITRAGE',
    name: 'Arbitrage',
    description: 'Cross-platform arbitrage monitoring',
    sidebar: [],
    columns: [
      { widgets: ['arbitrage_monitor', 'arbitrage_opportunities'], width: 6 },
      { widgets: ['spread_monitor', 'profit_calculator', 'arbitrage_alerts'], width: 6 },
    ],
  },
};

// ============================================================================
// WIDGET INSTANCE STATE
// ============================================================================

export interface WidgetInstance {
  id: string; // Unique instance ID
  type: WidgetType;
  
  // Position
  column: number;
  order: number;
  
  // State
  isCollapsed: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  
  // Data timestamps
  lastUpdated?: number;
  lastRefreshed?: number;
  
  // Custom settings (per-widget)
  settings?: Record<string, unknown>;
}

export interface DashboardState {
  // Current layout
  currentPreset: LayoutPreset;
  customLayout?: DashboardLayout;
  
  // Widget instances
  widgets: WidgetInstance[];
  
  // Sidebar
  sidebarWidgets: WidgetType[];
  sidebarCollapsed: boolean;
  
  // Global settings
  autoRefresh: boolean;
  refreshInterval: number;
  compactMode: boolean;
  
  // WebSocket status
  wsConnected: boolean;
  wsLatency?: number;
}
