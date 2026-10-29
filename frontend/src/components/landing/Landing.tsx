import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Wind } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import { buildWindField, dayLabel, resolveDay } from '../../lib/analysis';
import {
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

  const tickerItems = [
    'Elexon WINDFOR · hourly vintages',
    'FUELHH · half-hourly outturn',
    `Cutoff ${filters.cutoff_time} Europe/London`,
    'No look-ahead',
    metrics ? `${formatNumber(metrics.matched_intervals)} matched intervals` : 'Loading the audit',
    metrics ? `MAE ${formatMW(metrics.mae_mw)}` : 'MAE pending',
    metrics ? `Bias ${formatSignedMW(metrics.bias_mw)}` : 'Bias pending',
  ];

  return (
    <div ref={reveal} className="relative overflow-hidden">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-lines" aria-hidden="true" />

      <section className="relative mx-auto grid max-w-[1560px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-14">
        <div data-reveal className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-ink-900/55 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-mist shadow-insetline">
              <span
                className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-teal-300 shadow-[0_0_0_4px_rgba(43,75,242,0.1)]"
                aria-hidden="true"
              />
              Live Elexon audit · Jan 2026
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-400/10 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-amber-200">
              09:50 cutoff
            </span>
          </div>

          <h1 className="mt-6 max-w-[12ch] font-display text-[clamp(3.5rem,7.8vw,7.35rem)] leading-[0.82] tracking-[-0.045em] text-paper">
            A month of wind,
            <span className="relative mt-1 block italic text-teal-300">
              held to account.
              <span
                className="absolute -bottom-2 left-0 h-2 w-[92%] -rotate-1 rounded-full bg-amber-400/30 blur-[2px]"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-7 max-w-[54ch] text-[0.98rem] leading-relaxed text-mist">
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

          <div className="mt-9 grid max-w-xl grid-cols-2 gap-2">
            <div className="rounded-[1.15rem] border border-paper/10 bg-ink-900/50 p-3.5 shadow-insetline">
              <p className="label text-dim">Decision window</p>
              <p className="mt-1.5 font-mono text-xs text-paper">1–31 Jan 2026</p>
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-dim">
                delivery 2 Jan – 1 Feb
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-paper/10 bg-ink-900/50 p-3.5 shadow-insetline">
              <p className="label text-dim">Cutoff assumption</p>
              <p className="mt-1.5 font-mono text-xs text-paper">
                {filters.cutoff_time} Europe/London
              </p>
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-dim">
                N2EX day-ahead gate · configurable
              </p>
            </div>
          </div>
        </div>

        <div data-reveal className="relative z-10 min-w-0">
          <div className="pointer-events-none absolute -left-5 top-16 hidden h-24 w-24 rounded-full bg-teal-300/15 blur-2xl lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 bottom-24 hidden h-36 w-36 rounded-full bg-amber-400/20 blur-3xl lg:block" aria-hidden="true" />

          <div className="panel wind-card relative overflow-hidden rounded-[2rem] border-paper/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink-950">
                  <Wind size={14} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-dim">
                    National wind field
                  </p>
                  <p className="font-display text-[1.05rem] leading-tight text-paper">
                    Forecast error ridges
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-paper/10 bg-ink-950/65 px-3 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-mist backdrop-blur">
                {data ? dayLabel(effectiveDay) : 'Loading Elexon records'}
              </span>
            </div>
            {data && field ? (
              <WindfieldStage
                field={field}
                selectedDay={effectiveDay}
                onSelectDay={setSelectedDay}
                className="h-[320px] sm:h-[390px] lg:h-[450px]"
                compact
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center p-5 sm:h-[390px] lg:h-[450px]">
                {error ? (
                  <ErrorState message={error} onRetry={retry} compact />
                ) : (
                  <LoadingState label={loading ? 'Reading Elexon records' : 'Preparing wind field'} />
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 border-t border-paper/10 p-2.5 sm:p-3">
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
          <p className="mt-3 text-right font-mono text-[0.55rem] uppercase tracking-[0.12em] text-dim">
            Height: national wind · colour: forecast error · drag to orbit
          </p>
        </div>
      </section>

      <div className="ticker relative" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {tickerItems.map((item) => (
                <span key={`${copy}-${item}`} className="ticker-item">
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section
        data-reveal
        className="mx-auto max-w-[1560px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        aria-label="Headline results"
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <LandingStat
            label="MAE"
            value={metrics ? formatMW(metrics.mae_mw) : '—'}
            note="mean absolute error"
            accent="bg-teal-300"
          />
          <LandingStat
            label="RMSE"
            value={metrics ? formatMW(metrics.rmse_mw) : '—'}
            note="penalises large misses"
            accent="bg-paper"
          />
          <LandingStat
            label="Bias"
            value={metrics ? formatSignedMW(metrics.bias_mw) : '—'}
            note="positive = overforecast"
            tone="text-amber-300"
            accent="bg-amber-400"
          />
          <LandingStat
            label="Coverage"
            value={metrics ? formatNumber(metrics.matched_intervals) : '—'}
            note={
              metrics
                ? `of ${formatNumber(metrics.expected_intervals)} intervals · ${formatPct(metrics.coverage_pct)} matched`
                : 'matched intervals'
            }
            accent="bg-lime"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-14">
          <div data-reveal>
            <p className="eyebrow">The finding</p>
            <h2 className="mt-4 max-w-[13ch] font-display text-[clamp(2.5rem,4.8vw,4.4rem)] leading-[0.9] tracking-[-0.025em] text-paper">
              The wind came in <span className="italic text-amber-300">below</span> the forecast.
            </h2>
            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-mist">
              Across every matched interval in the month, the selected day-ahead
              forecast was higher than outturn on average. That is a purchasing
              exposure, not a rounding error.
            </p>
            <Link
              to="/accuracy"
              className="mt-6 inline-flex items-center gap-2 border-b border-teal-300/40 pb-1 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-teal-200 transition-colors hover:border-teal-300 hover:text-teal-100"
            >
              Decompose the error
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-3" data-reveal>
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
        <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">From publication to delivery</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,3.4vw,3rem)] leading-none text-paper">
                The audit chain.
              </h2>
            </div>
            <p className="max-w-[38ch] text-xs leading-relaxed text-mist">
              One documented path from the published vintage to the outturn interval, with
              every exclusion visible.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
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
              value={data ? `${filters.cutoff_time} Europe/London` : '—'}
            />
            <TimelineStep
              index="C"
              title="Delivery"
              body="Compare the selected hourly forecast with half-hourly FUELHH outturn. Hold, never interpolate."
              value={data ? `${formatNumber(data.metrics.matched_intervals)} intervals` : '—'}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1560px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div data-reveal>
            <p className="eyebrow">Start with the evidence</p>
            <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(2.4rem,4.6vw,4rem)] leading-[0.92] text-paper">
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
        <div className="mt-10 grid gap-2 md:grid-cols-3" data-reveal>
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

      <section className="mx-auto max-w-[1560px] px-4 pb-4 sm:px-6 lg:px-8">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[2rem] bg-paper px-6 py-10 text-ink-950 shadow-lift sm:px-10 sm:py-12"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-500/40 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-400/35 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-ink-950/55">
                The audit is live
              </p>
              <h2 className="mt-3 max-w-[16ch] font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[0.9] tracking-[-0.025em]">
                Read the month in full.
              </h2>
              <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-ink-950/65">
                Open the overview for the delivery-day picture, or step into the wind field
                to inspect the ridges directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/overview"
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-teal-300 px-5 font-sans text-[0.72rem] font-semibold text-ink-950 transition-transform hover:-translate-y-0.5"
              >
                Open overview
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link
                to="/windfield"
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-ink-950/30 bg-ink-950/5 px-5 font-sans text-[0.72rem] font-semibold text-ink-950 transition-colors hover:bg-ink-950 hover:text-paper"
              >
                Explore the wind field
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
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
    <div className="min-w-0 rounded-[0.95rem] bg-ink-900/55 px-3 py-2.5 shadow-insetline">
      <p className="label text-[0.5rem] text-dim">{label}</p>
      <p className={`mt-1.5 truncate font-mono text-[0.76rem] tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function LandingStat({
  label,
  value,
  note,
  tone = 'text-paper',
  accent = 'bg-paper',
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
  accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border border-paper/10 bg-ink-900/45 p-5 shadow-insetline transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/25 hover:bg-ink-850 hover:shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="label text-dim">{label}</p>
        <span className={`h-2 w-2 rounded-full ${accent}`} aria-hidden="true" />
      </div>
      <p className={`mt-7 font-mono text-[clamp(1.45rem,2.6vw,2.35rem)] leading-none tracking-[-0.055em] tabular-nums ${tone}`}>
        {value}
      </p>
      <p className="mt-2 text-[0.68rem] leading-snug text-dim">{note}</p>
      <span
        className="pointer-events-none absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-teal-300/50 transition-transform duration-500 group-hover:scale-x-100"
        aria-hidden="true"
      />
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
    <article className="group relative flex min-h-[15rem] flex-col overflow-hidden rounded-[1.6rem] border border-paper/10 bg-ink-900/45 p-5 shadow-insetline transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/25 hover:bg-ink-850 hover:shadow-soft sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-dim">{index}</span>
        <span className="h-2 w-2 rounded-full bg-teal-400/60 transition-transform duration-300 group-hover:scale-150" aria-hidden="true" />
      </div>
      <h3 className="mt-8 font-display text-[1.55rem] leading-tight text-paper">{title}</h3>
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
    <div className="group rounded-[1.5rem] border border-paper/10 bg-ink-950/65 p-5 shadow-insetline transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/25 hover:bg-ink-900 hover:shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-[0.62rem] text-ink-950">
          {index}
        </span>
        <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-paper">{title}</h3>
      </div>
      <p className="mt-5 max-w-[38ch] text-xs leading-relaxed text-mist/85">{body}</p>
      <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-dim">{value}</p>
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
      className="group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.75rem] border border-paper/10 bg-ink-900/45 p-6 shadow-insetline transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/30 hover:bg-ink-850 hover:shadow-soft sm:p-8"
    >
      <span
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-teal-300/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-dim">{index}</p>
      <h3 className="mt-6 font-display text-[2.35rem] leading-none text-paper">{title}</h3>
      <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-mist/85">{body}</p>
      <span className="mt-auto inline-flex items-center gap-2.5 pt-7 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-teal-200">
        Enter
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/15 transition-all duration-300 group-hover:border-teal-300 group-hover:bg-teal-300 group-hover:text-ink-950">
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
