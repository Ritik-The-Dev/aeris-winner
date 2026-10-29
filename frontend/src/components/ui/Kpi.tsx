import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { formatNumber } from '../../lib/format';

type Tone = 'teal' | 'amber' | 'paper' | 'rust';

interface KpiProps {
  label: string;
  value: number | null | undefined;
  unit?: 'mw' | 'pct' | 'count' | 'hours';
  digits?: number;
  signed?: boolean;
  tone?: Tone;
  definition: string;
  footnote?: string;
  icon?: LucideIcon;
  loading?: boolean;
}

const toneClasses: Record<Tone, string> = {
  teal: 'text-teal-300',
  amber: 'text-amber-300',
  paper: 'text-paper',
  rust: 'text-rust',
};

export function Kpi({
  label,
  value,
  unit = 'mw',
  digits = 0,
  signed = false,
  tone = 'paper',
  definition,
  footnote,
  icon: Icon,
  loading = false,
}: KpiProps) {
  const numeric = useCountUp(value === null || value === undefined ? null : Math.abs(value), digits);
  const sign =
    value !== null && value !== undefined ? (value > 0 ? '+' : value < 0 ? '−' : '') : '';
  const prefix = signed ? sign : value !== null && value !== undefined && value < 0 ? '−' : '';
  const display = loading
    ? '—'
    : value === null || value === undefined
      ? '—'
      : unit === 'mw'
        ? `${prefix}${numeric} MW`
        : unit === 'pct'
          ? `${prefix}${numeric}%`
          : unit === 'hours'
            ? `${prefix}${numeric}h`
            : formatNumber(Math.abs(value), digits);

  return (
    <div className="group relative flex min-h-[9.5rem] flex-col justify-between border-l border-paper/10 px-4 py-4 first:border-l-0 md:px-5">
      <div className="flex items-start justify-between gap-2">
        <span className="label text-dim">{label}</span>
        {Icon && <Icon size={14} strokeWidth={1.5} className="text-dim/70" aria-hidden="true" />}
      </div>
      <div className="mt-5">
        <div
          className={`font-mono text-[clamp(1.65rem,3vw,2.55rem)] font-medium leading-none tracking-[-0.06em] tabular-nums ${toneClasses[tone]}`}
          aria-label={`${label}: ${display}`}
        >
          {display}
        </div>
        <p className="mt-3 max-w-[24ch] text-[0.72rem] leading-relaxed text-mist/80">{definition}</p>
        {footnote && (
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">{footnote}</p>
        )}
      </div>
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-current opacity-40 transition-transform duration-500 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 border-y border-paper/10 bg-ink-900/40 md:grid-cols-3 xl:grid-cols-5">
      {children}
    </div>
  );
}

export function MiniMetric({
  label,
  value,
  tone = 'paper',
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0">
      <div className="label text-dim">{label}</div>
      <div className={`mt-1 font-mono text-sm tabular-nums ${toneClasses[tone]}`}>{value}</div>
    </div>
  );
}
