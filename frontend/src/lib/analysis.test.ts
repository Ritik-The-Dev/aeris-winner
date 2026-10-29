import { describe, expect, it } from 'vitest';

import type { DailyPoint, SeriesPoint } from '../api/types';
import {
  buildWindField,
  describeBias,
  quantile,
  resolveDay,
  seriesForDay,
  shiftDay,
  summariseDay,
} from './analysis';

function point(overrides: Partial<SeriesPoint> = {}): SeriesPoint {
  return {
    start_time: '2026-01-02T00:00:00Z',
    delivery_date: '2026-01-02',
    decision_date: '2026-01-01',
    settlement_period: 1,
    forecast_mw: 1100,
    actual_mw: 1000,
    error_mw: 100,
    status: 'matched',
    forecast_publish_time: '2026-01-01T09:30:00Z',
    cutoff_time: '2026-01-01T09:50:00Z',
    lead_time_hours: 14.5,
    ...overrides,
  };
}

function dailyPoint(overrides: Partial<DailyPoint> = {}): DailyPoint {
  return {
    delivery_date: '2026-01-02',
    decision_date: '2026-01-01',
    expected_intervals: 48,
    matched_intervals: 48,
    coverage_pct: 100,
    mae_mw: 100,
    rmse_mw: 100,
    bias_mw: 100,
    max_absolute_error_mw: 100,
    ...overrides,
  };
}

describe('seriesForDay', () => {
  it('filters to one delivery day and sorts by interval start', () => {
    const series = [
      point({ start_time: '2026-01-02T00:30:00Z', settlement_period: 2 }),
      point({ start_time: '2026-01-02T00:00:00Z', settlement_period: 1 }),
      point({ delivery_date: '2026-01-03', start_time: '2026-01-03T00:00:00Z' }),
    ];
    expect(seriesForDay(series, '2026-01-02').map((row) => row.settlement_period)).toEqual([1, 2]);
  });
});

describe('summariseDay', () => {
  it('uses only matched intervals and does not zero-fill missing pairs', () => {
    const series = [
      point({ actual_mw: 0, forecast_mw: 100, error_mw: 100 }),
      point({
        start_time: '2026-01-02T00:30:00Z',
        settlement_period: 2,
        forecast_mw: 1200,
        actual_mw: 1000,
        error_mw: 200,
      }),
      point({
        start_time: '2026-01-02T01:00:00Z',
        settlement_period: 3,
        forecast_mw: null,
        actual_mw: 900,
        error_mw: null,
        status: 'missing_forecast',
      }),
      point({
        start_time: '2026-01-02T01:30:00Z',
        settlement_period: 4,
        forecast_mw: 900,
        actual_mw: null,
        error_mw: null,
        status: 'missing_actual',
      }),
    ];
    const summary = summariseDay(series, '2026-01-02');

    expect(summary.matched).toBe(2);
    expect(summary.expected).toBe(4);
    expect(summary.coveragePct).toBe(50);
    expect(summary.mae).toBe(150);
    expect(summary.bias).toBe(150);
    expect(summary.maxAbsError).toBe(200);
    expect(summary.peakActual).toBe(1000);
    expect(summary.troughActual).toBe(0);
  });

  it('reports the most common publish time across matched intervals', () => {
    const series = [
      point(),
      point({ start_time: '2026-01-02T00:30:00Z', settlement_period: 2 }),
      point({
        start_time: '2026-01-02T01:00:00Z',
        settlement_period: 3,
        forecast_publish_time: '2026-01-01T09:00:00Z',
      }),
    ];
    const summary = summariseDay(series, '2026-01-02');
    expect(summary.selectedPublish).toBe('2026-01-01T09:30:00Z');
    expect(summary.selectedPublishCount).toBe(2);
  });

  it('returns nulls for an empty day', () => {
    const summary = summariseDay([], '2026-01-02');
    expect(summary.matched).toBe(0);
    expect(summary.coveragePct).toBeNull();
    expect(summary.mae).toBeNull();
    expect(summary.bias).toBeNull();
    expect(summary.maxAbsError).toBeNull();
    expect(summary.peakActual).toBeNull();
  });
});

describe('day navigation', () => {
  const daily = [
    dailyPoint({ delivery_date: '2026-01-02' }),
    dailyPoint({ delivery_date: '2026-01-03' }),
    dailyPoint({ delivery_date: '2026-01-04' }),
  ];

  it('keeps a valid requested day', () => {
    expect(resolveDay(daily, '2026-01-03')).toBe('2026-01-03');
  });

  it('falls back to the first day when a request is outside the window', () => {
    expect(resolveDay(daily, '2026-02-01')).toBe('2026-01-02');
  });

  it('clamps shiftDay at both ends', () => {
    expect(shiftDay(daily, '2026-01-02', -1)).toBe('2026-01-02');
    expect(shiftDay(daily, '2026-01-04', 1)).toBe('2026-01-04');
    expect(shiftDay(daily, '2026-01-03', 1)).toBe('2026-01-04');
  });
});

describe('describeBias', () => {
  it('classifies overforecast, underforecast and neutral results', () => {
    expect(describeBias(300).label).toBe('Overforecast');
    expect(describeBias(-300).label).toBe('Underforecast');
    expect(describeBias(200).label).toBe('Near neutral');
    expect(describeBias(null).label).toBe('No result');
  });
});

describe('buildWindField', () => {
  it('keeps every interval, including missing pairs, and derives extrema', () => {
    const series = [
      point({ forecast_mw: 1800, actual_mw: 1200, error_mw: 600 }),
      point({
        start_time: '2026-01-02T00:30:00Z',
        settlement_period: 2,
        forecast_mw: null,
        actual_mw: 1400,
        error_mw: null,
        status: 'missing_forecast',
      }),
      point({
        delivery_date: '2026-01-03',
        start_time: '2026-01-03T00:00:00Z',
        forecast_mw: 900,
        actual_mw: 800,
        error_mw: 100,
      }),
    ];
    const daily = [dailyPoint(), dailyPoint({ delivery_date: '2026-01-03' })];
    const field = buildWindField(series, daily);

    expect(field.days).toEqual(['2026-01-02', '2026-01-03']);
    expect(field.byDay[0]).toHaveLength(2);
    expect(field.byDay[1]).toHaveLength(1);
    expect(field.cells).toHaveLength(3);
    expect(field.cells[1].absoluteError).toBeNull();
    expect(field.maxActual).toBe(1400);
    expect(field.maxForecast).toBe(1800);
    expect(field.maxAbsoluteError).toBe(600);
    expect(field.matched).toBe(2);
  });
});

describe('quantile', () => {
  it('uses nearest rank and handles empty input', () => {
    expect(quantile([], 0.9)).toBeNull();
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2);
    expect(quantile([4, 1, 3, 2], 0.9)).toBe(4);
  });
});
