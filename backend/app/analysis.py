from __future__ import annotations

import asyncio
import csv
import io
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from .config import Settings
from .domain import DeliveryInterval, RawDataset
from .elexon import ElexonClient
from .metrics import (
    compute_metrics,
    daily_summary,
    diurnal_summary,
    error_histogram,
    lead_time_summary,
    top_errors,
)
from .selection import build_interval, select_forecast
from .timeutils import (
    cutoff_for_decision_date,
    delivery_intervals_for_date,
    parse_clock,
    parse_iso_timestamp,
)


@dataclass(frozen=True, slots=True)
class AnalysisRequest:
    start_date: date
    end_date: date
    cutoff_time: str = "09:50"
    timezone_name: str = "Europe/London"


@dataclass(slots=True)
class AnalysisResult:
    request: AnalysisRequest
    intervals: list[DeliveryInterval]
    metrics: dict[str, object]
    daily: list[dict[str, object]]
    diurnal: list[dict[str, object]]
    histogram: dict[str, object]
    top_errors: list[dict[str, object]]
    lead_time: dict[str, object]
    data_quality: dict[str, object]
    window: dict[str, object]
    cutoff: dict[str, object]
    resolution: dict[str, object]
    source: dict[str, object]
    warnings: list[str]
    interval_index: dict[datetime, DeliveryInterval]


