from __future__ import annotations

import math
import statistics
from collections import defaultdict
from datetime import date
from typing import Iterable, Sequence

from .domain import DeliveryInterval
from .timeutils import local_datetime


def _mean(values: Sequence[float]) -> float | None:
    return statistics.fmean(values) if values else None


def _round(value: float | None, digits: int = 3) -> float | None:
    return round(value, digits) if value is not None else None


def _metric_bundle(intervals: Sequence[DeliveryInterval]) -> dict[str, object]:
    matched = [row for row in intervals if row.is_matched]
    errors = [row.error_mw for row in matched if row.error_mw is not None]
    absolute = [abs(error) for error in errors]
    actuals = [
        row.actual_generation_mw
        for row in matched
        if row.actual_generation_mw is not None
    ]
    forecasts = [
        row.forecast_generation_mw
        for row in matched
        if row.forecast_generation_mw is not None
    ]
    nonzero_actual_errors = [
        (row.error_mw, row.actual_generation_mw)
        for row in matched
        if row.error_mw is not None and row.actual_generation_mw not in (None, 0)
    ]

    mae = _mean(absolute)
    rmse = math.sqrt(statistics.fmean([error * error for error in errors])) if errors else None
    bias = _mean(errors)
    mape = (
        statistics.fmean([abs(error) / abs(actual) * 100.0 for error, actual in nonzero_actual_errors])
        if nonzero_actual_errors
        else None
    )
    sum_actual = sum(abs(actual) for actual in actuals)
    wape = (sum(absolute) / sum_actual * 100.0) if sum_actual else None
    p90 = _percentile_nearest_rank(absolute, 0.90)

    return {
        "sample_size": len(matched),
        "mae_mw": _round(mae),
        "rmse_mw": _round(rmse),
        "bias_mw": _round(bias),
        "mean_error_mw": _round(bias),
        "mape_pct": _round(mape),
        "mape_sample_size": len(nonzero_actual_errors),
        "wape_pct": _round(wape),
        "mean_forecast_mw": _round(_mean(forecasts)),
        "mean_actual_mw": _round(_mean(actuals)),
        "max_absolute_error_mw": _round(max(absolute) if absolute else None),
        "p90_absolute_error_mw": _round(p90),
    }


def compute_metrics(intervals: Sequence[DeliveryInterval]) -> dict[str, object]:
    matched = sum(1 for row in intervals if row.is_matched)
    missing_forecast = sum(1 for row in intervals if row.status == "missing_forecast")
    missing_actual = sum(1 for row in intervals if row.status == "missing_actual")
    missing_both = sum(1 for row in intervals if row.status == "missing_both")
    expected = len(intervals)
    result = _metric_bundle(intervals)
    result.update(
        {
            "matched_intervals": matched,
            "expected_intervals": expected,
            "missing_forecast": missing_forecast,
            "missing_actual": missing_actual,
            "missing_both": missing_both,
            "coverage_pct": _round(matched / expected * 100.0) if expected else None,
            "sign_convention": (
                "error = forecast − actual. Positive bias means the forecast "
                "was higher than outturn (overforecast)."
            ),
        }
    )
    return result


