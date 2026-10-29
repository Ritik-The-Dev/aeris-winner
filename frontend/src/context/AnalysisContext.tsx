/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Filters, OverviewResponse } from '../api/types';

const DEFAULT_START = '2026-01-01';
const DEFAULT_END = '2026-01-31';
const DEFAULT_CUTOFF = '09:50';
const DEFAULT_DAY = '2026-01-15';

interface AnalysisContextValue {
  filters: Filters;
  setFilters: (next: Partial<Filters>) => void;
  data: OverviewResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  retry: () => void;
  refresh: () => void;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  selectedInterval: string | null;
  setSelectedInterval: (startTime: string | null) => void;
  openInspector: (startTime: string) => void;
  closeInspector: () => void;
  inspectTarget: string | null;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function readFilters(params: URLSearchParams): Filters {
  const start = params.get('from') ?? DEFAULT_START;
  const end = params.get('to') ?? DEFAULT_END;
  const cutoff = params.get('cutoff') ?? DEFAULT_CUTOFF;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const validCutoff = /^([01]\d|2[0-3]):[0-5]\d$/;
  return {
    start_date: validDate.test(start) ? start : DEFAULT_START,
    end_date: validDate.test(end) ? end : DEFAULT_END,
    cutoff_time: validCutoff.test(cutoff) ? cutoff : DEFAULT_CUTOFF,
  };
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const [inspectTarget, setInspectTarget] = useState<string | null>(null);
  const forceRefresh = useRef(false);

  const selectedDay = useMemo(() => {
    const requested = searchParams.get('day');
    if (!requested) return DEFAULT_DAY;
    return requested;
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const isForce = forceRefresh.current;
    forceRefresh.current = false;
    if (data) setRefreshing(true);
    else setLoading(true);
    setError(null);

    api
      .overview(filters, controller.signal, isForce)
      .then((payload) => {
        setData(payload);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        const message =
          reason instanceof ApiError
            ? reason.message
            : 'The analysis could not be loaded. Please retry.';
        setError(message);
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
    // data is intentionally not a dependency: it would refetch on every success.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, reloadToken]);

  const setFilters = useCallback(
    (next: Partial<Filters>) => {
      const merged = { ...filters, ...next };
      if (merged.start_date > merged.end_date) return;
      const params = new URLSearchParams(searchParams);
      params.set('from', merged.start_date);
      params.set('to', merged.end_date);
      params.set('cutoff', merged.cutoff_time);
      setSearchParams(params, { replace: true });
      setSelectedInterval(null);
      setInspectTarget(null);
    },
    [filters, searchParams, setSearchParams],
  );

  const setSelectedDay = useCallback(
    (day: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('day', day);
      setSearchParams(params, { replace: true });
      setSelectedInterval(null);
    },
    [searchParams, setSearchParams],
  );

  const refresh = useCallback(() => {
    forceRefresh.current = true;
    setReloadToken((value) => value + 1);
  }, []);

  const retry = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const openInspector = useCallback((startTime: string) => {
    setSelectedInterval(startTime);
    setInspectTarget(startTime);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectTarget(null);
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      filters,
      setFilters,
      data,
      loading,
      refreshing,
      error,
      retry,
      refresh,
      selectedDay,
      setSelectedDay,
      selectedInterval,
      setSelectedInterval,
      openInspector,
      closeInspector,
      inspectTarget,
    }),
    [
      filters,
      setFilters,
      data,
      loading,
      refreshing,
      error,
      retry,
      refresh,
      selectedDay,
      setSelectedDay,
      selectedInterval,
      openInspector,
      closeInspector,
      inspectTarget,
    ],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used inside AnalysisProvider');
  return context;
}

export const analysisDefaults = {
  start: DEFAULT_START,
  end: DEFAULT_END,
  cutoff: DEFAULT_CUTOFF,
  day: DEFAULT_DAY,
};
