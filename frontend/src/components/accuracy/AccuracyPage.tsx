import { Link } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import {
  formatDateTimeFull,
  formatMW,
  formatNumber,
  formatPct,
} from '../../lib/format';
import { Kpi, KpiStrip } from '../ui/Kpi';
import {
  ChartFrame,
  ErrorState,
  LoadingState,
  SectionHeading,
  SourceNote,
} from '../ui/States';
import { HistogramChart } from '../charts/HistogramChart';
import { DiurnalChart } from '../charts/DiurnalChart';
import { DailyChart } from '../charts/DailyChart';
import { LeadTimeBars } from '../charts/LeadTimeBars';
import { SourceBadge } from '../ui/SourceBadge';
import { resolveDay } from '../../lib/analysis';

export function AccuracyPage() {
  const { data, loading, error, retry, selectedDay, setSelectedDay } = useAnalysis();
  const reveal = useReveal(data?.generated_at ?? 'accuracy');

  if (!data) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">Accuracy / 03</p>
        <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.92] text-paper">
          Where it hurt
        </h1>
        <div className="mt-8">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <LoadingState label={loading ? 'Computing error distributions' : 'Preparing'} />
          )}
        </div>
      </div>
    );
  }

  const day = resolveDay(data.daily, selectedDay);
  const quality = data.data_quality;
  const normalization = quality.normalization;

  return (
    <div ref={reveal} className="mx-auto max-w-[1560px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header data-reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Accuracy / 03</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.8rem,6vw,5.3rem)] leading-[0.9] tracking-[-0.03em] text-paper">
            Where the <span className="italic text-teal-200/85">error</span> sits.
          </h1>
          <p className="mt-5 max-w-[64ch] text-sm leading-relaxed text-mist">
            The month-level error is not one number. It has a direction, a time-of-day
            shape, a lead-time exposure and a tail. Each view below uses the same
            matched interval set as the overview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <SourceBadge source={data.source} />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">
            {formatNumber(data.metrics.sample_size)} matched intervals
          </span>
        </div>
      </header>

      <div data-reveal className="mt-8">
        <KpiStrip>
          <Kpi
            label="MAE"
            value={data.metrics.mae_mw}
            definition="Average magnitude of forecast error."
            footnote="MW"
            tone="teal"
          />
          <Kpi
            label="Bias"
            value={data.metrics.bias_mw}
            signed
            definition="Average signed error; positive is overforecast."
            footnote="forecast − actual"
            tone="amber"
          />
          <Kpi
            label="MAPE"
            value={data.metrics.mape_pct}
            unit="pct"
            digits={1}
            definition="Mean absolute percentage error, zeros excluded."
            footnote={`${formatNumber(data.metrics.mape_sample_size)} samples`}
          />
          <Kpi
            label="WAPE"
            value={data.metrics.wape_pct}
            unit="pct"
            digits={1}
            definition="Total absolute error divided by total actual generation."
            footnote="MW-weighted"
            tone="teal"
          />
          <Kpi
            label="P90 abs."
            value={data.metrics.p90_absolute_error_mw}
            definition="The 90th percentile of absolute interval error."
            footnote="tail exposure"
            tone="amber"
          />
        </KpiStrip>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)]">
        <div data-reveal>
          <ChartFrame
            eyebrow="Distribution"
            title="Signed error histogram"
            description="Every matched half-hour, bucketed by forecast − actual. The dashed line is zero. The mass to the right is the overforecast."
            footer={`Bins are ${formatMW(data.histogram.bin_width_mw)} wide; ${formatNumber(data.histogram.sample_size)} intervals. Values are rounded for display only.`}
          >
            <HistogramChart histogram={data.histogram} />
          </ChartFrame>
        </div>
        <div data-reveal className="panel min-w-0 p-5">
          <p className="eyebrow">Exposure</p>
          <h2 className="mt-1.5 font-display text-[1.45rem] text-paper">Forecast lead time</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-mist/85">
            How far ahead of delivery the selected vintage was published.
          </p>
          <div className="mt-5">
            <LeadTimeBars leadTime={data.lead_time} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div data-reveal>
          <ChartFrame
            eyebrow="Time of day"
            title="Diurnal error profile"
            description="MAE and signed bias by Europe/London delivery hour, pooled across the month."
            footer="Each hour contains two half-hour intervals per delivery day. Early-hours behaviour is not averaged away."
          >
            <DiurnalChart diurnal={data.diurnal} />
          </ChartFrame>
        </div>
        <div data-reveal>
          <ChartFrame
            eyebrow="Calendar"
            title="Day-by-day spread"
            description="MAE bars by delivery day, with signed bias overlaid as a dashed line."
            footer={
              <>
                Selecting a day here also moves the overview chart.{' '}
                <Link to="/overview" className="text-teal-200 hover:text-teal-100">
                  Open overview
                </Link>
                .
              </>
            }
          >
            <DailyChart daily={data.daily} selectedDay={day} onSelectDay={setSelectedDay} />
          </ChartFrame>
        </div>
      </div>

      <div className="mt-10" data-reveal>
        <SectionHeading
          eyebrow="Audit trail"
          title="What went into the number"
          description="Counts come from the same normalised dataset used for the metrics. Nothing here is imputed or substituted."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div data-reveal className="panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Data quality</p>
              <h2 className="mt-1.5 font-display text-[1.45rem] text-paper">Record counts</h2>
            </div>
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
              normalised
            </span>
          </div>
          <dl className="mt-4 divide-y divide-paper/10 border-y border-paper/10">
            <QualityRow label="Actual rows available" value={quality.actual_rows_available} note="FUELHH wind" />
            <QualityRow label="Actual rows in scope" value={quality.actual_rows_in_scope} note="inside window" />
            <QualityRow label="Expected intervals" value={quality.expected_intervals} note="decision × 48" />
            <QualityRow label="Forecast rows available" value={quality.forecast_rows_available} note="WINDFOR" />
            <QualityRow label="Publication runs" value={quality.forecast_publication_runs} note="distinct publish times" />
            <QualityRow label="Intervals with eligible forecast" value={quality.intervals_with_eligible_forecast} note="at or before cutoff" />
            <QualityRow label="Forecast versions considered" value={quality.forecast_versions_considered} note="candidate rows" />
            <QualityRow label="Eligible versions" value={quality.eligible_forecast_versions} note="in the decision set" />
            <QualityRow label="Post-cutoff ignored" value={quality.post_cutoff_versions_ignored} note="never used" tone="text-amber-300" />
            <QualityRow label="Duplicate rows collapsed" value={quality.duplicate_rows_collapsed} note="deterministic" />
            <QualityRow label="Conflicting duplicates" value={quality.conflicting_duplicates} note="last row wins" tone={quality.conflicting_duplicates ? 'text-amber-300' : undefined} />
            <QualityRow label="Invalid rows" value={quality.invalid_rows} note="rejected, not repaired" />
          </dl>
          <div className="mt-4 grid gap-2 border-t border-paper/10 pt-4 text-[0.64rem] leading-relaxed text-dim sm:grid-cols-2">
            <p>
              Actual span: {formatDateTimeFull(normalization.actual_first)} →{' '}
              {formatDateTimeFull(normalization.actual_last)}
            </p>
            <p>
              WINDFOR publish span: {formatDateTimeFull(normalization.forecast_publish_first)} →{' '}
              {formatDateTimeFull(normalization.forecast_publish_last)}
            </p>
          </div>
        </div>

        <div className="space-y-6" data-reveal>
          <div className="panel p-5">
            <p className="eyebrow">Definitions</p>
            <h2 className="mt-1.5 font-display text-[1.45rem] text-paper">The arithmetic</h2>
            <div className="mt-4 space-y-3">
              <FormulaCard
                term="Error"
                formula="eᵢ = forecastᵢ − actualᵢ"
                note="Positive means overforecast. The same sign convention is used everywhere."
              />
              <FormulaCard term="MAE" formula="mean(|eᵢ|)" note="MW; equally weights every matched interval." />
              <FormulaCard term="RMSE" formula="√mean(eᵢ²)" note="MW; penalises the tail more heavily." />
              <FormulaCard term="Bias" formula="mean(eᵢ)" note="MW; direction, not magnitude." />
              <FormulaCard term="MAPE" formula="mean(|eᵢ| / |actualᵢ|) × 100" note="Zero actuals are excluded from the denominator, never replaced." />
            </div>
          </div>

          <div className="border border-amber-400/25 bg-amber-400/5 p-5">
            <div className="flex items-start gap-3">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-amber-200">
                  Read with care
                </p>
                <p className="mt-2 text-xs leading-relaxed text-mist">
                  MAPE is sensitive when outturn is low. WAPE uses total actual generation
                  as its denominator and is therefore a more stable scale-free summary for
                  this series. Neither changes the underlying interval selection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {quality.warnings.length > 0 && (
        <div className="mt-6 border border-paper/10 bg-ink-900/40 p-5" data-reveal>
          <p className="eyebrow">Run notes</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-mist">
            {quality.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-teal-400" aria-hidden="true" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-reveal>
        <SourceNote source={data.source} />
        <div className="flex flex-wrap gap-2">
          <Link to="/intervals" className="btn-outline">
            Inspect intervals
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <Link to="/method" className="btn-ghost">
            Method
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-4" data-reveal>
        <SmallMetric label="Mean forecast" value={formatMW(data.metrics.mean_forecast_mw)} />
        <SmallMetric label="Mean outturn" value={formatMW(data.metrics.mean_actual_mw)} />
        <SmallMetric label="Max abs. error" value={formatMW(data.metrics.max_absolute_error_mw)} />
        <SmallMetric label="Coverage" value={formatPct(data.metrics.coverage_pct)} />
      </div>
    </div>
  );
}

function QualityRow({
  label,
  value,
  note,
  tone = 'text-paper',
}: {
  label: string;
  value: number;
  note: string;
  tone?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 py-2.5">
      <dt>
        <span className="block text-xs text-mist">{label}</span>
        <span className="mt-0.5 block font-mono text-[0.55rem] uppercase tracking-[0.1em] text-dim">
          {note}
        </span>
      </dt>
      <dd className={`font-mono text-xs tabular-nums ${tone}`}>{formatNumber(value)}</dd>
    </div>
  );
}

function FormulaCard({
  term,
  formula,
  note,
}: {
  term: string;
  formula: string;
  note: string;
}) {
  return (
    <div className="border-l border-teal-500/35 pl-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{term}</span>
        <span className="font-mono text-[0.7rem] text-paper">{formula}</span>
      </div>
      <p className="mt-1 text-[0.65rem] leading-relaxed text-dim">{note}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-950 px-4 py-4">
      <p className="label text-dim">{label}</p>
      <p className="mt-2 font-mono text-sm tabular-nums text-mist">{value}</p>
    </div>
  );
}

