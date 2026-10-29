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
import type { DiurnalPoint } from '../../api/types';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { CHART, LegendKey, TooltipRow, TooltipShell, axisTick } from './ChartBits';
import { formatMW, formatSignedMW } from '../../lib/format';

function DiurnalTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DiurnalPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <TooltipShell>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-teal-200">
        Hour beginning {point.label}
      </p>
      <div className="mt-2 border-t border-paper/10 pt-2">
        <TooltipRow label="MAE" value={formatMW(point.mae_mw)} />
        <TooltipRow label="Bias" value={formatSignedMW(point.bias_mw)} tone="text-amber-300" />
        <TooltipRow
          label="Matched"
          value={`${point.matched_intervals}/${point.expected_intervals}`}
        />
      </div>
    </TooltipShell>
  );
}

export function DiurnalChart({ diurnal }: { diurnal: DiurnalPoint[] }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <LegendKey colour={CHART.forecast} label="MAE by delivery hour" />
        <LegendKey colour={CHART.over} label="Bias" dashed />
      </div>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={diurnal} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            <ReferenceLine y={0} stroke="rgba(23,21,17,0.22)" />
            <Tooltip content={<DiurnalTooltip />} cursor={{ fill: 'rgba(23,21,17,0.04)' }} />
            <Bar
              dataKey="mae_mw"
              name="MAE"
              barSize={10}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={600}
            >
              {diurnal.map((point) => (
                <Cell key={point.hour} fill="rgba(15,155,142,0.34)" />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="bias_mw"
              name="Bias"
              stroke={CHART.over}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.11em] text-dim">
        Hours use Europe/London wall-clock time. Error is averaged across both half-hours.
      </p>
    </div>
  );
}
