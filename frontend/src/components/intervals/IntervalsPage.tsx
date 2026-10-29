import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  SearchX,
} from 'lucide-react';
import type {
  IntervalsResponse,
  IntervalStatus,
  SortField,
  StatusFilter,
} from '../../api/types';
import { api, ApiError } from '../../api/client';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import {
  formatDateTime,
  formatDateWithWeekday,
  formatHours,
  formatMW,
  formatNumber,
  formatSignedMW,
  formatTime,
  statusLabel,
} from '../../lib/format';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';
import { SourceBadge } from '../ui/SourceBadge';

const PAGE_SIZE = 25;

const STATUS_TABS: Array<{ value: StatusFilter; label: string; key: keyof Counts }> = [
  { value: 'all', label: 'All', key: 'all' },
  { value: 'matched', label: 'Matched', key: 'matched' },
  { value: 'missing_forecast', label: 'No forecast', key: 'missingForecast' },
  { value: 'missing_actual', label: 'No actual', key: 'missingActual' },
  { value: 'missing_both', label: 'Missing both', key: 'missingBoth' },
];

interface Counts {
  all: number;
  matched: number;
  missingForecast: number;
  missingActual: number;
  missingBoth: number;
}

export function IntervalsPage() {
  const { data, filters, openInspector, selectedInterval } = useAnalysis();
  const reveal = useReveal('intervals');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('start_time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [payload, setPayload] = useState<IntervalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setPage(1);
    setDeliveryDate('');
  }, [filters.start_date, filters.end_date, filters.cutoff_time]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .intervals(
        filters,
        {
          page,
          pageSize: PAGE_SIZE,
          status,
          deliveryDate: deliveryDate || undefined,
          sortBy,
          sortDir,
        },
        controller.signal,
      )
      .then((next) => {
        setPayload(next);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(
          reason instanceof ApiError ? reason.message : 'The interval ledger could not be loaded.',
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, status, deliveryDate, sortBy, sortDir, reload]);

  const counts = useMemo<Counts>(() => {
    const metrics = data?.metrics;
    return {
      all: metrics?.expected_intervals ?? 0,
      matched: metrics?.matched_intervals ?? 0,
      missingForecast: metrics?.missing_forecast ?? 0,
      missingActual: metrics?.missing_actual ?? 0,
      missingBoth: metrics?.missing_both ?? 0,
    };
  }, [data]);

  const setSort = (field: SortField) => {
    if (field === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'start_time' || field === 'delivery_date' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const exportHref = `/api/export.csv?start_date=${filters.start_date}&end_date=${filters.end_date}&cutoff_time=${encodeURIComponent(filters.cutoff_time)}`;
  const from = payload && payload.total ? (payload.page - 1) * payload.page_size + 1 : 0;
  const to = payload ? Math.min(payload.page * payload.page_size, payload.total) : 0;

  return (
    <div ref={reveal} className="mx-auto max-w-[1560px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header data-reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Intervals / 04</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.8rem,6vw,5.3rem)] leading-[0.9] tracking-[-0.03em] text-paper">
            The interval <span className="italic text-teal-200/85">ledger</span>.
          </h1>
          <p className="mt-5 max-w-[64ch] text-sm leading-relaxed text-mist">
            Every expected half-hour, the forecast selected at the cutoff, the outturn
            used, and the difference between them. Open any row to see the full WINDFOR
            vintage trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
          {data && <SourceBadge source={data.source} />}
          <a className="btn-ghost" href={exportHref} download>
            <Download size={13} aria-hidden="true" />
            Export current window
          </a>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-4 border-y border-paper/10 py-4" data-reveal>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by interval status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`status-filter ${status === tab.value ? 'status-filter-active' : ''}`}
              aria-pressed={status === tab.value}
            >
              {tab.label}
              <span className="ml-2 font-mono text-[0.56rem] text-dim">{formatNumber(counts[tab.key])}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label text-dim" htmlFor="ledger-day">
              Delivery day
            </label>
            <select
              id="ledger-day"
              className="field mt-1.5 min-w-[11rem]"
              value={deliveryDate}
              onChange={(event) => {
                setDeliveryDate(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All delivery days</option>
              {data?.daily.map((day) => (
                <option key={day.delivery_date} value={day.delivery_date}>
                  {formatDateWithWeekday(`${day.delivery_date}T12:00:00Z`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-dim" htmlFor="ledger-sort">
              Sort
            </label>
            <select
              id="ledger-sort"
              className="field mt-1.5 min-w-[10.5rem]"
              value={`${sortBy}:${sortDir}`}
              onChange={(event) => {
                const [field, direction] = event.target.value.split(':') as [
                  SortField,
                  'asc' | 'desc',
                ];
                setSortBy(field);
                setSortDir(direction);
                setPage(1);
              }}
            >
              <option value="start_time:asc">Time · earliest</option>
              <option value="start_time:desc">Time · latest</option>
              <option value="abs_error:desc">Absolute error · largest</option>
              <option value="abs_error:asc">Absolute error · smallest</option>
              <option value="error:desc">Signed error · highest</option>
              <option value="error:asc">Signed error · lowest</option>
              <option value="forecast:desc">Forecast · highest</option>
              <option value="actual:desc">Actual · highest</option>
            </select>
          </div>
          <p className="ml-auto max-w-[34ch] pb-2 text-[0.68rem] leading-relaxed text-dim">
            Filters apply to the selected decision window only. The CSV always includes the
            whole window, not just the visible page.
          </p>
        </div>
      </div>

      <div className="mt-5" data-reveal>
        {error && <ErrorState message={error} onRetry={() => setReload((value) => value + 1)} />}

        {!error && (!payload || (loading && !payload.rows.length)) && (
          <LoadingState label="Reading the interval ledger" />
        )}

        {!error && payload && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">
                {payload.total
                  ? `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(payload.total)} rows`
                  : 'No rows'}
                {loading && <span className="ml-2 text-teal-300">updating</span>}
              </p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">
                Page {payload.page} / {payload.total_pages}
              </p>
            </div>

            <div className={`overflow-x-auto border border-paper/10 ${loading ? 'opacity-55' : ''}`} aria-busy={loading}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <SortableHeader label="Delivery" field="start_time" current={sortBy} direction={sortDir} onSort={setSort} />
                    <th scope="col" className="hidden md:table-cell">Day</th>
                    <th scope="col" className="hidden lg:table-cell">SP</th>
                    <SortableHeader label="Forecast" field="forecast" current={sortBy} direction={sortDir} onSort={setSort} align="right" />
                    <SortableHeader label="Actual" field="actual" current={sortBy} direction={sortDir} onSort={setSort} align="right" />
                    <SortableHeader label="Error" field="error" current={sortBy} direction={sortDir} onSort={setSort} align="right" />
                    <SortableHeader label="Abs." field="abs_error" current={sortBy} direction={sortDir} onSort={setSort} align="right" className="hidden sm:table-cell" />
                    <th scope="col" className="hidden xl:table-cell text-right">Lead</th>
                    <th scope="col" className="hidden 2xl:table-cell">Publish</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="w-8"><span className="sr-only">Inspect</span></th>
                  </tr>
                </thead>
                <tbody>
                  {payload.rows.map((row) => {
                    const selected = row.start_time === selectedInterval;
                    return (
                      <tr
                        key={row.start_time}
                        className={`ledger-row ${selected ? 'ledger-row-selected' : ''}`}
                        onClick={() => openInspector(row.start_time)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openInspector(row.start_time);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Inspect interval ${formatTime(row.start_time)} on ${row.delivery_date}`}
                      >
                        <td className="whitespace-nowrap">
                          <span className="font-mono text-[0.72rem] text-paper">{formatTime(row.start_time)}</span>
                          <span className="ml-2 hidden font-mono text-[0.58rem] text-dim sm:inline">
                            {formatTime(row.end_time)}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap font-mono text-[0.64rem] text-mist md:table-cell">
                          {row.delivery_date}
                        </td>
                        <td className="hidden font-mono text-[0.64rem] text-dim lg:table-cell">{row.settlement_period}</td>
                        <td className="text-right font-mono text-[0.7rem] tabular-nums text-teal-200">
                          {formatMW(row.forecast_generation_mw)}
                        </td>
                        <td className="text-right font-mono text-[0.7rem] tabular-nums text-paper">
                          {formatMW(row.actual_generation_mw)}
                        </td>
                        <td
                          className={`text-right font-mono text-[0.7rem] tabular-nums ${
                            row.error_mw === null ? 'text-dim' : row.error_mw >= 0 ? 'text-amber-300' : 'text-teal-300'
                          }`}
                        >
                          {formatSignedMW(row.error_mw)}
                        </td>
                        <td className="hidden text-right font-mono text-[0.68rem] tabular-nums text-mist sm:table-cell">
                          {formatMW(row.absolute_error_mw)}
                        </td>
                        <td className="hidden text-right font-mono text-[0.64rem] text-mist xl:table-cell">
                          {formatHours(row.forecast_lead_time_hours)}
                        </td>
                        <td className="hidden whitespace-nowrap font-mono text-[0.6rem] text-dim 2xl:table-cell">
                          {formatDateTime(row.forecast_publish_time)}
                        </td>
                        <td>
                          <StatusPill status={row.status} />
                        </td>
                        <td className="text-dim">
                          <ChevronRight size={13} aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!payload.rows.length && (
              <div className="mt-4">
                <EmptyState>
                  No intervals match this status and delivery day. Reset the status filter or
                  choose another day.
                </EmptyState>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={payload.page <= 1}
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setPage((value) => Math.min(payload.total_pages, value + 1))}
                  disabled={payload.page >= payload.total_pages}
                >
                  Next
                  <ChevronRight size={13} aria-hidden="true" />
                </button>
              </div>
              <p className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-dim">
                <SearchX size={12} aria-hidden="true" />
                Missing values are never zero-filled
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-3 border-t border-paper/10 pt-5 text-[0.7rem] leading-relaxed text-dim sm:flex-row sm:items-center sm:justify-between" data-reveal>
        <p className="max-w-[70ch]">
          Forecast is the latest eligible WINDFOR publication per target hour. Actual is the
          latest FUELHH wind row per half-hour. A row can exist with a missing side; that is a
          data finding, not a zero.
        </p>
        <Link to="/method" className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-teal-200 hover:text-teal-100">
          Method & assumptions
        </Link>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  direction,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  field: SortField;
  current: SortField;
  direction: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = current === field;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th scope="col" className={`${align === 'right' ? 'text-right' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors ${
          active ? 'text-teal-200' : 'text-dim hover:text-mist'
        }`}
      >
        {label}
        <Icon size={10} aria-hidden="true" />
      </button>
    </th>
  );
}

function StatusPill({ status }: { status: IntervalStatus }) {
  const tone =
    status === 'matched'
      ? 'status-matched'
      : status === 'missing_forecast'
        ? 'status-warning'
        : status === 'missing_actual'
          ? 'status-missing'
          : 'status-neutral';
  return <span className={`status-pill ${tone}`}>{statusLabel(status)}</span>;
}
