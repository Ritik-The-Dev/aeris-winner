"""Build the bundled, verified Elexon snapshot used only as a fallback.

Usage:
    python -m backend.scripts.build_snapshot

The snapshot contains the raw FUELHH and WINDFOR rows needed for December 2025
forecast vintages and January 2026 delivery decisions. It is real Elexon data,
not synthetic data. The app prefers live retrieval and labels this fallback
clearly in the UI and API.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

BASE = "https://data.elexon.co.uk/bmrs/api/v1"
OUT = Path(__file__).resolve().parents[1] / "data" / "elexon-jan-2026.json.gz"
ACTUALS_START = date(2026, 1, 1)
ACTUALS_END = date(2026, 2, 1)
FORECASTS_START = date(2025, 12, 28)
FORECASTS_END = date(2026, 2, 3)


def fetch(url: str, attempts: int = 4) -> list[dict[str, Any]]:
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(url, timeout=180) as response:
                payload = json.loads(response.read())
            rows = payload.get("data") if isinstance(payload, dict) else payload
            if not isinstance(rows, list):
                raise ValueError("unexpected Elexon response envelope")
            return rows
        except Exception:
            if attempt == attempts:
                raise
            time.sleep(1.5 * attempt)
    raise RuntimeError("unreachable")


def chunks(start: date, end: date):
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=6), end)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


def content_hash(actuals: list[dict[str, Any]], forecasts: list[dict[str, Any]]) -> str:
    canonical = json.dumps(
        {"actuals": actuals, "forecasts": forecasts},
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return hashlib.sha256(canonical).hexdigest()


def main() -> None:
    actuals: list[dict[str, Any]] = []
    forecasts: list[dict[str, Any]] = []
    requests: list[dict[str, Any]] = []

    for start, end in chunks(ACTUALS_START, ACTUALS_END):
        url = (
            f"{BASE}/datasets/FUELHH?settlementDateFrom={start.isoformat()}"
            f"&settlementDateTo={end.isoformat()}&fuelType=WIND"
        )
        rows = fetch(url)
        actuals.extend(rows)
        requests.append({"label": f"FUELHH {start}..{end}", "rows": len(rows)})
        print(f"FUELHH {start}..{end}: {len(rows)}")

    for start, end in chunks(FORECASTS_START, FORECASTS_END):
        # publishDateTimeTo must be an end-of-day instant; a date-only value is
        # interpreted as midnight and silently drops that day's publications.
        url = (
            f"{BASE}/datasets/WINDFOR?publishDateTimeFrom={start.isoformat()}T00:00:00Z"
            f"&publishDateTimeTo={end.isoformat()}T23:59:59Z"
        )
        rows = fetch(url)
        forecasts.extend(rows)
        requests.append({"label": f"WINDFOR {start}..{end}", "rows": len(rows)})
        print(f"WINDFOR {start}..{end}: {len(rows)}")

    digest = content_hash(actuals, forecasts)
    payload = {
        "metadata": {
            "project": "AERIS — Wind Intelligence",
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "actuals_source": (
                "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH"
                "?settlementDateFrom=...&settlementDateTo=...&fuelType=WIND"
            ),
            "forecasts_source": (
                "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR"
                "?publishDateTimeFrom=...&publishDateTimeTo=..."
            ),
            "actuals_coverage": {
                "from": min((row["startTime"] for row in actuals), default=None),
                "to": max((row["startTime"] for row in actuals), default=None),
                "count": len(actuals),
            },
            "forecasts_coverage": {
                "from": min((row["publishTime"] for row in forecasts), default=None),
                "to": max((row["publishTime"] for row in forecasts), default=None),
                "count": len(forecasts),
            },
            "requests": requests,
            "content_sha256": digest,
            "note": (
                "Verified snapshot of live Elexon BMRS responses. Used only as a "
                "clearly labelled fallback. Not synthetic data."
            ),
        },
        "actuals": actuals,
        "forecasts": forecasts,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(payload, handle, separators=(",", ":"))
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes), sha256={digest}")


if __name__ == "__main__":
    main()
