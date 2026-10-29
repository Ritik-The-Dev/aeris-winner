/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import type { TooltipProps } from 'recharts';
import type { DailyPoint, HistogramBin, SeriesPoint } from '../../api/types';
import {
  formatDateTimeFull,
  formatMW,
  formatNumber,
  formatSignedMW,
  formatTime,
} from '../../lib/format';

export const CHART = {
  forecast: '#74e5d9',
  actual: '#eeeade',
  over: '#e89b4b',
  under: '#3fd4c5',
  grid: 'rgba(238,234,222,0.075)',
  axis: '#758684',
};

export const axisTick = {
  fill: CHART.axis,
  fontSize: 9.5,
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  letterSpacing: '0.04em',
} as const;

export function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-[13rem] border border-teal-500/25 bg-ink-950/95 p-3 shadow-lift backdrop-blur-md">
      {children}
    </div>
  );
}

export function TooltipRow({
  label,
  value,
  tone = 'text-paper',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-5 py-0.5">
      <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
        {label}
      </span>
      <span className={`font-mono text-[0.72rem] tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export function ForecastTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as SeriesPoint | undefined;
  if (!point) return null;
  const over = point.error_mw !== null && point.error_mw >= 0;
  return (
    <TooltipShell>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-teal-200">
        {formatDateTimeFull(point.start_time)}
      </p>
      <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
        Delivery day {point.delivery_date} · SP {point.settlement_period}
      </p>
      <div className="mt-2.5 border-t border-paper/10 pt-2">
        <TooltipRow label="Forecast" value={formatMW(point.forecast_mw)} tone="text-teal-200" />
        <TooltipRow label="Actual" value={formatMW(point.actual_mw)} />
        <TooltipRow
          label="Error"
          value={formatSignedMW(point.error_mw)}
          tone={over ? 'text-amber-300' : 'text-teal-300'}
        />
        <TooltipRow label="Lead time" value={point.lead_time_hours ? `${formatNumber(point.lead_time_hours, 1)}h` : '—'} />
      </div>
      {point.forecast_publish_time && (
        <p className="mt-2 border-t border-paper/10 pt-2 font-mono text-[0.55rem] leading-relaxed text-dim">
          WINDFOR publish {formatDateTimeFull(point.forecast_publish_time)}
        </p>
      )}
    </TooltipShell>
  );
}

export function DailyTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DailyPoint | undefined;
  if (!point) return null;
  return (
    <TooltipShell>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-teal-200">
        Delivery {point.delivery_date}
      </p>
      <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
        Decision {point.decision_date} · {point.matched_intervals}/{point.expected_intervals} matched
      </p>
      <div className="mt-2.5 border-t border-paper/10 pt-2">
        <TooltipRow label="MAE" value={formatMW(point.mae_mw)} />
        <TooltipRow label="Bias" value={formatSignedMW(point.bias_mw)} tone="text-amber-300" />
        <TooltipRow label="RMSE" value={formatMW(point.rmse_mw)} />
        <TooltipRow label="Max abs." value={formatMW(point.max_absolute_error_mw)} />
      </div>
      <p className="mt-2 border-t border-paper/10 pt-2 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-dim">
        Click to inspect this day
      </p>
    </TooltipShell>
  );
}

export function HistogramTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const bin = payload[0]?.payload as
    | (HistogramBin & { mid: number; total: number })
    | undefined;
  if (!bin) return null;
  return (
    <TooltipShell>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-teal-200">
        {formatSignedMW(bin.from_mw)} to {formatSignedMW(bin.to_mw)}
      </p>
      <div className="mt-2.5 border-t border-paper/10 pt-2">
        <TooltipRow label="Intervals" value={formatNumber(bin.count)} />
        <TooltipRow
          label="Share"
          value={`${formatNumber((bin.count / Math.max(bin.total, 1)) * 100, 1)}%`}
        />
      </div>
    </TooltipShell>
  );
}

export function LegendKey({
  colour,
  label,
  dashed = false,
}: {
  colour: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
      <i
        className="h-px w-5"
        style={{
          backgroundColor: dashed ? 'transparent' : colour,
          borderTop: dashed ? `1px dashed ${colour}` : undefined,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function timeTick(value: string): string {
  return formatTime(value);
}
