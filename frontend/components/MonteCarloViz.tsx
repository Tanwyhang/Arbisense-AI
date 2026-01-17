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
} from 'recharts';
import { MonteCarloResult } from '@/types/api';
import { ChartContainer, MonteCarloLegend } from '@/components/charts';
import { MonteCarloTooltip } from '@/components/charts/CustomTooltip';
import { useChartExport } from '@/hooks';

interface MonteCarloVizProps {
  data: MonteCarloResult;
}

interface ChartDataPoint {
  day: number;
  [key: string]: number;
}

export default function MonteCarloViz({ data }: MonteCarloVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levyVisible, setLevyVisible] = useState(true);
  const [normalVisible, setNormalVisible] = useState(true);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { exportPNG, exportSVG } = useChartExport({
    containerRef,
    filename: 'monte-carlo-simulation',
  });

  // Transform data for Recharts
  const { chartData, levyPaths, normalPaths } = useMemo(() => {
    const numSteps = data.paths[0]?.values.length || 30;
    const result: ChartDataPoint[] = [];
    const levy: number[] = [];
    const normal: number[] = [];

    data.paths.forEach((path, idx) => {
      if (path.is_levy) levy.push(idx);
      else normal.push(idx);
    });

    for (let day = 0; day < numSteps; day++) {
      const point: ChartDataPoint = { day };
      data.paths.forEach((path, idx) => {
        point[`path_${idx}`] = path.values[day];
      });
      result.push(point);
    }

    return { chartData: result, levyPaths: levy, normalPaths: normal };
  }, [data.paths]);

  // Reset brush
  const handleReset = useCallback(() => {
    setBrushDomain(null);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => ({
    levyCount: levyPaths.length,
    normalCount: normalPaths.length,
    levyPct: ((levyPaths.length / data.paths.length) * 100).toFixed(0),
    normalPct: ((normalPaths.length / data.paths.length) * 100).toFixed(0),
  }), [levyPaths.length, normalPaths.length, data.paths.length]);

  return (
    <div ref={containerRef}>
      <ChartContainer
        title="Monte Carlo Simulation"
        subtitle={`Lévy α=1.7 • Non-Uniform Sampling`}
        badge={{ text: `${data.paths.length} PATHS`, variant: 'default' }}
        computationTime={data.computation_time_ms}
        onExportPNG={exportPNG}
        onExportSVG={exportSVG}
        onReset={handleReset}
        onFullscreenChange={setIsFullscreen}
      >
        {/* Legend */}
        <MonteCarloLegend
          levyVisible={levyVisible}
          normalVisible={normalVisible}
          levyCount={stats.levyCount}
          normalCount={stats.normalCount}
          onToggleLevy={() => setLevyVisible(!levyVisible)}
          onToggleNormal={() => setNormalVisible(!normalVisible)}
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
            <LineChart 
              data={chartData}
              onMouseMove={(e) => {
                if (e?.activeTooltipIndex !== undefined && typeof e.activeTooltipIndex === 'number') {
                  setHoveredDay(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredDay(null)}
            >
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
                width={60}
              />

              {/* Crosshair reference line */}
              {hoveredDay !== null && (
                <ReferenceLine
                  x={hoveredDay}
                  stroke="var(--accent-safety-yellow)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              )}

              {/* Normal paths (rendered first, behind Lévy) */}
              {normalVisible && normalPaths.map((idx) => (
                <Line
                  key={`path_${idx}`}
                  type="linear"
                  dataKey={`path_${idx}`}
                  stroke="var(--ink-charcoal)"
                  strokeWidth={1}
                  strokeOpacity={0.2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}

              {/* Lévy paths (rendered on top) */}
              {levyVisible && levyPaths.map((idx) => (
                <Line
                  key={`path_${idx}`}
                  type="linear"
                  dataKey={`path_${idx}`}
                  stroke="var(--alert-signal-red)"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}

              <Tooltip
                content={<MonteCarloTooltip allPaths={data.paths} />}
                cursor={{ stroke: 'var(--accent-safety-yellow)', strokeDasharray: '4 4' }}
              />

              <Brush
                dataKey="day"
                height={30}
                stroke="var(--ink-charcoal)"
                fill="var(--bg-layer-2)"
                travellerWidth={8}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Statistics Grid */}
      <StatisticsGrid data={data} />

      {/* Fat tail indicator */}
      {data.kurtosis > 3 && <FatTailWarning kurtosis={data.kurtosis} />}
    </div>
  );
}

function StatisticsGrid({ data }: { data: MonteCarloResult }) {
  const stats = [
    { label: 'Mean Return', value: `${(data.mean_return * 100).toFixed(2)}%`, 
      color: data.mean_return >= 0 ? 'var(--success-ag-green)' : 'var(--alert-signal-red)', bg: 1 },
    { label: 'Volatility (σ)', value: `${(data.std_dev * 100).toFixed(2)}%`, 
      color: 'var(--ink-charcoal)', bg: 2 },
    { label: 'CVaR (95%)', value: `${(data.cvar_95 * 100).toFixed(2)}%`, 
      color: 'var(--accent-safety-yellow)', bg: 3 },
    { label: 'Skewness', value: data.skewness.toFixed(3), 
      color: 'var(--ink-charcoal)', bg: 2 },
    { label: 'Kurtosis', value: data.kurtosis.toFixed(3), 
      color: 'var(--ink-charcoal)', bg: 3 },
    { label: 'VaR (95%)', value: `${(data.var_95 * 100).toFixed(2)}%`, 
      color: 'var(--ink-charcoal)', bg: 1 },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 0,
      border: 'var(--border-thin)',
      borderTop: 'none'
    }}>
      {stats.map((stat, i) => (
        <div key={stat.label} style={{
          padding: 'var(--space-4)',
          borderRight: (i + 1) % 3 !== 0 ? 'var(--border-thin)' : 'none',
          borderBottom: 'var(--border-thin)',
          background: `var(--bg-layer-${stat.bg})`
        }}>
          <div className="annotation" style={{ marginBottom: 'var(--space-2)' }}>{stat.label}</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-data)',
            color: stat.color,
            lineHeight: 1
          }}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function FatTailWarning({ kurtosis }: { kurtosis: number }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--accent-safety-yellow)',
      border: 'var(--border-thick)',
      borderTop: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }}>
      <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink-charcoal)' }}>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '4px',
          color: 'var(--ink-charcoal)'
        }}>Fat Tails Detected</div>
        <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-body)', color: 'var(--ink-charcoal)' }}>
          Kurtosis of {kurtosis.toFixed(2)} indicates {((kurtosis - 3) * 10).toFixed(0)}% higher tail risk than normal distribution
        </div>
      </div>
    </div>
  );
}
