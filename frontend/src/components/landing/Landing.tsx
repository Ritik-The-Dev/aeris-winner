import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Wind } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import { buildWindField, dayLabel, resolveDay } from '../../lib/analysis';
import {
  formatDateTimeFull,
  formatMW,
  formatNumber,
  formatPct,
  formatSignedMW,
} from '../../lib/format';
import { WindfieldStage } from '../windfield/WindfieldStage';
import { ErrorState, LoadingState } from '../ui/States';

export function Landing() {
  const {
    data,
    loading,
    error,
    retry,
    selectedDay,
    setSelectedDay,
    filters,
  } = useAnalysis();
  const reveal = useReveal<HTMLDivElement>(data?.generated_at ?? 'landing');
  const metrics = data?.metrics;
  const effectiveDay = data ? resolveDay(data.daily, selectedDay) : selectedDay;
  const field = useMemo(
    () => (data ? buildWindField(data.series, data.daily) : null),
    [data],
  );

  return (
    <div ref={reveal} className="relative overflow-hidden">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-lines" aria-hidden="true" />

      <section className="relative mx-auto grid max-w-[1560px] gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-14 lg:px-8 lg:pb-20 lg:pt-16">
        <div data-reveal>
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-teal-400/70" aria-hidden="true" />
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-teal-200">
              GB national wind · decision audit
            </p>
          </div>
          <h1 className="mt-6 max-w-[15ch] font-display text-[clamp(3.4rem,7.3vw,7rem)] leading-[0.88] tracking-[-0.035em] text-paper">
            A month of wind,
            <span className="mt-1 block italic text-teal-200/90">held to account.</span>
          </h1>
          <p className="mt-7 max-w-[55ch] text-[0.98rem] leading-relaxed text-mist">
            Every half-hour of January&apos;s national wind outturn, matched to the latest
            Elexon WINDFOR vintage actually available before the purchasing desk&apos;s
            day-ahead cutoff. No look-ahead. No zero-filling. No invented data.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/overview" className="btn-primary btn-lg">
              Read the audit
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link to="/method" className="btn-outline btn-lg">
              How the cutoff works
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 border-t border-paper/10 pt-5">
            <div>
              <p className="label text-dim">Decision window</p>
              <p className="mt-1.5 font-mono text-xs text-paper">
                1–31 Jan 2026
              </p>
              <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-dim">
                delivery 2 Jan – 1 Feb
              </p>
            </div>
            <div>
              <p className="label text-dim">Cutoff assumption</p>
              <p className="mt-1.5 font-mono text-xs text-paper">
                {filters.cutoff_time} Europe/London
              </p>
              <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-dim">
                N2EX day-ahead gate · configurable
              </p>
            </div>
          </div>
        </div>

        <div data-reveal className="min-w-0">
          <div className="panel relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-paper/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Wind size={13} className="text-teal-300" aria-hidden="true" />
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-mist">
                  National wind field
                </span>
              </div>
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
                {data ? dayLabel(effectiveDay) : 'Loading Elexon records'}
              </span>
            </div>
            {data && field ? (
              <WindfieldStage
                field={field}
                selectedDay={effectiveDay}
                onSelectDay={setSelectedDay}
                className="h-[300px] sm:h-[360px] lg:h-[420px]"
                compact
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center p-5 sm:h-[360px] lg:h-[420px]">
                {error ? (
                  <ErrorState message={error} onRetry={retry} compact />
                ) : (
                  <LoadingState label={loading ? 'Reading Elexon records' : 'Preparing wind field'} />
                )}
              </div>
            )}
            <div className="grid grid-cols-3 divide-x divide-paper/10 border-t border-paper/10">
              <HeroMicro
                label="Mean forecast"
                value={formatMW(metrics?.mean_forecast_mw)}
                tone="text-teal-200"
              />
              <HeroMicro
                label="Mean outturn"
                value={formatMW(metrics?.mean_actual_mw)}
                tone="text-paper"
              />
              <HeroMicro
                label="Mean bias"
                value={formatSignedMW(metrics?.bias_mw)}
                tone="text-amber-300"
              />
            </div>
          </div>
          <p className="mt-3 text-right font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
            Height: national wind · colour: forecast error · drag to orbit
          </p>
        </div>
      </section>

      <section
        data-reveal
        className="relative border-y border-paper/10 bg-ink-900/45"
        aria-label="Headline results"
      >
        <div className="mx-auto grid max-w-[1560px] grid-cols-2 divide-x divide-paper/10 px-0 md:grid-cols-4">
          <LandingStat
            label="MAE"
            value={metrics ? formatMW(metrics.mae_mw) : '—'}
            note="mean absolute error"
          />
          <LandingStat
            label="RMSE"
            value={metrics ? formatMW(metrics.rmse_mw) : '—'}
            note="penalises large misses"
          />
          <LandingStat
            label="Bias"
            value={metrics ? formatSignedMW(metrics.bias_mw) : '—'}
            note="positive = overforecast"
            tone="text-amber-300"
          />
          <LandingStat
            label="Coverage"
            value={metrics ? `${formatNumber(metrics.matched_intervals)} / ${formatNumber(metrics.expected_intervals)}` : '—'}
            note={metrics ? `${formatPct(metrics.coverage_pct)} matched` : 'matched intervals'}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1560px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div data-reveal>
            <p className="eyebrow">The finding</p>
            <h2 className="mt-3 max-w-[13ch] font-display text-[clamp(2.4rem,4.6vw,4.1rem)] leading-[0.94] tracking-[-0.02em] text-paper">
              The wind came in below the forecast.
            </h2>
            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-mist">
              Across every matched interval in the month, the selected day-ahead
              forecast was higher than outturn on average. That is a purchasing
              exposure, not a rounding error.
            </p>
            <Link
              to="/accuracy"
              className="mt-6 inline-flex items-center gap-2 border-b border-teal-500/40 pb-1 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-teal-200 transition-colors hover:border-teal-300"
            >
              Decompose the error
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-px bg-paper/10 sm:grid-cols-3" data-reveal>
            <FindingCard
              index="01"
              title="The forecast ran hot"
              value={metrics ? formatSignedMW(metrics.bias_mw) : '—'}
              body={
                metrics
                  ? `Mean forecast ${formatMW(metrics.mean_forecast_mw)} against mean outturn ${formatMW(metrics.mean_actual_mw)}.`
                  : 'Mean signed error across matched intervals.'
              }
              tone="text-amber-300"
            />
            <FindingCard
              index="02"
              title="The miss was material"
              value={metrics ? formatMW(metrics.p90_absolute_error_mw) : '—'}
              body={
                metrics
                  ? `P90 absolute error. The largest single interval miss was ${formatMW(metrics.max_absolute_error_mw)}.`
                  : 'P90 absolute error across the month.'
              }
              tone="text-paper"
            />
            <FindingCard
              index="03"
              title="Coverage is not the excuse"
              value={metrics ? formatPct(metrics.coverage_pct) : '—'}
              body={
                data
                  ? `${formatNumber(data.data_quality.eligible_forecast_versions)} eligible forecast versions, selected without look-ahead.`
                  : 'Matched intervals across the decision window.'
              }
              tone="text-teal-300"
            />
          </div>
        </div>
      </section>

      <section className="relative border-y border-paper/10 bg-ink-900/35">
        <div className="mx-auto grid max-w-[1560px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <TimelineStep
            index="A"
            title="Publication"
            body="WINDFOR publishes eight runs a day. Each target hour carries a stack of vintages."
            value={data ? `${formatNumber(data.data_quality.forecast_publication_runs)} runs in scope` : '—'}
          />
          <TimelineStep
            index="B"
            title="Cutoff"
            body="Keep only vintages with publishTime at or before the decision cutoff, then take the latest."
            value={data ? formatDateTimeFull(data.series[0]?.cutoff_time) : '—'}
          />
          <TimelineStep
            index="C"
            title="Delivery"
            body="Compare the selected hourly forecast with half-hourly FUELHH outturn. Hold, never interpolate."
            value={data ? `${formatNumber(data.metrics.matched_intervals)} intervals` : '—'}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1560px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div data-reveal>
            <p className="eyebrow">Start with the evidence</p>
            <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[0.95] text-paper">
              One window. Three ways in.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3" data-reveal>
            <Link to="/windfield" className="btn-outline">
              Inspect the wind field
              <ArrowDownRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/intervals" className="btn-outline">
              Open the interval ledger
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="mt-10 grid gap-px bg-paper/10 md:grid-cols-3" data-reveal>
          <EntryCard
            to="/overview"
            index="01 / Overview"
            title="What happened"
            body="Forecast against outturn for any delivery day, with the decision window and selected vintage in view."
          />
          <EntryCard
            to="/accuracy"
            index="02 / Accuracy"
            title="Where it hurt"
            body="Signed error distribution, daily bias, time-of-day profile and lead-time exposure."
          />
          <EntryCard
            to="/intervals"
            index="03 / Intervals"
            title="Which interval"
            body="A complete ledger with every forecast vintage, the cutoff line and the outturn used."
          />
        </div>
      </section>
    </div>
  );
}

