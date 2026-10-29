import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatMW,
  formatPct,
  formatSignedMW,
  formatTime,
  statusLabel,
} from './format';

describe('format helpers', () => {
  it('renders London local time, not UTC', () => {
    expect(formatTime('2026-01-02T00:00:00Z')).toBe('00:00');
    expect(formatDateTime('2026-01-02T00:30:00Z')).toBe('02 Jan, 00:30');
    expect(formatDate('2026-01-02T00:00:00Z')).toBe('02 Jan');
  });

  it('respects British Summer Time', () => {
    expect(formatTime('2026-06-01T12:00:00Z')).toBe('13:00');
  });

  it('handles nulls without fabricating a value', () => {
    expect(formatMW(null)).toBe('—');
    expect(formatSignedMW(undefined)).toBe('—');
    expect(formatPct(null)).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });

  it('uses a consistent sign convention for signed values', () => {
    expect(formatSignedMW(1729.931)).toBe('+1,730 MW');
    expect(formatSignedMW(-1729.931)).toBe('−1,730 MW');
    expect(formatPct(21.678)).toBe('+21.7%');
  });

  it('labels every interval status', () => {
    expect(statusLabel('matched')).toBe('Matched');
    expect(statusLabel('missing_forecast')).toBe('No eligible forecast');
    expect(statusLabel('missing_actual')).toBe('No actual');
    expect(statusLabel('missing_both')).toBe('No forecast or actual');
  });
});
