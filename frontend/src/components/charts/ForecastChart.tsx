import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '../../api/types';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { CHART, ForecastTooltip, axisTick, timeTick } from './ChartBits';

export function ForecastChart({ points }: { points: SeriesPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const chartData = points.map((point) => ({
    ...point,
    label: timeTick(point.start_time),
  }));

  if (!chartData.length) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed border-paper/15 text-sm text-dim">
        No intervals in this delivery day.
      </div>
    );
  }

  return (
    <div>
      <div className="h-[280px] w-full sm:h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.forecast} stopOpacity={0.24} />
                <stop offset="100%" stopColor={CHART.forecast} stopOpacity={0.015} />
              </linearGradient>
              <linearGradient id="actual-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.actual} stopOpacity={0.09} />
                <stop offset="100%" stopColor={CHART.actual} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 5"
              vertical={false}
              stroke={CHART.grid}
            />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              interval={5}
              minTickGap={18}
              tickMargin={8}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => `${Math.round(value / 1000)} GW`}
              domain={[0, 'auto']}
              tickCount={5}
            />
            <Tooltip
              content={<ForecastTooltip />}
              cursor={{ stroke: CHART.forecast, strokeOpacity: 0.32, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="forecast_mw"
              name="Forecast"
              stroke={CHART.forecast}
              strokeWidth={1.4}
              strokeDasharray="4 3"
              fill="url(#forecast-fill)"
              dot={false}
              activeDot={{ r: 2.8, fill: CHART.forecast, stroke: '#fffdf7', strokeWidth: 1.5 }}
              isAnimationActive={!reduced}
              animationDuration={700}
            />
            <Area
              type="monotone"
              dataKey="actual_mw"
              name="Actual"
              stroke={CHART.actual}
              strokeWidth={1.6}
              fill="url(#actual-fill)"
              dot={false}
              activeDot={{ r: 2.8, fill: CHART.actual, stroke: '#fffdf7', strokeWidth: 1.5 }}
              isAnimationActive={!reduced}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 border-t border-paper/10 pt-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-dim">
            Signed error · forecast − actual
          </span>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-dim">
            <span className="text-amber-300">■</span> over&nbsp;&nbsp;
            <span className="text-teal-300">■</span> under
          </span>
        </div>
        <div className="h-[74px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 2, right: 6, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <ReferenceLine y={0} stroke="rgba(23,21,17,0.24)" strokeWidth={1} />
              <Tooltip
                content={<ForecastTooltip />}
                cursor={{ fill: 'rgba(23,21,17,0.04)' }}
              />
              <Bar dataKey="error_mw" isAnimationActive={!reduced} animationDuration={600}>
                {chartData.map((point) => (
                  <Cell
                    key={point.start_time}
                    fill={
                      point.error_mw === null
                        ? '#d9d0c0'
                        : point.error_mw >= 0
                          ? CHART.over
                          : CHART.under
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