function HeroMicro({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="px-3 py-3">
      <p className="label text-[0.52rem] text-dim">{label}</p>
      <p className={`mt-1.5 truncate font-mono text-[0.78rem] tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function LandingStat({
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
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <p className="label text-dim">{label}</p>
      <p className={`mt-3 font-mono text-[clamp(1.4rem,2.6vw,2.4rem)] leading-none tracking-[-0.05em] tabular-nums ${tone}`}>
        {value}
      </p>
      <p className="mt-2 text-[0.68rem] leading-snug text-dim">{note}</p>
    </div>
  );
}

function FindingCard({
  index,
  title,
  value,
  body,
  tone,
}: {
  index: string;
  title: string;
  value: string;
  body: string;
  tone: string;
}) {
  return (
    <article className="group bg-ink-950 p-5 transition-colors hover:bg-ink-900/80 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-dim">{index}</span>
        <span className="h-1 w-1 bg-teal-400/60 transition-transform group-hover:scale-150" aria-hidden="true" />
      </div>
      <h3 className="mt-6 font-display text-[1.45rem] leading-tight text-paper">{title}</h3>
      <p className={`mt-4 font-mono text-2xl tracking-[-0.04em] tabular-nums ${tone}`}>{value}</p>
      <p className="mt-4 text-xs leading-relaxed text-mist/85">{body}</p>
    </article>
  );
}

function TimelineStep({
  index,
  title,
  body,
  value,
}: {
  index: string;
  title: string;
  body: string;
  value: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-teal-500/30 font-mono text-[0.62rem] text-teal-200">
        {index}
      </span>
      <div>
        <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-paper">{title}</h3>
        <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-mist/85">{body}</p>
        <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">{value}</p>
      </div>
    </div>
  );
}

function EntryCard({
  to,
  index,
  title,
  body,
}: {
  to: string;
  index: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group relative bg-ink-950 p-6 transition-colors hover:bg-ink-900/80 sm:p-8"
    >
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-dim">{index}</p>
      <h3 className="mt-5 font-display text-[2rem] leading-none text-paper">{title}</h3>
      <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-mist/85">{body}</p>
      <span className="mt-6 inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-teal-200">
        Enter
        <ArrowRight
          size={13}
          className="transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

