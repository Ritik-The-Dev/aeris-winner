import type { DailyPoint, IntervalStatus, SeriesPoint } from '../api/types';
import { formatDateWithWeekday, formatTime } from './format';

export interface DaySummary {
  deliveryDate: string;
  decisionDate: string | null;
  points: SeriesPoint[];
  matched: number;
  expected: number;
  coveragePct: number | null;
  mae: number | null;
  bias: number | null;
  maxAbsError: number | null;
  meanForecast: number | null;
  meanActual: number | null;
  selectedPublish: string | null;
  selectedPublishCount: number;
  peakActual: number | null;
  troughActual: number | null;
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function seriesForDay(series: SeriesPoint[], deliveryDate: string): SeriesPoint[] {
  return series
    .filter((point) => point.delivery_date === deliveryDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function summariseDay(series: SeriesPoint[], deliveryDate: string): DaySummary {
  const points = seriesForDay(series, deliveryDate);
  const matched = points.filter(
    (point) => point.status === 'matched' && point.error_mw !== null,
  );
  const errors = matched
    .map((point) => point.error_mw)
    .filter((value): value is number => value !== null);
  const absolute = errors.map(Math.abs);
  const actuals = matched
    .map((point) => point.actual_mw)
    .filter((value): value is number => value !== null);
  const forecasts = matched
    .map((point) => point.forecast_mw)
    .filter((value): value is number => value !== null);
  const publishes = new Map<string, number>();
  for (const point of matched) {
    if (!point.forecast_publish_time) continue;
    publishes.set(
      point.forecast_publish_time,
      (publishes.get(point.forecast_publish_time) ?? 0) + 1,
    );
  }
  const dominantPublish = [...publishes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    deliveryDate,
    decisionDate: points[0]?.decision_date ?? null,
    points,
    matched: matched.length,
    expected: points.length,
    coveragePct: points.length ? (matched.length / points.length) * 100 : null,
    mae: mean(absolute),
    bias: mean(errors),
    maxAbsError: absolute.length ? Math.max(...absolute) : null,
    meanForecast: mean(forecasts),
    meanActual: mean(actuals),
    selectedPublish: dominantPublish,
    selectedPublishCount: publishes.size,
    peakActual: actuals.length ? Math.max(...actuals) : null,
    troughActual: actuals.length ? Math.min(...actuals) : null,
  };
}

export function resolveDay(daily: DailyPoint[], requested: string): string {
  if (daily.some((point) => point.delivery_date === requested)) return requested;
  return daily[0]?.delivery_date ?? requested;
}

export function shiftDay(daily: DailyPoint[], current: string, delta: number): string {
  const index = daily.findIndex((point) => point.delivery_date === current);
  if (index < 0) return daily[0]?.delivery_date ?? current;
  const next = Math.min(Math.max(index + delta, 0), daily.length - 1);
  return daily[next]?.delivery_date ?? current;
}

export function describeBias(bias: number | null): {
  label: string;
  tone: 'amber' | 'teal' | 'paper';
  sentence: string;
} {
  if (bias === null) {
    return { label: 'No result', tone: 'paper', sentence: 'No matched intervals to assess.' };
  }
  if (bias > 250) {
    return {
      label: 'Overforecast',
      tone: 'amber',
      sentence: 'The forecast ran above outturn on balance.',
    };
  }
  if (bias < -250) {
    return {
      label: 'Underforecast',
      tone: 'teal',
      sentence: 'The forecast ran below outturn on balance.',
    };
  }
  return {
    label: 'Near neutral',
    tone: 'paper',
    sentence: 'The forecast was broadly centred on outturn.',
  };
}

export interface IntervalCell {
  dayIndex: number;
  intervalIndex: number;
  deliveryDate: string;
  startTime: string;
  label: string;
  status: IntervalStatus;
  forecast: number | null;
  actual: number | null;
  error: number | null;
  absoluteError: number | null;
}

export interface WindField {
  days: string[];
  intervalLabels: string[];
  cells: IntervalCell[];
  byDay: IntervalCell[][];
  maxActual: number;
  maxForecast: number;
  maxAbsoluteError: number;
  matched: number;
}

export function buildWindField(series: SeriesPoint[], daily: DailyPoint[]): WindField {
  const days = daily.map((point) => point.delivery_date);
  const byDay: IntervalCell[][] = [];
  let maxActual = 1;
  let maxForecast = 1;
  let maxAbsoluteError = 1;
  let matched = 0;
  let intervalLabels: string[] = [];

  days.forEach((day, dayIndex) => {
    const points = seriesForDay(series, day);
    if (!intervalLabels.length && points.length) {
      intervalLabels = points.map((point) => formatTime(point.start_time));
    }
    const row: IntervalCell[] = points.map((point, intervalIndex) => {
      if (point.actual_mw !== null) maxActual = Math.max(maxActual, point.actual_mw);
      if (point.forecast_mw !== null) maxForecast = Math.max(maxForecast, point.forecast_mw);
      if (point.error_mw !== null) {
        maxAbsoluteError = Math.max(maxAbsoluteError, Math.abs(point.error_mw));
      }
      if (point.status === 'matched') matched += 1;
      return {
        dayIndex,
        intervalIndex,
        deliveryDate: day,
        startTime: point.start_time,
        label: formatTime(point.start_time),
        status: point.status,
        forecast: point.forecast_mw,
        actual: point.actual_mw,
        error: point.error_mw,
        absoluteError: point.error_mw === null ? null : Math.abs(point.error_mw),
      };
    });
    byDay.push(row);
  });

  return {
    days,
    intervalLabels,
    cells: byDay.flat(),
    byDay,
    maxActual,
    maxForecast,
    maxAbsoluteError,
    matched,
  };
}

export function dayLabel(value: string): string {
  return formatDateWithWeekday(`${value}T12:00:00Z`);
}

export function errorTone(value: number | null, threshold = 2500): string {
  if (value === null) return 'text-dim';
  if (Math.abs(value) < threshold * 0.4) return 'text-teal-300';
  if (Math.abs(value) < threshold) return 'text-paper';
  return 'text-amber-300';
}

export function quantile(values: number[], fraction: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil(fraction * ordered.length) - 1),
  );
  return ordered[index] ?? null;
}
