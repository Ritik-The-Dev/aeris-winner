import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  Crosshair,
  Gauge,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import {
  describeBias,
  resolveDay,
  summariseDay,
} from '../../lib/analysis';
import {
  formatDateTimeFull,
  formatMW,
  formatNumber,
  formatPct,
  formatSignedMW,
  formatTime,
} from '../../lib/format';
import { Kpi, KpiStrip, MiniMetric } from '../ui/Kpi';
import {
  ChartFrame,
  EmptyState,
  ErrorState,
  LoadingState,
  SourceNote,
} from '../ui/States';
import { DaySelector } from '../ui/DaySelector';
import { ForecastChart } from '../charts/ForecastChart';
import { DailyChart } from '../charts/DailyChart';
import { SourceBadge } from '../ui/SourceBadge';

function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2
    : (ordered[middle] ?? null);
}

export function OverviewPage() {
  const {
    data,
    loading,
    refreshing,
    error,
    retry,
    selectedDay,
    setSelectedDay,
    openInspector,
  } = useAnalysis();
  const reveal = useReveal(data?.generated_at ?? 'overview');

  if (!data) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">Overview / 01</p>
        <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.92] text-paper">
          Forecast vs outturn
        </h1>
        <div className="mt-8">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <LoadingState label={loading ? 'Matching WINDFOR vintages to FUELHH' : 'Preparing'} />
          )}
        </div>
      </div>
    );
  }

  const day = resolveDay(data.daily, selectedDay);
  const summary = summariseDay(data.series, day);
  const bias = describeBias(summary.bias);
  const cutoffUtc =
    summary.points.find((point) => point.cutoff_time)?.cutoff_time ?? null;
  const leadValues = summary.points
    .map((point) => point.lead_time_hours)
    .filter((value): value is number => value !== null);
  const medianLead = median(leadValues);
  const worst =
    summary.points
      .filter((point) => point.error_mw !== null)
      .sort((a, b) => Math.abs(b.error_mw ?? 0) - Math.abs(a.error_mw ?? 0))[0] ?? null;
  const cutoffLocal = cutoffUtc ? formatDateTimeFull(cutoffUtc) : data.cutoff.time;
  const publishLocal = summary.selectedPublish
    ? formatDateTimeFull(summary.selectedPublish)
    : 'No eligible vintage';
  const missingCount =
    summary.expected - summary.matched;

  return (
    <div ref={reveal} className="mx-auto max-w-[1560px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header data-reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Overview / 01</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.8rem,6vw,5.3rem)] leading-[0.9] tracking-[-0.03em] text-paper">
            Forecast <span className="italic text-teal-200/85">versus</span> outturn
          </h1>
          <p className="mt-5 max-w-[64ch] text-sm leading-relaxed text-mist">
            The selected WINDFOR vintage for every half-hour, compared with Elexon
            FUELHH national wind outturn. The chart starts on a single delivery day;
            month-level results sit in the strip below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <SourceBadge source={data.source} />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">
            {formatNumber(data.metrics.matched_intervals)} matched ·{' '}
            {formatPct(data.metrics.coverage_pct)} coverage
          </span>
        </div>
      </header>

      {refreshing && (
        <div className="mt-5">
          <LoadingState label="Refreshing upstream records" compact />
        </div>
      )}

      <div data-reveal className="mt-8">
        <KpiStrip>
          <Kpi
            label="MAE"
            value={data.metrics.mae_mw}
            definition="Mean absolute error across matched half-hours."
            footnote="month"
            tone="teal"
            icon={Gauge}
          />
          <Kpi
            label="RMSE"
            value={data.metrics.rmse_mw}
            definition="Root mean squared error; large misses weigh more."
            footnote="month"
            icon={Crosshair}
          />
          <Kpi
            label="Bias"
            value={data.metrics.bias_mw}
            signed
            definition="Mean signed error. Positive means the forecast ran above outturn."
            footnote={bias.label.toLowerCase()}
            tone="amber"
            icon={TriangleAlert}
          />
          <Kpi
            label="MAPE"
            value={data.metrics.mape_pct}
            unit="pct"
            digits={1}
            definition="Mean absolute percentage error; zero outturn excluded."
            footnote={`${formatNumber(data.metrics.mape_sample_size)} samples`}
            tone="paper"
          />
          <Kpi
            label="Coverage"
            value={data.metrics.coverage_pct}
            unit="pct"
            digits={1}
            definition="Matched intervals as a share of all expected intervals."
            footnote={`${formatNumber(data.metrics.matched_intervals)} / ${formatNumber(data.metrics.expected_intervals)}`}
            tone="teal"
            icon={ShieldCheck}
          />
        </KpiStrip>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.68fr)]">
        <div data-reveal className="min-w-0">
          <ChartFrame
            eyebrow="Half-hourly"
            title="Forecast and outturn"
            description={`${formatNumber(summary.points.length)} delivery intervals on ${day}. Dashed cobalt is the selected forecast; black is metered outturn.`}
            action={<DaySelector daily={data.daily} value={day} onChange={setSelectedDay} />}
            footer={
              <>
                The WINDFOR hourly value is held across both half-hours. Error is forecast −
                actual; bars below zero are underforecasts.
              </>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-4">
              <DayStat label="Day MAE" value={formatMW(summary.mae)} tone="text-teal-300" />
              <DayStat label="Day bias" value={formatSignedMW(summary.bias)} tone="text-amber-300" />
              <DayStat label="Peak outturn" value={formatMW(summary.peakActual)} />
              <DayStat
                label="Coverage"
                value={summary.coveragePct !== null ? formatPct(summary.coveragePct) : '—'}
                tone={missingCount ? 'text-amber-300' : 'text-teal-300'}
              />
            </div>
            <ForecastChart points={summary.points} />
          </ChartFrame>
        </div>

        <aside data-reveal className="panel flex min-w-0 flex-col">
          <div className="border-b border-paper/10 p-5">
            <p className="eyebrow">Decision anchor</p>
            <h2 className="mt-2 font-display text-[1.7rem] leading-tight text-paper">
              What was knowable, and when.
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-mist/85">
              The selected vintage must exist before the cutoff. Later WINDFOR runs are
              visible in the ledger but never used in this calculation.
            </p>
          </div>

          <div className="flex-1 p-5">
            <dl className="space-y-4">
              <AnchorRow
                label="Decision date"
                value={summary.decisionDate ?? '—'}
                note="Purchasing day d"
              />
              <AnchorRow
                label="Cutoff"
                value={cutoffLocal}
                note={`${formatTime(cutoffUtc)} UTC · ${data.cutoff.timezone}`}
                tone="text-teal-200"
              />
              <AnchorRow
                label="Selected vintage"
                value={publishLocal}
                note={
                  summary.selectedPublishCount
                    ? `${summary.selectedPublishCount} distinct publish time${summary.selectedPublishCount === 1 ? '' : 's'} used`
                    : 'No eligible publication'
                }
              />
              <AnchorRow
                label="Median lead"
                value={medianLead !== null ? `${formatNumber(medianLead, 1)}h` : '—'}
                note="delivery start − publish time"
              />
              <AnchorRow
                label="Delivery day"
                value={day}
                note={`${summary.matched}/${summary.expected} intervals matched`}
              />
            </dl>

            <div className="mt-5 border border-paper/10 bg-ink-950/55 p-3.5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">
                Interpretation
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${bias.tone === 'amber' ? 'text-amber-200' : bias.tone === 'teal' ? 'text-teal-200' : 'text-paper'}`}>
                {bias.sentence}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-mist/80">
                {summary.bias !== null
                  ? `Mean forecast ${formatMW(summary.meanForecast)}; mean outturn ${formatMW(summary.meanActual)}.`
                  : 'No matched intervals for this day.'}
              </p>
            </div>

            <div className="mt-4 flex items-start gap-2.5 border-t border-paper/10 pt-4 text-[0.68rem] leading-relaxed text-dim">
              <Clock3 size={13} className="mt-0.5 shrink-0 text-teal-400" aria-hidden="true" />
              <p>
                {data.cutoff.rationale}{' '}
                <Link to="/method" className="text-teal-200 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-100">
                  Read the assumption
                </Link>
                .
              </p>
            </div>

            {worst && (
              <button
                type="button"
                className="btn-ghost mt-5 w-full justify-between"
                onClick={() => openInspector(worst.start_time)}
              >
                <span>Inspect largest miss · {formatSignedMW(worst.error_mw)}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)]">
        <div data-reveal>
          <ChartFrame
            eyebrow="Month profile"
            title="Daily error"
            description="MAE bars are coloured by the direction of the day's bias; the dashed line is signed bias. Click a bar to load that delivery day."
            footer="Days are delivery days, not decision dates. A decision on 1 January produces the 2 January delivery day."
          >
            <DailyChart daily={data.daily} selectedDay={day} onSelectDay={setSelectedDay} />
          </ChartFrame>
        </div>

        <div data-reveal className="panel min-w-0 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h2 className="mt-1.5 font-display text-[1.45rem] text-paper">Largest misses</h2>
            </div>
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">month</span>
          </div>
          <div className="mt-4 divide-y divide-paper/10 border-y border-paper/10">
            {data.top_errors.slice(0, 6).map((row, index) => (
              <button
                key={row.start_time}
                type="button"
                onClick={() => openInspector(row.start_time)}
                className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-paper/[0.025]"
              >
                <span className="w-4 shrink-0 font-mono text-[0.55rem] text-dim">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[0.66rem] text-paper">
                    {formatDateTimeFull(row.start_time)}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[0.56rem] uppercase tracking-[0.08em] text-dim">
                    SP {row.settlement_period} · forecast {formatMW(row.forecast_mw)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[0.7rem] tabular-nums text-amber-300">
                    {formatSignedMW(row.error_mw)}
                  </span>
                  <span className="mt-0.5 block font-mono text-[0.54rem] uppercase tracking-[0.08em] text-dim">
                    error
                  </span>
                </span>
              </button>
            ))}
          </div>
          <Link to="/intervals" className="btn-ghost mt-4 w-full justify-between">
            Open the full ledger
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center" data-reveal>
        <SourceNote source={data.source} />
        <div className="grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-4 lg:w-[34rem]">
          <MiniMetric label="Actual rows" value={formatNumber(data.data_quality.actual_rows_available)} />
          <MiniMetric label="Forecast rows" value={formatNumber(data.data_quality.forecast_rows_available)} />
          <MiniMetric
            label="Eligible versions"
            value={formatNumber(data.data_quality.eligible_forecast_versions)}
            tone="teal"
          />
          <MiniMetric
            label="Post-cutoff ignored"
            value={formatNumber(data.data_quality.post_cutoff_versions_ignored)}
            tone="amber"
          />
        </div>
      </div>

      {data.data_quality.warnings.length > 0 && (
        <div className="mt-5 border border-amber-400/25 bg-amber-400/5 p-4" role="status">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-amber-200">
            Data notes
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-mist">
            {data.data_quality.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {!summary.points.length && (
        <div className="mt-6">
          <EmptyState>
            No delivery intervals exist for {day} inside this decision window.
          </EmptyState>
        </div>
      )}
    </div>
  );
}

function DayStat({ label, value, tone = 'text-paper' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-ink-950/80 px-3 py-2.5">
      <p className="label text-[0.52rem] text-dim">{label}</p>
      <p className={`mt-1 font-mono text-xs tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function AnchorRow({
  label,
  value,
  note,
  tone = 'text-paper',
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-3 border-b border-paper/10 pb-3.5 last:border-b-0 last:pb-0">
      <dt className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-dim">{label}</dt>
      <dd>
        <p className={`font-mono text-[0.72rem] leading-snug tabular-nums ${tone}`}>{value}</p>
        <p className="mt-1 text-[0.62rem] leading-relaxed text-dim">{note}</p>
      </dd>
    </div>
  );
}
