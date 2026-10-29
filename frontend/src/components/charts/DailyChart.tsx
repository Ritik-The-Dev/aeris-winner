import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyPoint } from '../../api/types';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatDate } from '../../lib/format';
import { CHART, DailyTooltip, LegendKey, axisTick } from './ChartBits';

export function DailyChart({
  daily,
  selectedDay,
  onSelectDay,
  compact = false,
}: {
  daily: DailyPoint[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  compact?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const data = daily.map((point) => ({
    ...point,
    label: formatDate(`${point.delivery_date}T12:00:00Z`),
  }));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <LegendKey colour={CHART.forecast} label="MAE by delivery day" />
        <LegendKey colour={CHART.over} label="Bias" dashed />
      </div>
      <div className={compact ? 'h-[190px] w-full' : 'h-[240px] w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            className="[&_.recharts-bar-rectangle]:cursor-pointer"
          >
            <CartesianGrid strokeDasharray="2 5" vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              interval={1}
              tickMargin={8}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}`}
              tickCount={4}
            />
            <ReferenceLine y={0} stroke="rgba(238,234,222,0.22)" />
            <Tooltip
              content={<DailyTooltip />}
              cursor={{ fill: 'rgba(238,234,222,0.04)' }}
            />
            <Bar
              dataKey="mae_mw"
              name="MAE"
              barSize={12}
              radius={[1, 1, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={650}
              onClick={(entry) => {
                const point = entry as unknown as DailyPoint;
                if (point.delivery_date) onSelectDay(point.delivery_date);
              }}
            >
              {data.map((point) => {
                const selected = point.delivery_date === selectedDay;
                const fill = selected
                  ? CHART.forecast
                  : point.bias_mw !== null && point.bias_mw > 400
                    ? 'rgba(232,155,75,0.46)'
                    : point.bias_mw !== null && point.bias_mw < -400
                      ? 'rgba(63,212,197,0.4)'
                      : 'rgba(238,234,222,0.18)';
                return <Cell key={point.delivery_date} fill={fill} />;
              })}
            </Bar>
            <Line
              type="monotone"
              dataKey="bias_mw"
              name="Bias"
              stroke={CHART.over}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 2.5, fill: CHART.over }}
              isAnimationActive={!reduced}
              animationDuration={650}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.11em] text-dim">
        Click a bar to move the interval chart to that delivery day.
      </p>
    </div>
  );
}
