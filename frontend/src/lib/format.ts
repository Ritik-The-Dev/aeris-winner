const LONDON = 'Europe/London';

const numberFormatter = (digits = 0) =>
  new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter(digits).format(value);
}

export function formatMW(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${numberFormatter(digits).format(value)} MW`;
}

export function formatSignedMW(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${numberFormatter(digits).format(Math.abs(value))} MW`;
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${numberFormatter(digits).format(Math.abs(value))}%`;
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${numberFormatter(1).format(value)}h`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDateTimeFull(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatDateLong(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateWithWeekday(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatWindow(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)} 2026`;
}

export function formatDayKey(value: string): string {
  return value.slice(0, 10);
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'matched':
      return 'Matched';
    case 'missing_forecast':
      return 'No eligible forecast';
    case 'missing_actual':
      return 'No actual';
    case 'missing_both':
      return 'No forecast or actual';
    default:
      return status;
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case 'matched':
      return 'text-teal-300';
    case 'missing_forecast':
      return 'text-amber-300';
    case 'missing_actual':
      return 'text-rust';
    default:
      return 'text-mist';
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
