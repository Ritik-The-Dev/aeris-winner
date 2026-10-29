import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Check, Download, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { formatDate } from '../../lib/format';

const MONTH_START = '2026-01-01';
const MONTH_END = '2026-01-31';

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidCutoff(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function FilterBar() {
  const { filters, setFilters, refresh, refreshing, data } = useAnalysis();
  const [draft, setDraft] = useState(filters);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(filters);
    setDirty(false);
  }, [filters]);

  const invalid =
    !isValidDate(draft.start_date) ||
    !isValidDate(draft.end_date) ||
    draft.start_date > draft.end_date ||
    draft.start_date < MONTH_START ||
    draft.end_date > MONTH_END ||
    !isValidCutoff(draft.cutoff_time);

  const apply = (next = draft) => {
    if (invalid) return;
    setFilters(next);
    setDirty(false);
  };

  const update = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const preset = useMemo(
    () => ({
      month: { start_date: MONTH_START, end_date: MONTH_END, cutoff_time: filters.cutoff_time },
      firstWeek: {
        start_date: '2026-01-01',
        end_date: '2026-01-07',
        cutoff_time: filters.cutoff_time,
      },
      lastWeek: {
        start_date: '2026-01-25',
        end_date: '2026-01-31',
        cutoff_time: filters.cutoff_time,
      },
    }),
    [filters.cutoff_time],
  );

  const isPreset = (value: { start_date: string; end_date: string }) =>
    filters.start_date === value.start_date && filters.end_date === value.end_date;

  const exportHref = data
    ? `/api/export.csv?start_date=${filters.start_date}&end_date=${filters.end_date}&cutoff_time=${encodeURIComponent(filters.cutoff_time)}`
    : undefined;

  return (
    <div className="relative z-30 px-3 pt-3 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-[1560px] rounded-[1.4rem] border border-paper/10 bg-ink-950/75 p-2.5 shadow-soft backdrop-blur-xl sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="col-span-2 sm:col-span-1">
            <p className="label flex items-center gap-2 text-dim">
              <CalendarRange size={11} aria-hidden="true" />
              Decision window
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="filter-start">
                Decision start date
              </label>
              <input
                id="filter-start"
                type="date"
                className="field w-[9.2rem]"
                min={MONTH_START}
                max={MONTH_END}
                value={draft.start_date}
                onChange={(event) => update('start_date', event.target.value)}
              />
              <span className="text-dim" aria-hidden="true">
                →
              </span>
              <label className="sr-only" htmlFor="filter-end">
                Decision end date
              </label>
              <input
                id="filter-end"
                type="date"
                className="field w-[9.2rem]"
                min={MONTH_START}
                max={MONTH_END}
                value={draft.end_date}
                onChange={(event) => update('end_date', event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2 text-dim" htmlFor="filter-cutoff">
              <SlidersHorizontal size={11} aria-hidden="true" />
              Cutoff · London
            </label>
            <input
              id="filter-cutoff"
              type="time"
              step={60}
              className="field mt-2 w-[7.4rem] font-mono"
              value={draft.cutoff_time}
              onChange={(event) => update('cutoff_time', event.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => apply()}
            disabled={invalid || (!dirty && !refreshing)}
          >
            <Check size={13} aria-hidden="true" />
            Apply
          </button>

          <div className="col-span-2 flex items-center gap-1 pb-0.5 sm:col-span-1">
            <button
              type="button"
              className={`chip ${isPreset(preset.month) ? 'chip-active' : ''}`}
              onClick={() => apply(preset.month)}
            >
              January
            </button>
            <button
              type="button"
              className={`chip ${isPreset(preset.firstWeek) ? 'chip-active' : ''}`}
              onClick={() => apply(preset.firstWeek)}
            >
              Week 1
            </button>
            <button
              type="button"
              className={`chip ${isPreset(preset.lastWeek) ? 'chip-active' : ''}`}
              onClick={() => apply(preset.lastWeek)}
            >
              Week 5
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-dim">
            {formatDate(`${filters.start_date}T12:00:00Z`)} –{' '}
            {formatDate(`${filters.end_date}T12:00:00Z`)} · cutoff{' '}
            <span className="text-mist">{filters.cutoff_time}</span>
          </p>
          <button
            type="button"
            className="btn-ghost"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh Elexon data"
          >
            <RefreshCw
              size={13}
              className={refreshing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {exportHref ? (
            <a className="btn-ghost" href={exportHref} download>
              <Download size={13} aria-hidden="true" />
              CSV
            </a>
          ) : (
            <span className="btn-ghost pointer-events-none opacity-50">
              <Download size={13} aria-hidden="true" />
              CSV
            </span>
          )}
        </div>
      </div>
        {invalid && (
          <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-amber-300">
            Enter a valid window inside 1–31 January 2026, with the cutoff as HH:MM.
          </p>
        )}
      </div>
    </div>
  );
}
