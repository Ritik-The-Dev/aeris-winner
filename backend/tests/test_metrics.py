from __future__ import annotations

import math

import pytest

from backend.app.metrics import (
    compute_metrics,
    daily_summary,
    diurnal_summary,
    error_histogram,
    lead_time_summary,
    top_errors,
)

from .helpers import make_interval


def test_mae_rmse_bias_mape_wape_are_hand_checked():
    rows = [
        make_interval(forecast=1100, actual=1000),
        make_interval(forecast=900, actual=1000),
        make_interval(forecast=1200, actual=1000),
    ]
    metrics = compute_metrics(rows)
    assert metrics["sample_size"] == 3
    assert metrics["mae_mw"] == pytest.approx(133.333, abs=0.001)
    assert metrics["rmse_mw"] == pytest.approx(math.sqrt(60000 / 3), abs=0.001)
    assert metrics["bias_mw"] == pytest.approx(66.667, abs=0.001)
    assert metrics["mape_pct"] == pytest.approx(13.333, abs=0.001)
    assert metrics["wape_pct"] == pytest.approx(13.333, abs=0.001)
    assert metrics["matched_intervals"] == 3
    assert metrics["coverage_pct"] == 100.0


def test_bias_sign_is_forecast_minus_actual():
    over = compute_metrics([make_interval(forecast=1200, actual=1000)])
    under = compute_metrics([make_interval(forecast=800, actual=1000)])
    assert over["bias_mw"] == 200.0
    assert under["bias_mw"] == -200.0


def test_zero_actual_does_not_divide_by_zero():
    metrics = compute_metrics([make_interval(forecast=100, actual=0)])
    assert metrics["mae_mw"] == 100.0
    assert metrics["bias_mw"] == 100.0
    assert metrics["mape_pct"] is None
    assert metrics["mape_sample_size"] == 0
    assert metrics["wape_pct"] is None


def test_missing_pairs_are_excluded_not_treated_as_zero():
    rows = [
        make_interval(forecast=1100, actual=1000),
        make_interval(forecast=None, actual=900, status="missing_forecast"),
        make_interval(forecast=800, actual=None, status="missing_actual"),
        make_interval(forecast=None, actual=None, status="missing_both"),
    ]
    metrics = compute_metrics(rows)
    assert metrics["sample_size"] == 1
    assert metrics["expected_intervals"] == 4
    assert metrics["missing_forecast"] == 1
    assert metrics["missing_actual"] == 1
    assert metrics["missing_both"] == 1
    assert metrics["mae_mw"] == 100.0
    assert metrics["coverage_pct"] == 25.0


def test_empty_dataset_returns_nulls_not_zero():
    metrics = compute_metrics([])
    assert metrics["sample_size"] == 0
    assert metrics["mae_mw"] is None
    assert metrics["rmse_mw"] is None
    assert metrics["bias_mw"] is None
    assert metrics["mape_pct"] is None
    assert metrics["coverage_pct"] is None


def test_p90_uses_nearest_rank():
    rows = [
        make_interval(forecast=1001, actual=1000),
        make_interval(forecast=1002, actual=1000),
        make_interval(forecast=1003, actual=1000),
        make_interval(forecast=1004, actual=1000),
        make_interval(forecast=1005, actual=1000),
        make_interval(forecast=1006, actual=1000),
        make_interval(forecast=1007, actual=1000),
        make_interval(forecast=1008, actual=1000),
        make_interval(forecast=1009, actual=1000),
        make_interval(forecast=1100, actual=1000),
    ]
    metrics = compute_metrics(rows)
    assert metrics["p90_absolute_error_mw"] == 9.0


def test_daily_and_diurnal_aggregation():
    rows = [
        make_interval(forecast=1100, actual=1000),
        make_interval(forecast=1300, actual=1000),
    ]
    daily = daily_summary(rows)
    assert daily[0]["matched_intervals"] == 2
    assert daily[0]["mae_mw"] == 200.0
    diurnal = diurnal_summary(rows)
    assert len(diurnal) == 24
    assert diurnal[0]["mae_mw"] == 200.0


def test_histogram_contains_every_error_once():
    rows = [make_interval(forecast=1000 + i, actual=1000) for i in range(1, 21)]
    histogram = error_histogram(rows, target_bins=5)
    assert sum(bin["count"] for bin in histogram["bins"]) == 20
    assert histogram["sample_size"] == 20


def test_top_errors_are_sorted_by_absolute_error():
    rows = [
        make_interval(forecast=1100, actual=1000),
        make_interval(forecast=700, actual=1000),
        make_interval(forecast=1050, actual=1000),
    ]
    top = top_errors(rows, limit=1)
    assert top[0]["absolute_error_mw"] == 300.0


def test_lead_time_summary_uses_selected_forecasts():
    rows = [
        make_interval(lead=24.0),
        make_interval(lead=30.0),
        make_interval(lead=None, status="missing_forecast", forecast=None),
    ]
    summary = lead_time_summary(rows)
    assert summary["sample_size"] == 2
    assert summary["median_hours"] == 27.0
    assert sum(bucket["count"] for bucket in summary["buckets"]) == 2
