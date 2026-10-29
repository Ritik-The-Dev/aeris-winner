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

const iconToneClasses: Record<Tone, string> = {
  teal: 'bg-teal-300/10 text-teal-300',
  amber: 'bg-amber-400/10 text-amber-300',
  paper: 'bg-paper/[0.06] text-paper',
  rust: 'bg-rust/10 text-rust',
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
    <div className="group relative flex min-h-[10rem] flex-col justify-between overflow-hidden rounded-[1.4rem] border border-paper/10 bg-ink-850/70 px-4 py-4 shadow-insetline transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/25 hover:bg-ink-900 hover:shadow-soft md:px-5">
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-teal-300/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-2">
        <span className="label text-dim">{label}</span>
        {Icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${iconToneClasses[tone]}`}
          >
            <Icon size={13} strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="relative mt-5">
        <div
          className={`font-mono text-[clamp(1.55rem,2.8vw,2.35rem)] font-medium leading-none tracking-[-0.06em] tabular-nums ${toneClasses[tone]}`}
          aria-label={`${label}: ${display}`}
        >
          {display}
        </div>
        <p className="mt-3 max-w-[24ch] text-[0.7rem] leading-relaxed text-mist/85">{definition}</p>
        {footnote && (
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-dim">
            {footnote}
          </p>
        )}
      </div>
      <span
        className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-teal-300/60 transition-transform duration-500 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-[2rem] border border-paper/10 bg-ink-900/35 p-2 shadow-insetline md:grid-cols-3 xl:grid-cols-5">
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
    <div className="min-w-0 rounded-[0.9rem] bg-ink-900/45 px-3 py-2.5">
      <div className="label text-dim">{label}</div>
      <div className={`mt-1 font-mono text-sm tabular-nums ${toneClasses[tone]}`}>{value}</div>
    </div>
  );
}
