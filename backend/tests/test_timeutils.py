from __future__ import annotations

from datetime import date

import pytest

from backend.app.timeutils import (
    cutoff_for_decision_date,
    delivery_intervals_for_date,
    parse_clock,
    parse_iso_timestamp,
)
from backend.app.domain import DataValidationError


def test_cutoff_is_utc_in_winter():
    cutoff = cutoff_for_decision_date(date(2026, 1, 15), "09:50", "Europe/London")
    assert cutoff.isoformat() == "2026-01-15T09:50:00+00:00"


def test_cutoff_respects_british_summer_time():
    cutoff = cutoff_for_decision_date(date(2026, 7, 15), "09:50", "Europe/London")
    assert cutoff.isoformat() == "2026-07-15T08:50:00+00:00"


def test_spring_dst_day_has_46_half_hours():
    starts = delivery_intervals_for_date(date(2026, 3, 29), "Europe/London")
    assert len(starts) == 46
    assert starts[0].isoformat() == "2026-03-29T00:00:00+00:00"
    assert starts[-1].isoformat() == "2026-03-29T22:30:00+00:00"


def test_autumn_dst_day_has_50_half_hours():
    starts = delivery_intervals_for_date(date(2026, 10, 25), "Europe/London")
    assert len(starts) == 50


def test_winter_day_has_48_half_hours():
    starts = delivery_intervals_for_date(date(2026, 1, 15), "Europe/London")
    assert len(starts) == 48


def test_naive_timestamp_is_rejected():
    with pytest.raises(DataValidationError):
        parse_iso_timestamp("2026-01-01T00:00:00", field_name="startTime")


def test_invalid_clock_is_rejected():
    for value in ["9:50", "24:00", "09:60", "0950", ""]:
        with pytest.raises(ValueError):
            parse_clock(value)