def _percentile_nearest_rank(values: Sequence[float], quantile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    rank = max(1, math.ceil(quantile * len(ordered)))
    return ordered[min(rank - 1, len(ordered) - 1)]


def daily_summary(intervals: Sequence[DeliveryInterval]) -> list[dict[str, object]]:
    grouped: dict[date, list[DeliveryInterval]] = defaultdict(list)
    for row in intervals:
        grouped[row.delivery_date].append(row)
    result: list[dict[str, object]] = []
    for delivery_date in sorted(grouped):
        rows = grouped[delivery_date]
        bundle = _metric_bundle(rows)
        matched = sum(1 for row in rows if row.is_matched)
        result.append(
            {
                "delivery_date": delivery_date.isoformat(),
                "decision_date": rows[0].decision_date.isoformat(),
                "expected_intervals": len(rows),
                "matched_intervals": matched,
                "coverage_pct": _round(matched / len(rows) * 100.0) if rows else None,
                "mae_mw": bundle["mae_mw"],
                "rmse_mw": bundle["rmse_mw"],
                "bias_mw": bundle["bias_mw"],
                "max_absolute_error_mw": bundle["max_absolute_error_mw"],
            }
        )
    return result


def diurnal_summary(
    intervals: Sequence[DeliveryInterval],
    timezone_name: str = "Europe/London",
) -> list[dict[str, object]]:
    grouped: dict[int, list[DeliveryInterval]] = defaultdict(list)
    for row in intervals:
        grouped[local_datetime(row.start_time, timezone_name).hour].append(row)
    result: list[dict[str, object]] = []
    for hour in range(24):
        rows = grouped.get(hour, [])
        bundle = _metric_bundle(rows)
        matched = sum(1 for row in rows if row.is_matched)
        result.append(
            {
                "hour": hour,
                "label": f"{hour:02d}:00",
                "expected_intervals": len(rows),
                "matched_intervals": matched,
                "mae_mw": bundle["mae_mw"],
                "bias_mw": bundle["bias_mw"],
            }
        )
    return result


def error_histogram(
    intervals: Sequence[DeliveryInterval],
    *,
    target_bins: int = 21,
) -> dict[str, object]:
    errors = [
        row.error_mw for row in intervals if row.is_matched and row.error_mw is not None
    ]
    if not errors:
        return {"bins": [], "min_mw": None, "max_mw": None, "bin_width_mw": None, "sample_size": 0}
    low, high = min(errors), max(errors)
    if high == low:
        return {
            "bins": [{"from_mw": _round(low), "to_mw": _round(high), "count": len(errors)}],
            "min_mw": _round(low),
            "max_mw": _round(high),
            "bin_width_mw": 0.0,
            "sample_size": len(errors),
        }
    width = (high - low) / target_bins
    counts = [0] * target_bins
    for error in errors:
        index = min(int((error - low) / width), target_bins - 1)
        counts[index] += 1
    bins = []
    for index, count in enumerate(counts):
        start = low + index * width
        end = start + width
        bins.append(
            {
                "from_mw": _round(start, 1),
                "to_mw": _round(end, 1),
                "count": count,
            }
        )
    return {
        "bins": bins,
        "min_mw": _round(low),
        "max_mw": _round(high),
        "bin_width_mw": _round(width, 1),
        "sample_size": len(errors),
    }


def top_errors(
    intervals: Sequence[DeliveryInterval],
    *,
    limit: int = 10,
) -> list[dict[str, object]]:
    matched = [row for row in intervals if row.is_matched and row.absolute_error_mw is not None]
    ranked = sorted(
        matched,
        key=lambda row: (row.absolute_error_mw or 0.0, row.start_time),
        reverse=True,
    )[:limit]
    return [
        {
            "start_time": row.start_time.isoformat(),
            "delivery_date": row.delivery_date.isoformat(),
            "decision_date": row.decision_date.isoformat(),
            "settlement_period": row.settlement_period,
            "forecast_mw": row.forecast_generation_mw,
            "actual_mw": row.actual_generation_mw,
            "error_mw": row.error_mw,
            "absolute_error_mw": row.absolute_error_mw,
            "percentage_error_pct": row.percentage_error_pct,
            "forecast_publish_time": (
                row.forecast_publish_time.isoformat() if row.forecast_publish_time else None
            ),
        }
        for row in ranked
    ]


def lead_time_summary(intervals: Sequence[DeliveryInterval]) -> dict[str, object]:
    leads = [
        row.forecast_lead_time_hours
        for row in intervals
        if row.is_matched and row.forecast_lead_time_hours is not None
    ]
    if not leads:
        return {
            "sample_size": 0,
            "median_hours": None,
            "min_hours": None,
            "max_hours": None,
            "buckets": [],
        }
    edges = [12, 18, 24, 30, 36, 42, 48, 60, 72]
    buckets: list[dict[str, object]] = []
    lower = -math.inf
    for upper in edges:
        count = sum(1 for lead in leads if lower <= lead < upper)
        buckets.append(
            {
                "label": (
                    f"<{upper}h"
                    if lower == -math.inf
                    else f"{int(lower)}–{upper}h"
                ),
                "from_hours": None if lower == -math.inf else float(lower),
                "to_hours": float(upper),
                "count": count,
            }
        )
        lower = upper
    buckets.append(
        {
            "label": f"≥{edges[-1]}h",
            "from_hours": float(edges[-1]),
            "to_hours": None,
            "count": sum(1 for lead in leads if lead >= edges[-1]),
        }
    )
    return {
        "sample_size": len(leads),
        "median_hours": _round(statistics.median(leads)),
        "min_hours": _round(min(leads)),
        "max_hours": _round(max(leads)),
        "buckets": buckets,
    }
