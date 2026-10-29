from __future__ import annotations

import pytest

from backend.app.normalization import build_raw_dataset

from .helpers import actual_row, forecast_row


@pytest.fixture
def raw_dataset():
    actuals = [
        actual_row("2026-01-02T00:00:00Z", 1000, publish="2026-01-02T00:30:00Z"),
        actual_row("2026-01-02T00:30:00Z", 900, publish="2026-01-02T01:00:00Z"),
        actual_row("2026-01-02T01:00:00Z", 800, publish="2026-01-02T01:30:00Z"),
    ]
    forecasts = [
        forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:30:00Z", 1200),
        forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:50:00Z", 1100),
        forecast_row("2026-01-02T00:00:00Z", "2026-01-01T09:50:01Z", 1300),
        forecast_row("2026-01-02T01:00:00Z", "2026-01-01T09:30:00Z", 850),
    ]
    return build_raw_dataset(actuals, forecasts)
