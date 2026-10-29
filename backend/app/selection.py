from __future__ import annotations

from datetime import date, datetime
from typing import Sequence

from .domain import (
    ActualRecord,
    DeliveryInterval,
    ForecastRecord,
    ForecastVersion,
    RawDataset,
)
from .timeutils import hour_bucket


def _version_rows(
    candidates: Sequence[ForecastRecord],
    *,
    cutoff: datetime,
    interval_start: datetime,
) -> list[ForecastVersion]:
    versions: list[ForecastVersion] = []
    for row in candidates:
        lead = (interval_start - row.publish_time).total_seconds() / 3600.0
        versions.append(
            ForecastVersion(
                publish_time=row.publish_time,
                generation_mw=row.generation_mw,
                lead_time_hours=round(lead, 4),
                available_at_cutoff=row.publish_time <= cutoff,
                selected=False,
            )
        )
    return versions


def select_forecast(
    candidates: Sequence[ForecastRecord],
    *,
    cutoff: datetime,
    interval_start: datetime,
) -> tuple[ForecastRecord | None, list[ForecastVersion], int, int]:
    """Select the latest forecast published at or before the decision cutoff.

    Ties on publishTime are resolved by the last row in the normalised API
    order. Exact (publishTime, startTime) duplicates have already been
    collapsed during normalisation, with conflicts reported in data quality.
    """
    ordered = sorted(candidates, key=lambda r: (r.publish_time, r.source_index))
    eligible = [row for row in ordered if row.publish_time <= cutoff]
    selected = eligible[-1] if eligible else None
    versions = _version_rows(ordered, cutoff=cutoff, interval_start=interval_start)
    if selected is not None:
        selected_publish = selected.publish_time
        versions = [
            ForecastVersion(
                publish_time=version.publish_time,
                generation_mw=version.generation_mw,
                lead_time_hours=version.lead_time_hours,
                available_at_cutoff=version.available_at_cutoff,
                selected=version.publish_time == selected_publish,
            )
            for version in versions
        ]
    return selected, versions, len(eligible), len(ordered) - len(eligible)


def build_interval(
    *,
    start_time: datetime,
    end_time: datetime,
    delivery_date: date,
    decision_date: date,
    settlement_period: int,
    cutoff: datetime,
    dataset: RawDataset,
) -> DeliveryInterval:
    bucket = hour_bucket(start_time)
    candidates = dataset.forecasts_by_hour.get(bucket, [])
    selected, versions, eligible_count, post_cutoff_count = select_forecast(
        candidates,
        cutoff=cutoff,
        interval_start=start_time,
    )
    actual: ActualRecord | None = dataset.actuals_by_start.get(start_time)

    forecast_mw = selected.generation_mw if selected is not None else None
    actual_mw = actual.generation_mw if actual is not None else None
    error = forecast_mw - actual_mw if forecast_mw is not None and actual_mw is not None else None
    absolute_error = abs(error) if error is not None else None
    percentage = (
        (error / actual_mw) * 100.0
        if error is not None and actual_mw is not None and actual_mw != 0
        else None
    )

    if forecast_mw is not None and actual_mw is not None:
        status = "matched"
    elif forecast_mw is None and actual_mw is not None:
        status = "missing_forecast"
    elif forecast_mw is not None and actual_mw is None:
        status = "missing_actual"
    else:
        status = "missing_both"

    flags: list[str] = []
    if start_time.minute == 30:
        flags.append("hourly_forecast_held_across_half_hour")
    if post_cutoff_count and selected is not None:
        flags.append("post_cutoff_versions_excluded")
    if selected is not None and selected.publish_time == cutoff:
        flags.append("published_exactly_at_cutoff")

    return DeliveryInterval(
        start_time=start_time,
        end_time=end_time,
        delivery_date=delivery_date,
        decision_date=decision_date,
        settlement_period=settlement_period,
        cutoff_time=cutoff,
        forecast_start_time=bucket,
        forecast_generation_mw=_round(forecast_mw),
        forecast_publish_time=selected.publish_time if selected else None,
        forecast_lead_time_hours=(
            round((start_time - selected.publish_time).total_seconds() / 3600.0, 4)
            if selected
            else None
        ),
        forecast_versions_total=len(candidates),
        forecast_versions_eligible=eligible_count,
        forecast_versions_post_cutoff=post_cutoff_count,
        actual_generation_mw=_round(actual_mw),
        actual_publish_time=actual.publish_time if actual else None,
        error_mw=_round(error),
        absolute_error_mw=_round(absolute_error),
        percentage_error_pct=_round(percentage),
        status=status,
        flags=tuple(flags),
        versions=tuple(versions),
    )


def _round(value: float | None, digits: int = 3) -> float | None:
    return round(value, digits) if value is not None else None
