import { useMemo, useState } from 'react';
import { Grid3X3, Layers, MousePointer2, Wind } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import {
  buildWindField,
  dayLabel,
  resolveDay,
  summariseDay,
} from '../../lib/analysis';
import { errorColour } from '../../lib/colors';
import {
  formatDateWithWeekday,
  formatMW,
  formatPct,
  formatSignedMW,
  formatTime,
} from '../../lib/format';
import { WindfieldStage } from '../windfield/WindfieldStage';
import { WindfieldFallback } from '../windfield/WindfieldFallback';
import { DaySelector } from '../ui/DaySelector';
import { ErrorState, LoadingState, SourceNote } from '../ui/States';

export function WindfieldPage() {
  const {
    data,
    loading,
    error,
    retry,
    selectedDay,
    setSelectedDay,
    openInspector,
  } = useAnalysis();
  const reveal = useReveal(data?.generated_at ?? 'windfield');
  const [mode, setMode] = useState<'scene' | 'grid'>('scene');

  const field = useMemo(
    () => (data ? buildWindField(data.series, data.daily) : null),
    [data],
  );

  if (!data || !field) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">Wind field / 02</p>
        <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.92] text-paper">
          The shape of the miss
        </h1>
        <div className="mt-8">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <LoadingState label={loading ? 'Building the wind field' : 'Preparing'} />
          )}
        </div>
      </div>
    );
  }

  const day = resolveDay(data.daily, selectedDay);
  const summary = summariseDay(data.series, day);

  return (
    <div ref={reveal} className="mx-auto max-w-[1560px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header data-reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Wind field / 02</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.8rem,6vw,5.3rem)] leading-[0.9] tracking-[-0.03em] text-paper">
            The shape of the <span className="italic text-teal-200/85">miss</span>.
          </h1>
          <p className="mt-5 max-w-[64ch] text-sm leading-relaxed text-mist">
            Each ridge is a delivery day; each point along it is a half-hour. The surface
            shows actual national wind, the amber wireframe shows what the selected
            forecast expected, and colour shows the signed error.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <DaySelector daily={data.daily} value={day} onChange={setSelectedDay} />
        </div>
      </header>

      <div className="mt-8 panel overflow-hidden" data-reveal>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wind size={13} className="text-teal-300" aria-hidden="true" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-mist">
              {dayLabel(day)}
            </span>
            <span className="hidden font-mono text-[0.56rem] uppercase tracking-[0.1em] text-dim sm:inline">
              {summary.matched}/{summary.expected} intervals
            </span>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Wind field view">
            <button
              type="button"
              className={`chip ${mode === 'scene' ? 'chip-active' : ''}`}
              onClick={() => setMode('scene')}
              aria-pressed={mode === 'scene'}
            >
              <Layers size={11} aria-hidden="true" />
              3D
            </button>
            <button
              type="button"
              className={`chip ${mode === 'grid' ? 'chip-active' : ''}`}
              onClick={() => setMode('grid')}
              aria-pressed={mode === 'grid'}
            >
              <Grid3X3 size={11} aria-hidden="true" />
              Grid
            </button>
          </div>
        </div>

        <div className="relative bg-[radial-gradient(ellipse_at_50%_40%,rgba(31,185,172,0.1),transparent_62%)]">
          {mode === 'scene' ? (
            <WindfieldStage
              field={field}
              selectedDay={day}
              onSelectDay={setSelectedDay}
              onSelectInterval={openInspector}
              className="h-[390px] sm:h-[470px] lg:h-[540px]"
            />
          ) : (
            <div className="p-4 sm:p-6">
              <WindfieldFallback
                field={field}
                selectedDay={day}
                onSelectDay={setSelectedDay}
                onSelectInterval={openInspector}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <MousePointer2 size={12} className="text-dim" aria-hidden="true" />
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">
              Drag to orbit · click a ridge to select the day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-dim">Under</span>
            <span className="h-1.5 w-24 bg-[linear-gradient(90deg,#3fd4c5,#10262e_52%,#e89b4b,#b9563f)]" aria-hidden="true" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-dim">Over</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="panel p-5" data-reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Selected day</p>
              <h2 className="mt-1.5 font-display text-[1.55rem] text-paper">
                Half-hour error strip
              </h2>
              <p className="mt-1.5 max-w-[50ch] text-xs leading-relaxed text-mist/85">
                Each cell is one delivery interval. Click a cell to open its full vintage
                trail. Teal below zero is underforecast; amber above zero is overforecast.
              </p>
            </div>
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
              {formatDateWithWeekday(`${day}T12:00:00Z`)}
            </span>
          </div>
          <div className="mt-5">
            <div
              className="grid gap-px bg-ink-950"
              style={{ gridTemplateColumns: `repeat(${Math.max(summary.points.length, 1)}, minmax(0, 1fr))` }}
              role="group"
              aria-label="Half-hour error strip"
            >
              {summary.points.map((point) => (
                <button
                  key={point.start_time}
                  type="button"
                  className="group relative h-12 outline-offset-1 focus-visible:outline focus-visible:outline-teal-300"
                  style={{ backgroundColor: errorColour(point.error_mw, field.maxAbsoluteError) }}
                  onClick={() => openInspector(point.start_time)}
                  title={`${formatTime(point.start_time)} · forecast ${formatMW(point.forecast_mw)} · actual ${formatMW(point.actual_mw)} · error ${formatSignedMW(point.error_mw)}`}
                  aria-label={`Inspect ${formatTime(point.start_time)}; error ${formatSignedMW(point.error_mw)}`}
                >
                  <span className="absolute inset-0 border border-transparent transition-colors group-hover:border-paper/60" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[0.52rem] uppercase tracking-[0.08em] text-dim">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:30</span>
            </div>
          </div>
        </div>

        <div className="panel p-5" data-reveal>
          <p className="eyebrow">Day readout</p>
          <h2 className="mt-1.5 font-display text-[1.55rem] leading-tight text-paper">
            {dayLabel(day)}
          </h2>
          <dl className="mt-4 space-y-3">
            <Readout label="MAE" value={formatMW(summary.mae)} tone="text-teal-300" />
            <Readout label="Bias" value={formatSignedMW(summary.bias)} tone="text-amber-300" />
            <Readout label="Largest miss" value={formatMW(summary.maxAbsError)} />
            <Readout label="Peak outturn" value={formatMW(summary.peakActual)} />
            <Readout label="Trough outturn" value={formatMW(summary.troughActual)} />
            <Readout label="Coverage" value={summary.coveragePct !== null ? formatPct(summary.coveragePct) : '—'} tone="text-teal-300" />
          </dl>
          <p className="mt-4 border-t border-paper/10 pt-3 text-[0.66rem] leading-relaxed text-dim">
            Surface height is scaled to the month maximum; it is a visual comparison, not a
            generation axis. Exact values are in the ledger.
          </p>
        </div>
      </div>

      <div className="mt-6" data-reveal>
        <SourceNote source={data.source} />
      </div>
    </div>
  );
}

function Readout({
  label,
  value,
  tone = 'text-paper',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-paper/10 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">{label}</dt>
      <dd className={`font-mono text-[0.76rem] tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
