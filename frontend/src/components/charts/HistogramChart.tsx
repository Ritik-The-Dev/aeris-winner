import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Histogram } from '../../api/types';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { CHART, HistogramTooltip, axisTick } from './ChartBits';

export function HistogramChart({ histogram }: { histogram: Histogram }) {
  const reduced = usePrefersReducedMotion();
  if (!histogram.bins.length) {
    return (
      <div className="flex h-[230px] items-center justify-center border border-dashed border-paper/15 text-sm text-dim">
        No signed errors to distribute.
      </div>
    );
  }

  const data = histogram.bins.map((bin) => ({
    ...bin,
    mid: bin.from_mw !== null && bin.to_mw !== null ? (bin.from_mw + bin.to_mw) / 2 : 0,
    total: histogram.sample_size,
  }));

  return (
    <div>
      <div className="h-[245px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 5" vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="mid"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              tickFormatter={(value: number) =>
                `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value / 1000))}`
              }
              tickMargin={8}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={32}
              tickCount={4}
            />
            <ReferenceLine x={0} stroke="rgba(238,234,222,0.4)" strokeDasharray="2 3" />
            <Tooltip content={<HistogramTooltip />} cursor={{ fill: 'rgba(238,234,222,0.04)' }} />
            <Bar
              dataKey="count"
              name="Intervals"
              barSize={12}
              radius={[1, 1, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={650}
            >
              {data.map((bin, index) => (
                <Cell
                  key={`${bin.from_mw}-${index}`}
                  fill={bin.mid >= 0 ? CHART.over : CHART.under}
                  fillOpacity={0.78}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-paper/10 pt-2 font-mono text-[0.55rem] uppercase tracking-[0.11em] text-dim">
        <span>← underforecast</span>
        <span>GW signed error</span>
        <span>overforecast →</span>
      </div>
    </div>
  );
}
