export type IntervalStatus =
  | 'matched'
  | 'missing_forecast'
  | 'missing_actual'
  | 'missing_both';

export interface WindowInfo {
  decision_start: string;
  decision_end: string;
  delivery_start: string;
  delivery_end: string;
  timezone: string;
  interpretation: string;
}

export interface CutoffInfo {
  time: string;
  timezone: string;
  rule: string;
  rationale: string;
  source: string;
  cutoff_on: string;
  configurable: boolean;
  tie_break: string;
}

export interface ResolutionInfo {
  actual_resolution_minutes: number;
  forecast_resolution_minutes: number;
  bridge: string;
  forecast_start_semantics: string;
}

export interface SourceRequest {
  label: string;
  rows: number;
}

export interface SourceInfo {
  provider: string;
  datasets: string[];
  origin: 'elexon_live' | 'elexon_cache' | 'verified_snapshot' | string;
  fetched_at: string;
  served_at: string;
  cache_age_seconds: number | null;
  fallback_reason: string | null;
  snapshot_generated_at: string | null;
  snapshot_sha256: string | null;
  requests: SourceRequest[];
  notes: string[];
}

export interface Metrics {
  sample_size: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  mean_error_mw: number | null;
  mape_pct: number | null;
  mape_sample_size: number;
  wape_pct: number | null;
  mean_forecast_mw: number | null;
  mean_actual_mw: number | null;
  max_absolute_error_mw: number | null;
  p90_absolute_error_mw: number | null;
  matched_intervals: number;
  expected_intervals: number;
  missing_forecast: number;
  missing_actual: number;
  missing_both: number;
  coverage_pct: number | null;
  sign_convention: string;
}

export interface DailyPoint {
  delivery_date: string;
  decision_date: string;
  expected_intervals: number;
  matched_intervals: number;
  coverage_pct: number | null;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  max_absolute_error_mw: number | null;
}

export interface DiurnalPoint {
  hour: number;
  label: string;
  expected_intervals: number;
  matched_intervals: number;
  mae_mw: number | null;
  bias_mw: number | null;
}

export interface HistogramBin {
  from_mw: number | null;
  to_mw: number | null;
  count: number;
}

export interface Histogram {
  bins: HistogramBin[];
  min_mw: number | null;
  max_mw: number | null;
  bin_width_mw: number | null;
  sample_size: number;
}

export interface TopError {
  start_time: string;
  delivery_date: string;
  decision_date: string;
  settlement_period: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  absolute_error_mw: number | null;
  percentage_error_pct: number | null;
  forecast_publish_time: string | null;
}

export interface LeadTimeBucket {
  label: string;
  from_hours: number | null;
  to_hours: number | null;
  count: number;
}

export interface LeadTime {
  sample_size: number;
  median_hours: number | null;
  min_hours: number | null;
  max_hours: number | null;
  buckets: LeadTimeBucket[];
}

export interface SeriesPoint {
  start_time: string;
  delivery_date: string;
  decision_date: string;
  settlement_period: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  status: IntervalStatus;
  forecast_publish_time: string | null;
  cutoff_time: string;
  lead_time_hours: number | null;
}

export interface NormalizationInfo {
  actual_rows_in: number;
  actual_rows_used: number;
  actual_duplicates_removed: number;
  actual_conflicting_duplicates: number;
  forecast_rows_in: number;
  forecast_rows_used: number;
  forecast_duplicates_removed: number;
  forecast_conflicting_duplicates: number;
  invalid_actual_rows: number;
  invalid_forecast_rows: number;
  invalid_examples: string[];
  actual_first: string | null;
  actual_last: string | null;
  forecast_publish_first: string | null;
  forecast_publish_last: string | null;
  forecast_publish_runs: number;
}

export interface DataQuality {
  actual_rows_available: number;
  actual_rows_in_scope: number;
  expected_intervals: number;
  actual_missing_intervals: number;
  forecast_rows_available: number;
  forecast_publication_runs: number;
  intervals_with_forecast_records: number;
  intervals_with_eligible_forecast: number;
  intervals_with_post_cutoff_only: number;
  intervals_without_forecast_records: number;
  forecast_versions_considered: number;
  eligible_forecast_versions: number;
  post_cutoff_versions_ignored: number;
  duplicate_rows_collapsed: number;
  conflicting_duplicates: number;
  invalid_rows: number;
  normalization: NormalizationInfo;
  warnings: string[];
}

export interface OverviewResponse {
  product: string;
  version: string;
  generated_at: string;
  window: WindowInfo;
  cutoff: CutoffInfo;
  resolution: ResolutionInfo;
  metrics: Metrics;
  series: SeriesPoint[];
  daily: DailyPoint[];
  diurnal: DiurnalPoint[];
  histogram: Histogram;
  top_errors: TopError[];
  lead_time: LeadTime;
  data_quality: DataQuality;
  source: SourceInfo;
  warnings: string[];
}

export interface AccuracyResponse {
  product: string;
  version: string;
  generated_at: string;
  window: WindowInfo;
  cutoff: CutoffInfo;
  resolution: ResolutionInfo;
  metrics: Metrics;
  daily: DailyPoint[];
  diurnal: DiurnalPoint[];
  histogram: Histogram;
  top_errors: TopError[];
  lead_time: LeadTime;
  data_quality: DataQuality;
  source: SourceInfo;
  warnings: string[];
}

export interface Interval {
  start_time: string;
  end_time: string;
  delivery_date: string;
  decision_date: string;
  settlement_period: number;
  cutoff_time: string;
  forecast_start_time: string;
  forecast_generation_mw: number | null;
  forecast_publish_time: string | null;
  forecast_lead_time_hours: number | null;
  forecast_versions_total: number;
  forecast_versions_eligible: number;
  forecast_versions_post_cutoff: number;
  actual_generation_mw: number | null;
  actual_publish_time: string | null;
  error_mw: number | null;
  absolute_error_mw: number | null;
  percentage_error_pct: number | null;
  status: IntervalStatus;
  flags: string[];
}

export interface ForecastVersion {
  publish_time: string;
  generation_mw: number;
  lead_time_hours: number;
  available_at_cutoff: boolean;
  selected: boolean;
}

export interface IntervalDetail extends Interval {
  versions: ForecastVersion[];
  window: WindowInfo;
  cutoff: CutoffInfo;
  resolution: ResolutionInfo;
  source: SourceInfo;
}

export interface IntervalsResponse {
  rows: Interval[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  window: WindowInfo;
  source: SourceInfo;
}

export interface ForecastsResponse {
  product: string;
  version: string;
  generated_at: string;
  window: WindowInfo;
  cutoff: CutoffInfo;
  resolution: ResolutionInfo;
  series: SeriesPoint[];
  publication_runs: Array<{ publish_time: string; selected_intervals: number }>;
  source: SourceInfo;
  warnings: string[];
}

export interface MetaResponse {
  product: string;
  version: string;
  environment: string;
  default_decision_start: string;
  default_decision_end: string;
  allowed_decision_start: string;
  allowed_decision_end: string;
  default_cutoff_time: string;
  market_timezone: string;
  data_mode: string;
  endpoints: Record<string, string>;
  sources: Array<{ dataset: string; fields: string; endpoint: string }>;
  interpretation: string;
  notes: string[];
}

export interface Filters {
  start_date: string;
  end_date: string;
  cutoff_time: string;
}

export type StatusFilter = 'all' | IntervalStatus;

export type SortField =
  | 'start_time'
  | 'forecast'
  | 'actual'
  | 'error'
  | 'abs_error'
  | 'delivery_date';
