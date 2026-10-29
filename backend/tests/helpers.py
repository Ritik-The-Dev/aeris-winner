from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from backend.app.domain import DeliveryInterval

UTC = timezone.utc


def actual_row(
    start: str,
    generation: float,
    *,
    publish: str | None = None,
    period: int = 1,
    fuel: str = "WIND",
) -> dict[str, object]:
    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    return {
        "dataset": "FUELHH",
        "publishTime": publish or (start_dt.isoformat().replace("+00:00", "Z")),
        "startTime": start,
        "settlementDate": start_dt.date().isoformat(),
        "settlementPeriod": period,
        "fuelType": fuel,
        "generation": generation,
    }


def forecast_row(start: str, publish: str, generation: float) -> dict[str, object]:
    return {
        "dataset": "WINDFOR",
        "publishTime": publish,
        "startTime": start,
        "generation": generation,
    }


def make_interval(
    *,
    start: str = "2026-01-02T00:00:00+00:00",
    forecast: float | None = 1100.0,
    actual: float | None = 1000.0,
    status: str | None = None,
    publish: str | None = "2026-01-01T09:30:00+00:00",
    lead: float | None = 14.5,
) -> DeliveryInterval:
    start_dt = datetime.fromisoformat(start)
    if status is None:
        if forecast is not None and actual is not None:
            status = "matched"
        elif forecast is None:
            status = "missing_forecast"
        else:
            status = "missing_actual"
    error = forecast - actual if forecast is not None and actual is not None else None
    pct = error / actual * 100 if error is not None and actual not in (None, 0) else None
    return DeliveryInterval(
        start_time=start_dt,
        end_time=start_dt + timedelta(minutes=30),
        delivery_date=date(2026, 1, 2),
        decision_date=date(2026, 1, 1),
        settlement_period=1,
        cutoff_time=datetime(2026, 1, 1, 9, 50, tzinfo=UTC),
        forecast_start_time=start_dt.replace(minute=0),
        forecast_generation_mw=forecast,
        forecast_publish_time=datetime.fromisoformat(publish) if publish else None,
        forecast_lead_time_hours=lead,
        forecast_versions_total=3,
        forecast_versions_eligible=2,
        forecast_versions_post_cutoff=1,
        actual_generation_mw=actual,
        actual_publish_time=datetime(2026, 1, 2, 0, 30, tzinfo=UTC),
        error_mw=error,
        absolute_error_mw=abs(error) if error is not None else None,
        percentage_error_pct=pct,
        status=status,
        versions=(),
    )
