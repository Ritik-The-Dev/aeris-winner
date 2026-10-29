from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime


class DataValidationError(ValueError):
    """Raised when an upstream row cannot be safely interpreted."""


class UpstreamDataError(RuntimeError):
    """Raised when Elexon data cannot be retrieved or decoded."""


@dataclass(frozen=True, slots=True)
class ActualRecord:
    start_time: datetime
    publish_time: datetime
    generation_mw: float
    settlement_date: str
    settlement_period: int
    source_index: int = 0
    raw_dataset: str = "FUELHH"


@dataclass(frozen=True, slots=True)
class ForecastRecord:
    start_time: datetime
    publish_time: datetime
    generation_mw: float
    source_index: int = 0
    raw_dataset: str = "WINDFOR"


@dataclass(frozen=True, slots=True)
class NormalizationReport:
    actual_rows_in: int = 0
    actual_rows_used: int = 0
    actual_duplicates_removed: int = 0
    actual_conflicting_duplicates: int = 0
    forecast_rows_in: int = 0
    forecast_rows_used: int = 0
    forecast_duplicates_removed: int = 0
    forecast_conflicting_duplicates: int = 0
    invalid_actual_rows: int = 0
    invalid_forecast_rows: int = 0
    invalid_examples: tuple[str, ...] = ()
    actual_first: datetime | None = None
    actual_last: datetime | None = None
    forecast_publish_first: datetime | None = None
    forecast_publish_last: datetime | None = None
    forecast_publish_runs: int = 0

    def as_dict(self) -> dict[str, object]:
        return {
            "actual_rows_in": self.actual_rows_in,
            "actual_rows_used": self.actual_rows_used,
            "actual_duplicates_removed": self.actual_duplicates_removed,
            "actual_conflicting_duplicates": self.actual_conflicting_duplicates,
            "forecast_rows_in": self.forecast_rows_in,
            "forecast_rows_used": self.forecast_rows_used,
            "forecast_duplicates_removed": self.forecast_duplicates_removed,
            "forecast_conflicting_duplicates": self.forecast_conflicting_duplicates,
            "invalid_actual_rows": self.invalid_actual_rows,
            "invalid_forecast_rows": self.invalid_forecast_rows,
            "invalid_examples": list(self.invalid_examples),
            "actual_first": self.actual_first.isoformat() if self.actual_first else None,
            "actual_last": self.actual_last.isoformat() if self.actual_last else None,
            "forecast_publish_first": (
                self.forecast_publish_first.isoformat()
                if self.forecast_publish_first
                else None
            ),
            "forecast_publish_last": (
                self.forecast_publish_last.isoformat()
                if self.forecast_publish_last
                else None
            ),
            "forecast_publish_runs": self.forecast_publish_runs,
        }


@dataclass(slots=True)
class RawDataset:
    actuals: list[ActualRecord]
    forecasts: list[ForecastRecord]
    report: NormalizationReport
    source: dict[str, object] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    actuals_by_start: dict[datetime, ActualRecord] = field(default_factory=dict)
    forecasts_by_hour: dict[datetime, list[ForecastRecord]] = field(default_factory=dict)

    def index(self) -> None:
        self.actuals_by_start = {row.start_time: row for row in self.actuals}
        grouped: dict[datetime, list[ForecastRecord]] = {}
        for row in self.forecasts:
            grouped.setdefault(row.start_time, []).append(row)
        for rows in grouped.values():
            rows.sort(key=lambda r: (r.publish_time, r.source_index))
        self.forecasts_by_hour = grouped


@dataclass(frozen=True, slots=True)
class ForecastVersion:
    publish_time: datetime
    generation_mw: float
    lead_time_hours: float
    available_at_cutoff: bool
    selected: bool


@dataclass(frozen=True, slots=True)
class DeliveryInterval:
    start_time: datetime
    end_time: datetime
    delivery_date: date
    decision_date: date
    settlement_period: int
    cutoff_time: datetime
    forecast_start_time: datetime
    forecast_generation_mw: float | None
    forecast_publish_time: datetime | None
    forecast_lead_time_hours: float | None
    forecast_versions_total: int
    forecast_versions_eligible: int
    forecast_versions_post_cutoff: int
    actual_generation_mw: float | None
    actual_publish_time: datetime | None
    error_mw: float | None
    absolute_error_mw: float | None
    percentage_error_pct: float | None
    status: str
    flags: tuple[str, ...] = ()
    versions: tuple[ForecastVersion, ...] = ()

    @property
    def is_matched(self) -> bool:
        return self.status == "matched"


def finite_number(value: object) -> float | None:
    """Return a finite float, or None for booleans/NaN/infinities/bad types."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip())
        except ValueError:
            return None
    else:
        return None
    if not math.isfinite(number):
        return None
    return number
