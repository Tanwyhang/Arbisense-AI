'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { RevenueProjection, RevenueScenario } from '@/types/api';
import { ChartContainer } from '@/components/charts';
import ChartControls, { TimePreset, ComparisonToggle, ScenarioSelector } from '@/components/charts/ChartControls';
import ChartLegend, { LegendItem } from '@/components/charts/ChartLegend';
import { RevenueTooltip } from '@/components/charts/CustomTooltip';
import { useChartExport } from '@/hooks';

interface RevenueProjectionVizProps {
  data: RevenueProjection;
}

const SCENARIO_COLORS: Record<string, string> = {
  'Best Case': 'var(--success-ag-green)',
  'Average Case': 'var(--accent-safety-yellow)',
  'Stress Case': 'var(--alert-signal-red)',
  'Black Swan': 'var(--ink-charcoal)',
};

export default function RevenueProjectionViz({ data }: RevenueProjectionVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleScenarios, setVisibleScenarios] = useState<Set<string>>(
    new Set(data.scenarios.map(s => s.scenario_name))
  );
  const [activePreset, setActivePreset] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareA, setCompareA] = useState<string>(data.scenarios[0]?.scenario_name || '');
  const [compareB, setCompareB] = useState<string>(data.scenarios[2]?.scenario_name || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { exportPNG, exportSVG } = useChartExport({
    containerRef,
    filename: 'revenue-projection',
  });

  // Transform data for Recharts with cumulative values
  const chartData = useMemo(() => {
    const numDays = data.scenarios[0]?.daily_revenue.length || 30;
    const result = [];
    const cumulative: Record<string, number> = {};
    
    data.scenarios.forEach(s => { cumulative[s.scenario_name] = 0; });

    for (let day = 0; day < numDays; day++) {
      const point: Record<string, number> = { day };
      
      data.scenarios.forEach(scenario => {
        cumulative[scenario.scenario_name] += scenario.daily_revenue[day];
        point[scenario.scenario_name] = cumulative[scenario.scenario_name];
        point[`${scenario.scenario_name}_daily`] = scenario.daily_revenue[day];
      });

      result.push(point);
    }

    return result;
  }, [data.scenarios]);

  // Legend items
  const legendItems: LegendItem[] = useMemo(() => 
    data.scenarios.map(s => ({
      id: s.scenario_name,
      name: s.scenario_name,
      color: SCENARIO_COLORS[s.scenario_name] || 'var(--ink-charcoal)',
      visible: visibleScenarios.has(s.scenario_name),
    })), [data.scenarios, visibleScenarios]);

  const handleToggleScenario = useCallback((id: string) => {
    setVisibleScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((visible: boolean) => {
    if (visible) {
      setVisibleScenarios(new Set(data.scenarios.map(s => s.scenario_name)));
    } else {
      setVisibleScenarios(new Set());
    }
  }, [data.scenarios]);

  const handlePresetChange = useCallback((preset: TimePreset) => {
    setActivePreset(preset.id);
  }, []);

  const handleReset = useCallback(() => {
    setVisibleScenarios(new Set(data.scenarios.map(s => s.scenario_name)));
    setActivePreset('all');
    setComparisonMode(false);
  }, [data.scenarios]);

  // Confidence band data (between best and worst)
  const confidenceBand = useMemo(() => {
    if (chartData.length === 0) return null;
    const best = data.scenarios.find(s => s.scenario_name === 'Best Case');
    const worst = data.scenarios.find(s => s.scenario_name === 'Black Swan');
    if (!best || !worst) return null;
    return { upper: 'Best Case', lower: 'Black Swan' };
  }, [chartData, data.scenarios]);

  // Scenarios for comparison dropdown
  const scenarioOptions = data.scenarios.map(s => ({ id: s.scenario_name, name: s.scenario_name }));

  return (
    <div ref={containerRef}>
      <ChartContainer
        title="Revenue Projection"
        subtitle="4 Stress Test Scenarios • Cumulative Revenue"
        badge={{ text: '30D P&L', variant: 'default' }}
        computationTime={data.computation_time_ms}
        onExportPNG={exportPNG}
        onExportSVG={exportSVG}
        onReset={handleReset}
        onFullscreenChange={setIsFullscreen}
      >
        {/* Legend */}
        <ChartLegend
          items={legendItems}
          onToggle={handleToggleScenario}
          onToggleAll={handleToggleAll}
          layout="horizontal"
        />

        {/* Chart */}
        <div style={{ 
          padding: 'var(--space-4)', 
          background: 'var(--base-raw-white)', 
          flex: isFullscreen ? 1 : undefined, 
          height: isFullscreen ? '100%' : '350px',
          minHeight: '350px' 
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="0" 
                stroke="var(--grid-line)" 
                vertical={false}
              />
              
              <XAxis
                dataKey="day"
                axisLine={{ stroke: 'var(--ink-charcoal)', strokeWidth: 2 }}
                tickLine={false}
                tick={{ fill: 'var(--ink-charcoal)', fontSize: 11, fontFamily: 'var(--font-data)' }}
                tickFormatter={(val) => `Day ${val}`}
                interval="preserveStartEnd"
              />
              
              <YAxis
                axisLine={{ stroke: 'var(--ink-charcoal)', strokeWidth: 2 }}
                tickLine={false}
                tick={{ fill: 'var(--ink-charcoal)', fontSize: 11, fontFamily: 'var(--font-data)' }}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                width={70}
              />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="var(--ink-charcoal)" strokeWidth={2} strokeDasharray="8 4" />

              {/* Scenario lines */}
              {data.scenarios.map((scenario) => {
                const isVisible = visibleScenarios.has(scenario.scenario_name);
                const isCompareHighlight = comparisonMode && 
                  (scenario.scenario_name === compareA || scenario.scenario_name === compareB);
                
                if (!isVisible && !isCompareHighlight) return null;
                
                return (
                  <Line
                    key={scenario.scenario_name}
                    type="linear"
                    dataKey={scenario.scenario_name}
                    stroke={SCENARIO_COLORS[scenario.scenario_name]}
                    strokeWidth={isCompareHighlight ? 4 : 3}
                    strokeOpacity={isCompareHighlight ? 1 : 0.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}

              <Tooltip
                content={<RevenueTooltip />}
                cursor={{ stroke: 'var(--accent-safety-yellow)', strokeDasharray: '4 4' }}
              />

              <Brush
                dataKey="day"
                height={30}
                stroke="var(--ink-charcoal)"
                fill="var(--bg-layer-2)"
                travellerWidth={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Controls */}
        <ChartControls
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          showShortcuts={true}
        >
          <ComparisonToggle enabled={comparisonMode} onToggle={() => setComparisonMode(!comparisonMode)} />
          {comparisonMode && (
            <>
              <ScenarioSelector scenarios={scenarioOptions} selected={compareA} onSelect={setCompareA} label="A" />
              <ScenarioSelector scenarios={scenarioOptions} selected={compareB} onSelect={setCompareB} label="B" />
            </>
          )}
        </ChartControls>
      </ChartContainer>

      {/* Performance Metrics */}
      <PerformanceMetrics data={data} scenarioColors={SCENARIO_COLORS} />
    </div>
  );
}

function PerformanceMetrics({ data, scenarioColors }: { data: RevenueProjection; scenarioColors: Record<string, string> }) {
  const scenarioFinalRevenues = data.scenarios.map(s => ({
    name: s.scenario_name,
    total: s.total_revenue,
    color: scenarioColors[s.scenario_name],
  }));

  return (
    <div style={{
      padding: 'var(--space-4)',
      borderBottom: 'var(--border-thick)',
      background: 'var(--bg-layer-2)',
      borderLeft: 'var(--border-thick)',
      borderRight: 'var(--border-thick)'
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.875rem',
        marginBottom: 'var(--space-3)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
      }}>30-Day Projection Summary</div>

      {/* Scenario outcomes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        marginBottom: 'var(--space-4)',
        border: 'var(--border-thin)'
      }}>
        {scenarioFinalRevenues.map(scenario => (
          <div key={scenario.name} style={{
            padding: 'var(--space-3)',
            borderRight: 'var(--border-thin)',
            background: 'var(--base-raw-white)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 'var(--space-1)',
              color: '#b8bfc7'
            }}>{scenario.name}</div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              fontFamily: 'var(--font-data)',
              color: scenario.total >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
              lineHeight: 1
            }}>{scenario.total >= 0 ? '+' : ''}${scenario.total.toFixed(0)}</div>
          </div>
        ))}
      </div>

      {/* Expected value */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        border: 'var(--border-thick)',
        background: 'var(--base-raw-white)'
      }}>
        <div className="number-indicator" style={{ background: 'var(--accent-safety-yellow)', color: 'var(--ink-charcoal)' }}>EV</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: '4px'
          }}>Expected Value</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: data.expected_value >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)',
            lineHeight: 1
          }}>{data.expected_value >= 0 ? '+' : ''}${data.expected_value.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-data)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: '4px' }}>Downside Risk:</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--alert-signal-red)' }}>
            {data.downside_risk_pct.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