class AnalysisService:
    def __init__(self, settings: Settings, client: ElexonClient | None = None) -> None:
        self.settings = settings
        self.client = client or ElexonClient(settings)
        self._cache: dict[tuple[date, date, str], AnalysisResult] = {}
        self._lock = asyncio.Lock()

    def validate(self, request: AnalysisRequest) -> None:
        if request.start_date > request.end_date:
            raise ValueError("start_date must be on or before end_date")
        if request.start_date < self.settings.allowed_decision_start or request.end_date > self.settings.allowed_decision_end:
            raise ValueError(
                "The pilot covers purchase decisions made between "
                f"{self.settings.allowed_decision_start.isoformat()} and "
                f"{self.settings.allowed_decision_end.isoformat()}."
            )
        if (request.end_date - request.start_date).days > 62:
            raise ValueError("The decision window is limited to 63 days")
        try:
            clock = parse_clock(request.cutoff_time)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc
        if not (parse_clock(self.settings.allowed_cutoff_min) <= clock <= parse_clock(self.settings.allowed_cutoff_max)):
            raise ValueError("cutoff_time is outside the supported range")

    async def get_analysis(self, request: AnalysisRequest, *, refresh: bool = False) -> AnalysisResult:
        self.validate(request)
        key = (request.start_date, request.end_date, request.cutoff_time)
        if not refresh:
            cached = self._cache.get(key)
            if cached is not None:
                return cached
        async with self._lock:
            if not refresh:
                cached = self._cache.get(key)
                if cached is not None:
                    return cached
            dataset = await self.client.get_dataset(refresh=refresh)
            result = build_analysis(
                dataset,
                request,
                timezone_name=request.timezone_name,
                app_version=self.settings.app_version,
            )
            self._cache[key] = result
            return result

    def clear(self) -> None:
        self._cache.clear()


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def build_analysis(
    dataset: RawDataset,
    request: AnalysisRequest,
    *,
    timezone_name: str = "Europe/London",
    app_version: str = "1.0.0",
) -> AnalysisResult:
    intervals: list[DeliveryInterval] = []
    cursor = request.start_date
    while cursor <= request.end_date:
        delivery_date = cursor + timedelta(days=1)
        cutoff = cutoff_for_decision_date(cursor, request.cutoff_time, timezone_name)
        starts = delivery_intervals_for_date(delivery_date, timezone_name)
        for index, start in enumerate(starts):
            end = start + timedelta(minutes=30)
            intervals.append(
                build_interval(
                    start_time=start,
                    end_time=end,
                    delivery_date=delivery_date,
                    decision_date=cursor,
                    settlement_period=index + 1,
                    cutoff=cutoff,
                    dataset=dataset,
                )
            )
        cursor += timedelta(days=1)

    metrics = compute_metrics(intervals)
    daily = daily_summary(intervals)
    diurnal = diurnal_summary(intervals, timezone_name)
    histogram = error_histogram(intervals)
    largest = top_errors(intervals, limit=10)
    leads = lead_time_summary(intervals)

    expected = len(intervals)
    actual_in_scope = sum(1 for row in dataset.actuals if intervals and intervals[0].start_time <= row.start_time <= intervals[-1].start_time)
    post_cutoff_ignored = sum(row.forecast_versions_post_cutoff for row in intervals)
    eligible_versions = sum(row.forecast_versions_eligible for row in intervals)
    total_versions = sum(row.forecast_versions_total for row in intervals)
    intervals_with_forecast = sum(1 for row in intervals if row.forecast_versions_total > 0)
    intervals_without_forecast = sum(1 for row in intervals if row.forecast_versions_total == 0)
    intervals_post_cutoff_only = sum(
        1 for row in intervals if row.forecast_versions_total > 0 and row.forecast_versions_eligible == 0
    )
    warnings = list(dataset.warnings)
    if intervals_without_forecast:
        warnings.append(
            f"{intervals_without_forecast} interval(s) have no WINDFOR record for the target hour"
        )
    if intervals_post_cutoff_only:
        warnings.append(
            f"{intervals_post_cutoff_only} interval(s) have forecast versions, but none published by the cutoff"
        )
    duplicate_rows = dataset.report.actual_duplicates_removed + dataset.report.forecast_duplicates_removed
    conflicting = (
        dataset.report.actual_conflicting_duplicates
        + dataset.report.forecast_conflicting_duplicates
    )
    if duplicate_rows:
        warnings.append(f"{duplicate_rows} duplicate upstream row(s) were collapsed deterministically")
    if conflicting:
        warnings.append(f"{conflicting} conflicting duplicate(s) were detected and resolved deterministically")

    data_quality = {
        "actual_rows_available": len(dataset.actuals),
        "actual_rows_in_scope": actual_in_scope,
        "expected_intervals": expected,
        "actual_missing_intervals": sum(1 for row in intervals if row.actual_generation_mw is None),
        "forecast_rows_available": len(dataset.forecasts),
        "forecast_publication_runs": dataset.report.forecast_publish_runs,
        "intervals_with_forecast_records": intervals_with_forecast,
        "intervals_with_eligible_forecast": sum(1 for row in intervals if row.forecast_versions_eligible > 0),
        "intervals_with_post_cutoff_only": intervals_post_cutoff_only,
        "intervals_without_forecast_records": intervals_without_forecast,
        "forecast_versions_considered": total_versions,
        "eligible_forecast_versions": eligible_versions,
        "post_cutoff_versions_ignored": post_cutoff_ignored,
        "duplicate_rows_collapsed": duplicate_rows,
        "conflicting_duplicates": conflicting,
        "invalid_rows": dataset.report.invalid_actual_rows + dataset.report.invalid_forecast_rows,
        "normalization": dataset.report.as_dict(),
        "warnings": warnings,
    }

    window = {
        "decision_start": request.start_date.isoformat(),
        "decision_end": request.end_date.isoformat(),
        "delivery_start": (request.start_date + timedelta(days=1)).isoformat(),
        "delivery_end": (request.end_date + timedelta(days=1)).isoformat(),
        "timezone": timezone_name,
        "interpretation": (
            "January 2026 is interpreted as the period in which day-ahead "
            "purchase decisions were made. Each decision date maps to the "
            "following delivery day."
        ),
    }
    cutoff = {
        "time": request.cutoff_time,
        "timezone": timezone_name,
        "rule": (
            "For every target delivery interval, keep WINDFOR rows with the "
            "same target hour and publishTime <= the cutoff, then select the "
            "greatest publishTime."
        ),
        "rationale": (
            "09:50 Europe/London is the published N2EX day-ahead auction gate "
            "closure (Nord Pool). It is a market-informed assumption for this "
            "pilot, not a rule supplied by the client, and is configurable."
        ),
        "source": (
            "https://support.nordpoolgroup.com/support/solutions/articles/"
            "8000088463-about-the-n2ex-day-ahead-auction"
        ),
        "cutoff_on": "decision_date",
        "configurable": True,
        "tie_break": (
            "Latest publishTime wins; exact (publishTime, startTime) duplicates "
            "are collapsed to the last row in API order and conflicts are counted."
        ),
    }
    resolution = {
        "actual_resolution_minutes": 30,
        "forecast_resolution_minutes": 60,
        "bridge": (
            "WINDFOR is natively hourly. Each hourly value is applied to both "
            "half-hour delivery intervals inside that hour. No interpolation "
            "or synthetic value is introduced."
        ),
        "forecast_start_semantics": (
            "WINDFOR startTime identifies the target hour; it is held constant "
            "for the two half-hour intervals in that hour."
        ),
    }
    interval_index = {row.start_time: row for row in intervals}
    return AnalysisResult(
        request=request,
        intervals=intervals,
        metrics=metrics,
        daily=daily,
        diurnal=diurnal,
        histogram=histogram,
        top_errors=largest,
        lead_time=leads,
        data_quality=data_quality,
        window=window,
        cutoff=cutoff,
        resolution=resolution,
        source=dataset.source,
        warnings=warnings,
        interval_index=interval_index,
    )


