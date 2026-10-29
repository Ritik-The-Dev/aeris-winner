from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Sequence

from .domain import (
    ActualRecord,
    DataValidationError,
    ForecastRecord,
    NormalizationReport,
    RawDataset,
    finite_number,
)
from .timeutils import hour_bucket, is_half_hour, parse_iso_timestamp


def _safe_example(exc: Exception, index: int) -> str:
    text = str(exc)
    if len(text) > 240:
        text = text[:237] + "..."
    return f"row {index}: {text}"


def normalize_actuals(
    rows: Sequence[dict[str, object]],
    *,
    max_invalid_examples: int = 5,
) -> tuple[list[ActualRecord], dict[str, int], list[str], list[str]]:
    parsed: list[ActualRecord] = []
    invalid = 0
    examples: list[str] = []
    fuel_types_seen: Counter[str] = Counter()

    for index, row in enumerate(rows):
        try:
            fuel_type = str(row.get("fuelType", "")).upper()
            fuel_types_seen[fuel_type or "UNKNOWN"] += 1
            if fuel_type != "WIND":
                invalid += 1
                if len(examples) < max_invalid_examples:
                    examples.append(f"row {index}: fuelType {fuel_type!r} is not WIND")
                continue
            start = parse_iso_timestamp(row.get("startTime"), field_name="startTime")
            publish = parse_iso_timestamp(row.get("publishTime"), field_name="publishTime")
            generation = finite_number(row.get("generation"))
            if generation is None:
                raise DataValidationError("generation is not a finite number")
            if not is_half_hour(start):
                raise DataValidationError(f"startTime {start.isoformat()} is not a half-hour boundary")
            period_raw = row.get("settlementPeriod")
            try:
                period = int(period_raw)  # type: ignore[arg-type]
            except (TypeError, ValueError) as exc:
                raise DataValidationError("settlementPeriod is not an integer") from exc
            if not 1 <= period <= 50:
                raise DataValidationError(f"settlementPeriod {period} is outside 1..50")
            settlement_date = row.get("settlementDate")
            if not isinstance(settlement_date, str) or not settlement_date:
                raise DataValidationError("settlementDate is missing")
            parsed.append(
                ActualRecord(
                    start_time=start,
                    publish_time=publish,
                    generation_mw=generation,
                    settlement_date=settlement_date,
                    settlement_period=period,
                    source_index=index,
                )
            )
        except (DataValidationError, ValueError, TypeError) as exc:
            invalid += 1
            if len(examples) < max_invalid_examples:
                examples.append(_safe_example(exc, index))

    # One final outturn per delivery interval: latest publishTime wins.
    by_start: dict[datetime, ActualRecord] = {}
    conflicts = 0
    for row in parsed:
        existing = by_start.get(row.start_time)
        if existing is None:
            by_start[row.start_time] = row
            continue
        if existing.generation_mw != row.generation_mw:
            conflicts += 1
        if (row.publish_time, row.source_index) >= (existing.publish_time, existing.source_index):
            by_start[row.start_time] = row

    deduped = [by_start[key] for key in sorted(by_start)]
    report = {
        "invalid": invalid,
        "duplicates": len(parsed) - len(deduped),
        "conflicts": conflicts,
        "fuel_types_seen": dict(fuel_types_seen),
    }
    warning_list: list[str] = []
    if invalid:
        warning_list.append(f"{invalid} FUELHH row(s) were rejected during validation")
    if conflicts:
        warning_list.append(
            f"{conflicts} conflicting FUELHH revision(s); the latest publishTime was retained"
        )
    return deduped, report, warning_list, examples


