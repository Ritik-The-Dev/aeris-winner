from __future__ import annotations

from datetime import date, datetime, timezone

from backend.app.normalization import build_raw_dataset
from backend.app.selection import build_interval
from backend.app.timeutils import cutoff_for_decision_date

from .helpers import actual_row, forecast_row

UTC = timezone.utc


def _interval(dataset, start: str, cutoff: datetime):
    start_dt = datetime.fromisoformat(start)
    return build_interval(
        start_time=start_dt,
        end_time=start_dt,
        delivery_date=date(2026, 1, 2),
        decision_date=date(2026, 1, 1),
        settlement_period=1,
        cutoff=cutoff,
        dataset=dataset,
    )


def test_latest_forecast_at_or_before_cutoff_is_selected(raw_dataset):
    cutoff = cutoff_for_decision_date(date(2026, 1, 1), "09:50")
    row = _interval(raw_dataset, "2026-01-02T00:00:00+00:00", cutoff)
    assert row.forecast_publish_time.isoformat() == "2026-01-01T09:50:00+00:00"
    assert row.forecast_generation_mw == 1100.0
    assert row.forecast_versions_eligible == 2
    assert row.forecast_versions_post_cutoff == 1
    assert row.actual_generation_mw == 1000.0
    assert row.error_mw == 100.0
    assert row.status == "matched"


def test_forecast_published_one_second_after_cutoff_is_excluded(raw_dataset):
    cutoff = datetime(2026, 1, 1, 9, 49, 59, tzinfo=UTC)
    row = _interval(raw_dataset, "2026-01-02T00:00:00+00:00", cutoff)
    assert row.forecast_publish_time.isoformat() == "2026-01-01T09:30:00+00:00"
    assert row.forecast_versions_eligible == 1
    assert row.forecast_versions_post_cutoff == 2


def test_cutoff_before_all_forecasts_is_missing_not_zero(raw_dataset):
    cutoff = datetime(2025, 12, 31, 23, 0, tzinfo=UTC)
    row = _interval(raw_dataset, "2026-01-02T00:00:00+00:00", cutoff)
    assert row.status == "missing_forecast"
    assert row.forecast_generation_mw is None
    assert row.error_mw is None
    assert row.percentage_error_pct is None
    assert row.forecast_versions_post_cutoff == 3


def test_hourly_forecast_is_held_for_both_half_hours(raw_dataset):
    cutoff = cutoff_for_decision_date(date(2026, 1, 1), "09:50")
    first = _interval(raw_dataset, "2026-01-02T00:00:00+00:00", cutoff)
    second = _interval(raw_dataset, "2026-01-02T00:30:00+00:00", cutoff)
    assert first.forecast_generation_mw == second.forecast_generation_mw == 1100.0
    assert first.forecast_start_time == second.forecast_start_time
    assert "hourly_forecast_held_across_half_hour" in second.flags


def test_missing_actual_does_not_become_zero(raw_dataset):
    cutoff = cutoff_for_decision_date(date(2026, 1, 1), "09:50")
    row = _interval(raw_dataset, "2026-01-02T02:00:00+00:00", cutoff)
    assert row.actual_generation_mw is None
    assert row.forecast_generation_mw is None
    assert row.status == "missing_both"
    assert row.error_mw is None


def test_exact_duplicate_forecast_keeps_last_and_counts_conflict():
    actuals = [actual_row("2026-01-02T00:00:00Z", 1000)]
    forecasts = [
        forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:30:00Z", 1200),
        forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:30:00Z", 1250),
    ]
    dataset = build_raw_dataset(actuals, forecasts)
    assert dataset.report.forecast_rows_used == 1
    assert dataset.report.forecast_conflicting_duplicates == 1
    cutoff = cutoff_for_decision_date(date(2026, 1, 1), "09:50")
    row = _interval(dataset, "2026-01-02T00:00:00+00:00", cutoff)
    assert row.forecast_generation_mw == 1250


def test_actual_revision_uses_latest_publish_time():
    actuals = [
        actual_row("2026-01-02T00:00:00Z", 1000, publish="2026-01-02T00:30:00Z"),
        actual_row("2026-01-02T00:00:00Z", 1050, publish="2026-01-02T01:00:00Z"),
    ]
    forecasts = [forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:30:00Z", 1100)]
    dataset = build_raw_dataset(actuals, forecasts)
    assert dataset.report.actual_duplicates_removed == 1
    assert dataset.actuals[0].generation_mw == 1050