def interval_to_dict(row: DeliveryInterval, *, include_versions: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "start_time": _iso(row.start_time),
        "end_time": _iso(row.end_time),
        "delivery_date": row.delivery_date.isoformat(),
        "decision_date": row.decision_date.isoformat(),
        "settlement_period": row.settlement_period,
        "cutoff_time": _iso(row.cutoff_time),
        "forecast_start_time": _iso(row.forecast_start_time),
        "forecast_generation_mw": row.forecast_generation_mw,
        "forecast_publish_time": _iso(row.forecast_publish_time),
        "forecast_lead_time_hours": row.forecast_lead_time_hours,
        "forecast_versions_total": row.forecast_versions_total,
        "forecast_versions_eligible": row.forecast_versions_eligible,
        "forecast_versions_post_cutoff": row.forecast_versions_post_cutoff,
        "actual_generation_mw": row.actual_generation_mw,
        "actual_publish_time": _iso(row.actual_publish_time),
        "error_mw": row.error_mw,
        "absolute_error_mw": row.absolute_error_mw,
        "percentage_error_pct": row.percentage_error_pct,
        "status": row.status,
        "flags": list(row.flags),
    }
    if include_versions:
        payload["versions"] = [
            {
                "publish_time": version.publish_time.isoformat(),
                "generation_mw": round(version.generation_mw, 3),
                "lead_time_hours": version.lead_time_hours,
                "available_at_cutoff": version.available_at_cutoff,
                "selected": version.selected,
            }
            for version in row.versions
        ]
    return payload


def series_point(row: DeliveryInterval) -> dict[str, Any]:
    return {
        "start_time": _iso(row.start_time),
        "delivery_date": row.delivery_date.isoformat(),
        "decision_date": row.decision_date.isoformat(),
        "settlement_period": row.settlement_period,
        "forecast_mw": row.forecast_generation_mw,
        "actual_mw": row.actual_generation_mw,
        "error_mw": row.error_mw,
        "status": row.status,
        "forecast_publish_time": _iso(row.forecast_publish_time),
        "cutoff_time": _iso(row.cutoff_time),
        "lead_time_hours": row.forecast_lead_time_hours,
    }


def interval_detail(result: AnalysisResult, start_time: datetime) -> dict[str, Any] | None:
    row = result.interval_index.get(start_time)
    if row is None:
        return None
    detail = interval_to_dict(row, include_versions=True)
    detail["window"] = result.window
    detail["cutoff"] = result.cutoff
    detail["resolution"] = result.resolution
    detail["source"] = result.source
    return detail


def intervals_page(
    result: AnalysisResult,
    *,
    page: int = 1,
    page_size: int = 25,
    status: str | None = None,
    delivery_date: date | None = None,
    sort_by: str = "start_time",
    sort_dir: str = "asc",
) -> dict[str, Any]:
    rows = result.intervals
    if status and status != "all":
        rows = [row for row in rows if row.status == status]
    if delivery_date is not None:
        rows = [row for row in rows if row.delivery_date == delivery_date]
    key_functions = {
        "start_time": lambda r: r.start_time,
        "forecast": lambda r: (r.forecast_generation_mw is None, r.forecast_generation_mw or 0.0),
        "actual": lambda r: (r.actual_generation_mw is None, r.actual_generation_mw or 0.0),
        "error": lambda r: (r.error_mw is None, r.error_mw or 0.0),
        "abs_error": lambda r: (r.absolute_error_mw is None, r.absolute_error_mw or 0.0),
        "delivery_date": lambda r: (r.delivery_date, r.start_time),
    }
    key_function = key_functions.get(sort_by, key_functions["start_time"])
    rows = sorted(rows, key=key_function, reverse=(sort_dir == "desc"))
    total = len(rows)
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(max(page, 1), total_pages)
    start = (page - 1) * page_size
    selected = rows[start : start + page_size]
    return {
        "rows": [interval_to_dict(row) for row in selected],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "window": result.window,
        "source": result.source,
    }


def intervals_csv(result: AnalysisResult) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(
        [
            "delivery_date",
            "delivery_interval_start_utc",
            "delivery_interval_start_london",
            "settlement_period",
            "decision_date",
            "decision_cutoff_utc",
            "forecast_mw",
            "forecast_publish_time_utc",
            "forecast_lead_time_hours",
            "actual_mw",
            "error_mw_forecast_minus_actual",
            "absolute_error_mw",
            "percentage_error_pct",
            "status",
        ]
    )
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(result.window["timezone"])
    for row in result.intervals:
        writer.writerow(
            [
                row.delivery_date.isoformat(),
                _iso(row.start_time),
                row.start_time.astimezone(tz).strftime("%Y-%m-%d %H:%M"),
                row.settlement_period,
                row.decision_date.isoformat(),
                _iso(row.cutoff_time),
                row.forecast_generation_mw if row.forecast_generation_mw is not None else "",
                _iso(row.forecast_publish_time) if row.forecast_publish_time else "",
                row.forecast_lead_time_hours if row.forecast_lead_time_hours is not None else "",
                row.actual_generation_mw if row.actual_generation_mw is not None else "",
                row.error_mw if row.error_mw is not None else "",
                row.absolute_error_mw if row.absolute_error_mw is not None else "",
                row.percentage_error_pct if row.percentage_error_pct is not None else "",
                row.status,
            ]
        )
    return buffer.getvalue()