def normalize_forecasts(
    rows: Sequence[dict[str, object]],
    *,
    max_invalid_examples: int = 5,
) -> tuple[list[ForecastRecord], dict[str, int], list[str], list[str]]:
    parsed: list[ForecastRecord] = []
    invalid = 0
    examples: list[str] = []

    for index, row in enumerate(rows):
        try:
            start = parse_iso_timestamp(row.get("startTime"), field_name="startTime")
            publish = parse_iso_timestamp(row.get("publishTime"), field_name="publishTime")
            generation = finite_number(row.get("generation"))
            if generation is None:
                raise DataValidationError("generation is not a finite number")
            if start.minute != 0 or start.second != 0 or start.microsecond != 0:
                raise DataValidationError(
                    f"startTime {start.isoformat()} is not an hourly boundary"
                )
            parsed.append(
                ForecastRecord(
                    start_time=start,
                    publish_time=publish,
                    generation_mw=generation,
                    source_index=index,
                )
            )
        except (DataValidationError, ValueError, TypeError) as exc:
            invalid += 1
            if len(examples) < max_invalid_examples:
                examples.append(_safe_example(exc, index))

    # Deduplicate the natural key (publishTime, startTime). If upstream emits
    # a conflicting exact duplicate, keep the last row in API order and count
    # the conflict so it is visible in data-quality metadata.
    by_key: dict[tuple[datetime, datetime], ForecastRecord] = {}
    conflicts = 0
    for row in parsed:
        key = (row.publish_time, row.start_time)
        existing = by_key.get(key)
        if existing is not None and existing.generation_mw != row.generation_mw:
            conflicts += 1
        by_key[key] = row

    deduped = sorted(by_key.values(), key=lambda r: (r.publish_time, r.start_time, r.source_index))
    report = {
        "invalid": invalid,
        "duplicates": len(parsed) - len(deduped),
        "conflicts": conflicts,
    }
    warning_list: list[str] = []
    if invalid:
        warning_list.append(f"{invalid} WINDFOR row(s) were rejected during validation")
    if conflicts:
        warning_list.append(
            f"{conflicts} exact-key WINDFOR conflict(s); last API row was retained deterministically"
        )
    return deduped, report, warning_list, examples


def build_raw_dataset(
    actual_rows: Sequence[dict[str, object]],
    forecast_rows: Sequence[dict[str, object]],
    *,
    source: dict[str, object] | None = None,
) -> RawDataset:
    actuals, actual_meta, actual_warnings, actual_examples = normalize_actuals(actual_rows)
    forecasts, forecast_meta, forecast_warnings, forecast_examples = normalize_forecasts(
        forecast_rows
    )

    publish_runs = sorted({row.publish_time for row in forecasts})
    report = NormalizationReport(
        actual_rows_in=len(actual_rows),
        actual_rows_used=len(actuals),
        actual_duplicates_removed=int(actual_meta["duplicates"]),
        actual_conflicting_duplicates=int(actual_meta["conflicts"]),
        forecast_rows_in=len(forecast_rows),
        forecast_rows_used=len(forecasts),
        forecast_duplicates_removed=int(forecast_meta["duplicates"]),
        forecast_conflicting_duplicates=int(forecast_meta["conflicts"]),
        invalid_actual_rows=int(actual_meta["invalid"]),
        invalid_forecast_rows=int(forecast_meta["invalid"]),
        invalid_examples=tuple(actual_examples + forecast_examples),
        actual_first=actuals[0].start_time if actuals else None,
        actual_last=actuals[-1].start_time if actuals else None,
        forecast_publish_first=publish_runs[0] if publish_runs else None,
        forecast_publish_last=publish_runs[-1] if publish_runs else None,
        forecast_publish_runs=len(publish_runs),
    )
    dataset = RawDataset(
        actuals=actuals,
        forecasts=forecasts,
        report=report,
        source=source or {},
        warnings=actual_warnings + forecast_warnings,
    )
    dataset.index()
    return dataset


def forecasts_for_bucket(
    dataset: RawDataset,
    bucket: datetime,
) -> list[ForecastRecord]:
    return dataset.forecasts_by_hour.get(hour_bucket(bucket), [])
