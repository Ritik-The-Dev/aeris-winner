import type { ReactNode } from 'react';
import { AlertTriangle, ArrowUpRight, LoaderCircle, RotateCcw } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import type { SourceInfo } from '../../api/types';

export function LoadingState({
  label = 'Reading Elexon records',
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 border border-paper/10 bg-ink-900/50 px-4 py-3 text-mist ${
        compact ? 'text-xs' : 'text-sm'
      }`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle size={15} className="animate-spin text-teal-300" aria-hidden="true" />
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em]">{label}</span>
      <span className="ml-auto hidden gap-1 sm:flex" aria-hidden="true">
        <i className="h-1 w-1 animate-pulse-soft bg-teal-300" />
        <i className="h-1 w-1 animate-pulse-soft bg-teal-300 [animation-delay:200ms]" />
        <i className="h-1 w-1 animate-pulse-soft bg-teal-300 [animation-delay:400ms]" />
      </span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`border border-rust/40 bg-rust/5 ${compact ? 'p-3' : 'p-5'}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rust" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.15em] text-rust">
            Data unavailable
          </p>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-mist">{message}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-ghost mt-4">
              <RotateCcw size={13} aria-hidden="true" />
              Retry request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-paper/15 px-5 py-10 text-center">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">
        No rows to display
      </p>
      <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-mist">{children}</p>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-paper/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2
          id={id}
          className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[0.98] tracking-[-0.015em] text-paper"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-mist">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ChartFrame({
  eyebrow,
  title,
  description,
  action,
  children,
  footer,
  className = '',
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`panel flex min-w-0 flex-col p-4 sm:p-5 ${className}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h3
            id={id ? `${id}-title` : undefined}
            className="mt-1.5 font-display text-[1.45rem] leading-tight text-paper"
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 max-w-[58ch] text-xs leading-relaxed text-mist/85">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-5 min-w-0 flex-1">{children}</div>
      {footer && (
        <footer className="mt-4 border-t border-paper/10 pt-3 text-[0.68rem] leading-relaxed text-dim">
          {footer}
        </footer>
      )}
    </section>
  );
}

export function SourceNote({ source }: { source: SourceInfo }) {
  return (
    <div className="flex flex-col gap-3 border border-paper/10 bg-ink-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="label text-dim">Provenance</p>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          {source.provider} — {source.datasets.join(' + ')}. Origin:{' '}
          <span className="font-mono text-paper">{source.origin}</span>
          {source.snapshot_sha256 && (
            <>
              {' '}· snapshot{' '}
              <span className="font-mono text-[0.66rem] text-dim">
                {source.snapshot_sha256.slice(0, 12)}…
              </span>
            </>
          )}
        </p>
      </div>
      <SourceBadge source={source} />
    </div>
  );
}

export function InlineLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-1.5 border-b border-teal-500/40 pb-0.5 text-teal-200 transition-colors hover:border-teal-300 hover:text-teal-100"
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {children}
      <ArrowUpRight
        size={12}
        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}
