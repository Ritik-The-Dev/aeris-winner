from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


class WindowModel(BaseModel):
    decision_start: str
    decision_end: str
    delivery_start: str
    delivery_end: str
    timezone: str
    interpretation: str


class CutoffModel(BaseModel):
    time: str
    timezone: str
    rule: str
    rationale: str
    source: str
    cutoff_on: str
    configurable: bool
    tie_break: str


class ResolutionModel(BaseModel):
    actual_resolution_minutes: int
    forecast_resolution_minutes: int
    bridge: str
    forecast_start_semantics: str


class SourceRequestModel(BaseModel):
    label: str
    rows: int


class SourceModel(BaseModel):
    provider: str
    datasets: list[str]
    origin: str
    fetched_at: str
    served_at: str
    cache_age_seconds: float | None = None
    fallback_reason: str | None = None
    snapshot_generated_at: str | None = None
    snapshot_sha256: str | None = None
    requests: list[SourceRequestModel] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class MetricsModel(BaseModel):
    sample_size: int
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    mean_error_mw: float | None
    mape_pct: float | None
    mape_sample_size: int
    wape_pct: float | None
    mean_forecast_mw: float | None
    mean_actual_mw: float | None
    max_absolute_error_mw: float | None
    p90_absolute_error_mw: float | None
    matched_intervals: int
    expected_intervals: int
    missing_forecast: int
    missing_actual: int
    missing_both: int
    coverage_pct: float | None
    sign_convention: str


class DailyModel(BaseModel):
    delivery_date: str
    decision_date: str
    expected_intervals: int
    matched_intervals: int
    coverage_pct: float | None
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    max_absolute_error_mw: float | None


class DiurnalModel(BaseModel):
    hour: int
    label: str
    expected_intervals: int
    matched_intervals: int
    mae_mw: float | None
    bias_mw: float | None


class HistogramBinModel(BaseModel):
    from_mw: float | None
    to_mw: float | None
    count: int


class HistogramModel(BaseModel):
    bins: list[HistogramBinModel]
    min_mw: float | None
    max_mw: float | None
    bin_width_mw: float | None
    sample_size: int


class TopErrorModel(BaseModel):
    start_time: str
    delivery_date: str
    decision_date: str
    settlement_period: int
    forecast_mw: float | None
    actual_mw: float | None
    error_mw: float | None
    absolute_error_mw: float | None
    percentage_error_pct: float | None
    forecast_publish_time: str | None


class LeadTimeBucketModel(BaseModel):
    label: str
    from_hours: float | None
    to_hours: float | None
    count: int


class LeadTimeModel(BaseModel):
    sample_size: int
    median_hours: float | None
    min_hours: float | None
    max_hours: float | None
    buckets: list[LeadTimeBucketModel]


class SeriesPointModel(BaseModel):
    start_time: str
    delivery_date: str
    decision_date: str
    settlement_period: int
    forecast_mw: float | None
    actual_mw: float | None
    error_mw: float | None
    status: Literal["matched", "missing_forecast", "missing_actual", "missing_both"]
    forecast_publish_time: str | None
    cutoff_time: str
    lead_time_hours: float | None


class VersionModel(BaseModel):
    publish_time: str
    generation_mw: float
    lead_time_hours: float
    available_at_cutoff: bool
    selected: bool


class IntervalModel(BaseModel):
    start_time: str
    end_time: str
    delivery_date: str
    decision_date: str
    settlement_period: int
    cutoff_time: str
    forecast_start_time: str
    forecast_generation_mw: float | None
    forecast_publish_time: str | None
    forecast_lead_time_hours: float | None
    forecast_versions_total: int
    forecast_versions_eligible: int
    forecast_versions_post_cutoff: int
    actual_generation_mw: float | None
    actual_publish_time: str | None
    error_mw: float | None
    absolute_error_mw: float | None
    percentage_error_pct: float | None
    status: Literal["matched", "missing_forecast", "missing_actual", "missing_both"]
    flags: list[str] = Field(default_factory=list)


class DataQualityModel(BaseModel):
    actual_rows_available: int
    actual_rows_in_scope: int
    expected_intervals: int
    actual_missing_intervals: int
    forecast_rows_available: int
    forecast_publication_runs: int
    intervals_with_forecast_records: int
    intervals_with_eligible_forecast: int
    intervals_with_post_cutoff_only: int
    intervals_without_forecast_records: int
    forecast_versions_considered: int
    eligible_forecast_versions: int
    post_cutoff_versions_ignored: int
    duplicate_rows_collapsed: int
    conflicting_duplicates: int
    invalid_rows: int
    normalization: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)


class OverviewResponse(BaseModel):
    product: str
    version: str
    generated_at: str
    window: WindowModel
    cutoff: CutoffModel
    resolution: ResolutionModel
    metrics: MetricsModel
    series: list[SeriesPointModel]
    daily: list[DailyModel]
    diurnal: list[DiurnalModel]
    histogram: HistogramModel
    top_errors: list[TopErrorModel]
    lead_time: LeadTimeModel
    data_quality: DataQualityModel
    source: SourceModel
    warnings: list[str] = Field(default_factory=list)


class AccuracyResponse(BaseModel):
    product: str
    version: str
    generated_at: str
    window: WindowModel
    cutoff: CutoffModel
    resolution: ResolutionModel
    metrics: MetricsModel
    daily: list[DailyModel]
    diurnal: list[DiurnalModel]
    histogram: HistogramModel
    top_errors: list[TopErrorModel]
    lead_time: LeadTimeModel
    data_quality: DataQualityModel
    source: SourceModel
    warnings: list[str] = Field(default_factory=list)


class ForecastsResponse(BaseModel):
    product: str
    version: str
    generated_at: str
    window: WindowModel
    cutoff: CutoffModel
    resolution: ResolutionModel
    series: list[SeriesPointModel]
    publication_runs: list[dict[str, Any]]
    source: SourceModel
    warnings: list[str] = Field(default_factory=list)


class IntervalsResponse(BaseModel):
    rows: list[IntervalModel]
    total: int
    page: int
    page_size: int
    total_pages: int
    window: WindowModel
    source: SourceModel


class IntervalDetailResponse(IntervalModel):
    versions: list[VersionModel]
    window: WindowModel
    cutoff: CutoffModel
    resolution: ResolutionModel
    source: SourceModel


class MetaResponse(BaseModel):
    product: str
    version: str
    environment: str
    default_decision_start: str
    default_decision_end: str
    allowed_decision_start: str
    allowed_decision_end: str
    default_cutoff_time: str
    market_timezone: str
    data_mode: str
    endpoints: dict[str, str]
    sources: list[dict[str, str]]
    interpretation: str
    notes: list[str]


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    data_mode: str
    snapshot_available: bool
    static_app_available: bool


class ErrorResponse(BaseModel):
    detail: str
    code: str = "error"
