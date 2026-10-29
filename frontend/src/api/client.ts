import type {
  AccuracyResponse,
  Filters,
  ForecastsResponse,
  IntervalDetail,
  IntervalsResponse,
  MetaResponse,
  OverviewResponse,
  SortField,
  StatusFilter,
} from './types';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE = RAW_BASE.replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 0, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'The AERIS API could not be reached. Check the network and try again.',
      0,
      'network_error',
    );
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status}).`;
    let code = 'http_error';
    try {
      const body = (await response.json()) as { detail?: string; code?: string };
      if (body.detail) detail = body.detail;
      if (body.code) code = body.code;
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new ApiError(detail, response.status, code);
  }
  return (await response.json()) as T;
}

function filterQuery(filters: Filters): Record<string, string> {
  return {
    start_date: filters.start_date,
    end_date: filters.end_date,
    cutoff_time: filters.cutoff_time,
  };
}

export const api = {
  overview(filters: Filters, signal?: AbortSignal, refresh = false): Promise<OverviewResponse> {
    return getJson(
      `/api/overview${buildQuery({ ...filterQuery(filters), refresh })}`,
      signal,
    );
  },

  accuracy(filters: Filters, signal?: AbortSignal): Promise<AccuracyResponse> {
    return getJson(`/api/accuracy${buildQuery(filterQuery(filters))}`, signal);
  },

  forecasts(filters: Filters, signal?: AbortSignal): Promise<ForecastsResponse> {
    return getJson(`/api/forecasts${buildQuery(filterQuery(filters))}`, signal);
  },

  meta(signal?: AbortSignal): Promise<MetaResponse> {
    return getJson('/api/meta', signal);
  },

  intervals(
    filters: Filters,
    options: {
      page?: number;
      pageSize?: number;
      status?: StatusFilter;
      deliveryDate?: string;
      sortBy?: SortField;
      sortDir?: 'asc' | 'desc';
    } = {},
    signal?: AbortSignal,
  ): Promise<IntervalsResponse> {
    return getJson(
      `/api/intervals${buildQuery({
        ...filterQuery(filters),
        page: options.page ?? 1,
        page_size: options.pageSize ?? 25,
        status: options.status ?? 'all',
        delivery_date: options.deliveryDate,
        sort_by: options.sortBy ?? 'start_time',
        sort_dir: options.sortDir ?? 'asc',
      })}`,
      signal,
    );
  },

  intervalDetail(filters: Filters, startTime: string, signal?: AbortSignal): Promise<IntervalDetail> {
    return getJson(
      `/api/intervals/detail${buildQuery({
        ...filterQuery(filters),
        start_time: startTime,
      })}`,
      signal,
    );
  },

  exportUrl(filters: Filters): string {
    return `${API_BASE}/api/export.csv${buildQuery(filterQuery(filters))}`;
  },
};
