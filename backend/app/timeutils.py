from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .domain import DataValidationError

UTC = timezone.utc
CUTOFF_PATTERN = re.compile(r"^(?P<hour>[01]\d|2[0-3]):(?P<minute>[0-5]\d)$")


def market_tz(timezone_name: str = "Europe/London") -> ZoneInfo:
    return ZoneInfo(timezone_name)


def parse_iso_timestamp(value: object, *, field_name: str) -> datetime:
    """Parse an ISO-8601 timestamp and require an explicit offset.

    Elexon returns UTC timestamps with a trailing Z. We deliberately reject
    naive timestamps instead of guessing: guessing could mis-date a forecast
    by an hour and silently change the analytical result.
    """
    if not isinstance(value, str) or not value.strip():
        raise DataValidationError(f"{field_name} is missing or not a string")
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise DataValidationError(f"{field_name} is not valid ISO-8601: {value!r}") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise DataValidationError(f"{field_name} has no explicit timezone offset: {value!r}")
    return parsed.astimezone(UTC)


def parse_clock(value: str) -> time:
    match = CUTOFF_PATTERN.match(value.strip())
    if not match:
        raise ValueError("Cutoff time must use 24-hour HH:MM format, for example 09:50")
    return time(int(match.group("hour")), int(match.group("minute")))


def cutoff_for_decision_date(
    decision_date: date,
    cutoff_clock: str,
    timezone_name: str = "Europe/London",
) -> datetime:
    """Return the decision cutoff as an absolute UTC instant.

    The cutoff is a local wall-clock time on the decision date. This matters
    across the GMT/BST boundary; zoneinfo resolves the offset for that date.
    """
    local = datetime.combine(decision_date, parse_clock(cutoff_clock), tzinfo=market_tz(timezone_name))
    return local.astimezone(UTC)


def local_day_bounds_utc(
    delivery_date: date,
    timezone_name: str = "Europe/London",
) -> tuple[datetime, datetime]:
    tz = market_tz(timezone_name)
    start_local = datetime.combine(delivery_date, time(0, 0), tzinfo=tz)
    end_local = datetime.combine(delivery_date + timedelta(days=1), time(0, 0), tzinfo=tz)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def local_datetime(value: datetime, timezone_name: str = "Europe/London") -> datetime:
    return value.astimezone(market_tz(timezone_name))


def local_date(value: datetime, timezone_name: str = "Europe/London") -> date:
    return local_datetime(value, timezone_name).date()


def delivery_intervals_for_date(
    delivery_date: date,
    timezone_name: str = "Europe/London",
) -> list[datetime]:
    """Return 48 half-hour starts for a normal day, 46/50 on DST days."""
    start, end = local_day_bounds_utc(delivery_date, timezone_name)
    result: list[datetime] = []
    cursor = start
    while cursor < end:
        result.append(cursor)
        cursor += timedelta(minutes=30)
    return result


def is_half_hour(value: datetime) -> bool:
    return value.minute in (0, 30) and value.second == 0 and value.microsecond == 0


def hour_bucket(value: datetime) -> datetime:
    return value.replace(minute=0, second=0, microsecond=0)


def iter_dates(start: date, end: date):
    cursor = start
    while cursor <= end:
        yield cursor
        cursor += timedelta(days=1)
