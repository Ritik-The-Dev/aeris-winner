from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from backend.app.config import Settings
from backend.app.domain import UpstreamDataError
from backend.app.elexon import ElexonClient
from backend.app.normalization import build_raw_dataset

from .helpers import actual_row, forecast_row


def test_normalization_filters_non_wind_actuals():
    rows = [
        actual_row("2026-01-02T00:00:00Z", 1000, fuel="WIND"),
        actual_row("2026-01-02T00:30:00Z", 500, fuel="CCGT"),
    ]
    dataset = build_raw_dataset(rows, [])
    assert len(dataset.actuals) == 1
    assert dataset.report.invalid_actual_rows == 1


def test_normalization_rejects_naive_timestamps():
    rows = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T09:30:00",
            "startTime": "2026-01-02T00:00:00",
            "generation": 1000,
        }
    ]
    dataset = build_raw_dataset([], rows)
    assert len(dataset.forecasts) == 0
    assert dataset.report.invalid_forecast_rows == 1


@pytest.mark.asyncio
async def test_client_retries_transient_errors():
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        if calls["count"] < 3:
            return httpx.Response(503, text="try later")
        return httpx.Response(200, json={"data": [{"ok": True}]})

    settings = Settings(environment="test", data_mode="live", max_retries=4, retry_backoff_seconds=0)
    client = ElexonClient(settings, transport=httpx.MockTransport(handler))
    async with httpx.AsyncClient(
        base_url="https://example.test", transport=httpx.MockTransport(handler)
    ) as http:
        rows = await client._request_json(http, "/datasets/FUELHH", {}, label="test")
    assert rows == [{"ok": True}]
    assert calls["count"] == 3


@pytest.mark.asyncio
async def test_client_does_not_retry_bad_request():
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(400, json={"error": "bad range"})

    settings = Settings(environment="test", data_mode="live", max_retries=4, retry_backoff_seconds=0)
    client = ElexonClient(settings, transport=httpx.MockTransport(handler))
    async with httpx.AsyncClient(
        base_url="https://example.test", transport=httpx.MockTransport(handler)
    ) as http:
        with pytest.raises(UpstreamDataError):
            await client._request_json(http, "/datasets/WINDFOR", {}, label="test")
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_live_failure_falls_back_to_verified_snapshot(tmp_path: Path):
    repo_root = Path(__file__).resolve().parents[2]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="unavailable")

    settings = Settings(
        environment="test",
        data_mode="live",
        max_retries=1,
        retry_backoff_seconds=0,
        allow_snapshot_fallback=True,
        snapshot_path=repo_root / "backend" / "data" / "elexon-jan-2026.json.gz",
        cache_dir=tmp_path / "cache",
    )
    client = ElexonClient(settings, transport=httpx.MockTransport(handler))
    payload = await client.get_payload()
    assert payload.origin == "verified_snapshot"
    assert payload.fallback_reason
    assert len(payload.actuals) == 1536
    assert len(payload.forecasts) == 22192
    dataset = await client.get_dataset()
    assert dataset.source["origin"] == "verified_snapshot"
    assert any("not a fresh upstream response" in warning for warning in dataset.warnings)


@pytest.mark.asyncio
async def test_live_success_is_labelled_live(tmp_path: Path):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": []})

    settings = Settings(
        environment="test",
        data_mode="live",
        max_retries=1,
        retry_backoff_seconds=0,
        cache_dir=tmp_path / "cache",
        snapshot_path=tmp_path / "missing.json.gz",
    )
    client = ElexonClient(settings, transport=httpx.MockTransport(handler))
    payload = await client.get_payload()
    assert payload.origin == "elexon_live"
    assert len(payload.actuals) == 0
    assert len(payload.requests) == 11
