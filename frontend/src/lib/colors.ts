function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = Math.min(Math.max(amount, 0), 1);
  const channels = a.map((channel, index) =>
    Math.round(channel + (b[index] - channel) * t)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${channels.join('')}`;
}

const NEUTRAL = '#10262e';
const UNDER = '#3fd4c5';
const OVER = '#e89b4b';
const EXTREME = '#b9563f';

/** Sequential diverging scale: teal for underforecast, amber/rust for overforecast. */
export function errorColour(error: number | null, maxAbsoluteError: number): string {
  if (error === null || Number.isNaN(error)) return '#1a2c33';
  const intensity = Math.min(Math.abs(error) / Math.max(maxAbsoluteError, 1), 1);
  if (error >= 0) {
    const amount = Math.pow(intensity, 0.72);
    return amount > 0.72
      ? mix(OVER, EXTREME, (amount - 0.72) / 0.28)
      : mix(NEUTRAL, OVER, amount / 0.72);
  }
  return mix(NEUTRAL, UNDER, Math.pow(intensity, 0.72));
}

export function errorColourRgb(error: number | null, maxAbsoluteError: number): [number, number, number] {
  return hexToRgb(errorColour(error, maxAbsoluteError));
}

export function magnitudeOpacity(error: number | null, maxAbsoluteError: number): number {
  if (error === null) return 0.12;
  return 0.35 + Math.min(Math.abs(error) / Math.max(maxAbsoluteError, 1), 1) * 0.65;
}
