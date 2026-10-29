from __future__ import annotations

import statistics
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app


@pytest.fixture(scope="module")
def client(tmp_path_factory: pytest.TempPathFactory) -> TestClient:
    repo_root = Path(__file__).resolve().parents[2]
    settings = Settings(
        environment="test",
        data_mode="snapshot",
        snapshot_path=repo_root / "backend" / "data" / "elexon-jan-2026.json.gz",
        cache_dir=tmp_path_factory.mktemp("cache"),
        static_dir=tmp_path_factory.mktemp("static"),
    )
    return TestClient(create_app(settings))


def test_health_and_meta(client: TestClient):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["snapshot_available"] is True

    meta = client.get("/api/meta")
    assert meta.status_code == 200
    assert meta.json()["default_cutoff_time"] == "09:50"
    assert "FUELHH" in {source["dataset"] for source in meta.json()["sources"]}


def test_overview_metrics_are_consistent_with_series(client: TestClient):
    response = client.get("/api/overview")
    assert response.status_code == 200
    payload = response.json()
    series = payload["series"]
    assert len(series) == 1488
    matched = [row for row in series if row["status"] == "matched"]
    assert len(matched) == payload["metrics"]["sample_size"] == 1488
    errors = [row["error_mw"] for row in matched]
    assert payload["metrics"]["bias_mw"] == pytest.approx(statistics.fmean(errors), abs=0.01)
    assert payload["metrics"]["mae_mw"] == pytest.approx(
        statistics.fmean(abs(error) for error in errors), abs=0.01
    )
    assert payload["metrics"]["rmse_mw"] == pytest.approx(
        (statistics.fmean(error * error for error in errors)) ** 0.5, abs=0.01
    )
    assert payload["source"]["origin"] == "verified_snapshot"
    assert payload["window"]["decision_start"] == "2026-01-01"
    assert payload["window"]["delivery_start"] == "2026-01-02"
    assert payload["resolution"]["forecast_resolution_minutes"] == 60


def test_accuracy_and_forecast_routes_use_same_numbers(client: TestClient):
    overview = client.get("/api/overview").json()
    accuracy = client.get("/api/accuracy").json()
    forecasts = client.get("/api/forecasts").json()
    assert accuracy["metrics"] == overview["metrics"]
    assert len(forecasts["series"]) == len(overview["series"])
    assert forecasts["publication_runs"]
    assert all(run["selected_intervals"] == 48 for run in forecasts["publication_runs"])


def test_intervals_pagination_sorting_and_top_error_consistency(client: TestClient):
    overview = client.get("/api/overview").json()
    response = client.get(
        "/api/intervals",
        params={"page": 1, "page_size": 5, "sort_by": "abs_error", "sort_dir": "desc"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1488
    assert len(payload["rows"]) == 5
    assert payload["rows"][0]["absolute_error_mw"] == overview["top_errors"][0]["absolute_error_mw"]
    assert payload["rows"][0]["start_time"] == overview["top_errors"][0]["start_time"]


def test_interval_detail_exposes_selected_vintage_and_cutoff(client: TestClient):
    overview = client.get("/api/overview").json()
    start_time = overview["top_errors"][0]["start_time"]
    response = client.get("/api/intervals/detail", params={"start_time": start_time})
    assert response.status_code == 200
    detail = response.json()
    assert detail["forecast_publish_time"] <= detail["cutoff_time"]
    assert detail["versions"]
    selected = [version for version in detail["versions"] if version["selected"]]
    assert len(selected) == 1
    assert selected[0]["publish_time"] == detail["forecast_publish_time"]
    assert selected[0]["available_at_cutoff"] is True
    assert any(not version["available_at_cutoff"] for version in detail["versions"])
    assert detail["forecast_versions_eligible"] + detail["forecast_versions_post_cutoff"] == len(
        detail["versions"]
    )


def test_vintages_route(client: TestClient):
    start_time = "2026-01-12T01:00:00+00:00"
    response = client.get("/api/vintages", params={"start_time": start_time})
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_publish_time"] == "2026-01-11T09:30:00+00:00"
    assert sum(version["selected"] for version in payload["versions"]) == 1


def test_csv_export(client: TestClient):
    response = client.get("/api/export.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    lines = response.text.strip().splitlines()
    assert len(lines) == 1489
    assert lines[0].startswith("delivery_date,delivery_interval_start_utc")


def test_invalid_requests_are_rejected(client: TestClient):
    inverted = client.get(
        "/api/overview", params={"start_date": "2026-01-31", "end_date": "2026-01-01"}
    )
    assert inverted.status_code == 400
    outside = client.get(
        "/api/overview", params={"start_date": "2025-12-31", "end_date": "2026-01-02"}
    )
    assert outside.status_code == 400
    bad_cutoff = client.get("/api/overview", params={"cutoff_time": "25:00"})
    assert bad_cutoff.status_code == 422
    bad_status = client.get("/api/intervals", params={"status": "nonsense"})
    assert bad_status.status_code == 422
    missing = client.get(
        "/api/intervals/detail", params={"start_time": "2026-01-01T00:00:00+00:00"}
    )
    assert missing.status_code == 404


def test_cors_header_is_returned_for_configured_origin(client: TestClient):
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_custom_cutoff_changes_selection(client: TestClient):
    early = client.get("/api/intervals", params={"cutoff_time": "07:00", "page_size": 1}).json()
    late = client.get("/api/intervals", params={"cutoff_time": "12:00", "page_size": 1}).json()
    assert early["rows"][0]["forecast_publish_time"] != late["rows"][0]["forecast_publish_time"]
