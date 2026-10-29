import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleSlash2,
  Lock,
  X,
} from 'lucide-react';
import type { IntervalDetail } from '../../api/types';
import { api, ApiError } from '../../api/client';
import { useAnalysis } from '../../context/AnalysisContext';
import {
  formatDateTimeFull,
  formatHours,
  formatMW,
  formatNumber,
  formatSignedMW,
  formatTime,
  statusLabel,
} from '../../lib/format';
import { LoadingState } from '../ui/States';
import { SourceBadge } from '../ui/SourceBadge';

const FLAG_LABELS: Record<string, string> = {
  hourly_forecast_held_across_half_hour: 'Hourly forecast held across half-hour',
  post_cutoff_versions_excluded: 'Later vintages excluded',
  published_exactly_at_cutoff: 'Published exactly at cutoff',
};

export function Inspector() {
  const { inspectTarget, closeInspector, filters } = useAnalysis();
  const [detail, setDetail] = useState<IntervalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!inspectTarget) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);
    api
      .intervalDetail(filters, inspectTarget, controller.signal)
      .then((payload) => {
        setDetail(payload);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(
          reason instanceof ApiError
            ? reason.message
            : 'The interval detail could not be loaded.',
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [inspectTarget, filters, reload]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInspector();
    },
    [closeInspector],
  );

  useEffect(() => {
    if (!inspectTarget) return;
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [inspectTarget, onKeyDown]);

  if (!inspectTarget) return null;

  const matched = detail?.status === 'matched';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]"
        onClick={closeInspector}
        aria-label="Close interval inspector"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[34rem] flex-col border-l border-teal-500/25 bg-ink-950 shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-paper/10 px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Interval inspector</p>
            <h2 id="inspector-title" className="mt-1.5 font-display text-[1.55rem] leading-tight text-paper">
              {loading || !detail
                ? formatDateTimeFull(inspectTarget)
                : `${formatTime(detail.start_time)}–${formatTime(detail.end_time)}`}
            </h2>
            {detail && (
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
                Delivery {detail.delivery_date} · SP {detail.settlement_period} · decision{' '}
                {detail.decision_date}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button shrink-0"
            onClick={closeInspector}
            aria-label="Close inspector"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && <LoadingState label="Loading forecast vintages" compact />}

          {error && !loading && (
            <div className="border border-rust/35 bg-rust/5 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rust" />
                <div>
                  <p className="text-sm text-mist">{error}</p>
                  <button
                    type="button"
                    className="btn-ghost mt-3"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {detail && !loading && (
            <>
              <div className="grid grid-cols-2 gap-px bg-paper/10">
                <DetailMetric label="Forecast" value={formatMW(detail.forecast_generation_mw)} tone="text-teal-200" />
                <DetailMetric label="Actual" value={formatMW(detail.actual_generation_mw)} tone="text-paper" />
                <DetailMetric
                  label="Error"
                  value={formatSignedMW(detail.error_mw)}
                  tone={detail.error_mw !== null && detail.error_mw >= 0 ? 'text-amber-300' : 'text-teal-300'}
                />
                <DetailMetric label="Absolute" value={formatMW(detail.absolute_error_mw)} />
                <DetailMetric label="Lead time" value={formatHours(detail.forecast_lead_time_hours)} />
                <DetailMetric
                  label="Status"
                  value={statusLabel(detail.status)}
                  tone={matched ? 'text-teal-300' : 'text-amber-300'}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className={`status-pill ${matched ? 'status-matched' : 'status-missing'}`}>
                  {statusLabel(detail.status)}
                </span>
                {detail.flags.map((flag) => (
                  <span key={flag} className="status-pill border-paper/15 text-mist">
                    {FLAG_LABELS[flag] ?? flag}
                  </span>
                ))}
              </div>

              <section className="mt-6">
                <div className="flex items-end justify-between gap-3 border-b border-paper/10 pb-2.5">
                  <div>
                    <p className="eyebrow">Vintage trail</p>
                    <h3 className="mt-1 font-display text-[1.3rem] text-paper">
                      Every WINDFOR version
                    </h3>
                  </div>
                  <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
                    {detail.forecast_versions_eligible} eligible / {detail.forecast_versions_total}
                  </span>
                </div>

                <div className="mt-3 border border-paper/10 bg-ink-900/35 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
                      Decision cutoff
                    </span>
                    <span className="font-mono text-[0.64rem] text-teal-200">
                      {formatDateTimeFull(detail.cutoff_time)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.64rem] leading-relaxed text-dim">
                    Latest eligible vintage selected. Anything published after this instant is
                    shown but excluded.
                  </p>
                </div>

                <ol
                  className="relative mt-4 max-h-[38vh] space-y-0 overflow-y-auto pr-1"
                  tabIndex={0}
                  aria-label="WINDFOR vintage trail"
                >
                  {detail.versions.map((version, index) => {
                    const next = detail.versions[index + 1];
                    const cutoffBoundary =
                      version.available_at_cutoff && next && !next.available_at_cutoff;
                    return (
                      <li key={`${version.publish_time}-${index}`}>
                        <div
                          className={`relative flex gap-3 border-l py-2.5 pl-4 ${
                            version.selected ? 'border-teal-400/70 bg-teal-500/[0.06]' : 'border-paper/10'
                          }`}
                        >
                          <span
                            className={`absolute -left-[3.5px] top-4 h-1.5 w-1.5 rounded-full ${
                              version.selected
                                ? 'bg-teal-300'
                                : version.available_at_cutoff
                                  ? 'bg-mist/45'
                                  : 'bg-dim/30'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span
                                className={`font-mono text-[0.67rem] ${
                                  version.selected
                                    ? 'text-teal-200'
                                    : version.available_at_cutoff
                                      ? 'text-mist'
                                      : 'text-dim'
                                }`}
                              >
                                {formatDateTimeFull(version.publish_time)}
                              </span>
                              <span
                                className={`shrink-0 font-mono text-[0.68rem] tabular-nums ${
                                  version.selected ? 'text-paper' : version.available_at_cutoff ? 'text-mist' : 'text-dim'
                                }`}
                              >
                                {formatMW(version.generation_mw)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.54rem] uppercase tracking-[0.08em] text-dim">
                              <span>{formatHours(version.lead_time_hours)} lead</span>
                              {version.selected && (
                                <span className="inline-flex items-center gap-1 text-teal-300">
                                  <Check size={9} aria-hidden="true" />
                                  selected
                                </span>
                              )}
                              {!version.available_at_cutoff && (
                                <span className="inline-flex items-center gap-1 text-dim">
                                  <Lock size={9} aria-hidden="true" />
                                  after cutoff
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {cutoffBoundary && (
                          <div className="relative my-2 flex items-center gap-2 border-l border-dashed border-teal-500/30 py-1 pl-4">
                            <span className="h-px flex-1 bg-teal-500/25" />
                            <span className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-teal-300/80">
                              cutoff
                            </span>
                            <span className="h-px flex-1 bg-teal-500/25" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {!detail.versions.length && (
                    <li className="flex items-center gap-2 border border-dashed border-paper/15 px-3 py-5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-dim">
                      <CircleSlash2 size={13} aria-hidden="true" />
                      No WINDFOR versions for this target hour
                    </li>
                  )}
                </ol>
              </section>

              <section className="mt-6 border-t border-paper/10 pt-4">
                <p className="eyebrow">Interpretation</p>
                <p className="mt-2 text-xs leading-relaxed text-mist">
                  {detail.flags.includes('hourly_forecast_held_across_half_hour')
                    ? 'This is the second half-hour of an hour. The hourly WINDFOR value is held constant; it is not interpolated.'
                    : 'This is the first half-hour of an hour. The hourly WINDFOR value applies to both intervals in the hour.'}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-dim">
                  {detail.resolution.bridge}
                </p>
              </section>

              <section className="mt-5 border-t border-paper/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <SourceBadge source={detail.source} />
                  <Link
                    to="/intervals"
                    className="inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-teal-200 hover:text-teal-100"
                    onClick={closeInspector}
                  >
                    Ledger
                    <ChevronRight size={11} aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-3 text-[0.62rem] leading-relaxed text-dim">
                  Forecast published {formatDateTimeFull(detail.forecast_publish_time)}; actual
                  publish time {formatDateTimeFull(detail.actual_publish_time)}. Retrieved{' '}
                  {formatDateTimeFull(detail.source.fetched_at)}. All display times Europe/London.
                </p>
              </section>
            </>
          )}

          {!detail && !loading && !error && (
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-dim">
              No detail returned ({formatNumber(0)} rows).
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  tone = 'text-paper',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-ink-900/55 px-3.5 py-3">
      <p className="label text-[0.52rem] text-dim">{label}</p>
      <p className={`mt-1.5 font-mono text-sm tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
