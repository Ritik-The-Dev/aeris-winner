from __future__ import annotations

import asyncio
import gzip
import hashlib
import json
import logging
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Sequence

import httpx

from .config import Settings
from .domain import RawDataset, UpstreamDataError
from .normalization import build_raw_dataset

logger = logging.getLogger(__name__)

UTC = timezone.utc
WINDOW_ACTUALS_START = date(2026, 1, 1)
WINDOW_ACTUALS_END = date(2026, 2, 1)
WINDOW_FORECASTS_START = date(2025, 12, 28)
WINDOW_FORECASTS_END = date(2026, 2, 3)
LIVE_CACHE_KEY = "elexon-jan-2026-window-v1"


@dataclass(slots=True)
class RawPayload:
    actuals: list[dict[str, Any]]
    forecasts: list[dict[str, Any]]
    fetched_at: datetime
    requests: list[dict[str, Any]]
    origin: str
    fallback_reason: str | None = None
    cache_age_seconds: float | None = None
    snapshot_generated_at: str | None = None
    snapshot_sha256: str | None = None
    warnings: list[str] | None = None


def _iso_z(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _chunks(start: date, end: date, days: int = 7):
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=days - 1), end)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


def snapshot_content_hash(actuals: Sequence[dict[str, Any]], forecasts: Sequence[dict[str, Any]]) -> str:
    """Hash only the data payload so the checksum is stable when metadata changes."""
    canonical = json.dumps(
        {"actuals": list(actuals), "forecasts": list(forecasts)},
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return hashlib.sha256(canonical).hexdigest()


class DiskCache:
    def __init__(self, directory: Path, ttl_seconds: int) -> None:
        self.directory = directory
        self.ttl_seconds = ttl_seconds

    @property
    def path(self) -> Path:
        return self.directory / f"{LIVE_CACHE_KEY}.json.gz"

    def load(self) -> tuple[dict[str, Any], float] | None:
        if not self.path.exists():
            return None
        try:
            with gzip.open(self.path, "rt", encoding="utf-8") as handle:
                payload = json.load(handle)
            fetched_at = datetime.fromisoformat(
                str(payload["fetched_at"]).replace("Z", "+00:00")
            )
            age = (datetime.now(UTC) - fetched_at).total_seconds()
            return payload, age
        except (OSError, ValueError, KeyError, TypeError) as exc:
            logger.warning("Ignoring unreadable Elexon cache %s: %s", self.path, exc)
            return None

    def save(self, payload: dict[str, Any]) -> None:
        """Best-effort cache write.

        Serverless platforms such as Vercel expose a read-only project
        filesystem. A cache write failure must not turn a successful upstream
        fetch into a misleading snapshot fallback.
        """
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix(".tmp")
            with gzip.open(temp, "wt", encoding="utf-8", compresslevel=6) as handle:
                json.dump(payload, handle, separators=(",", ":"))
            temp.replace(self.path)
        except OSError as exc:
            logger.warning("Could not write Elexon cache %s: %s", self.path, exc)


class SnapshotStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._cached: dict[str, Any] | None = None

    def load(self) -> dict[str, Any]:
        if self._cached is not None:
            return self._cached
        if not self.path.exists():
            raise UpstreamDataError(
                f"The verified Elexon snapshot is missing at {self.path}. "
                "Run python -m backend.scripts.build_snapshot to rebuild it."
            )
        try:
            with gzip.open(self.path, "rt", encoding="utf-8") as handle:
                payload = json.load(handle)
            if not isinstance(payload.get("actuals"), list) or not isinstance(
                payload.get("forecasts"), list
            ):
                raise ValueError("snapshot is missing actuals/forecasts arrays")
            meta = payload.setdefault("metadata", {})
            expected = meta.get("content_sha256")
            calculated = snapshot_content_hash(payload["actuals"], payload["forecasts"])
            meta["content_sha256_calculated"] = calculated
            if expected and expected != calculated:
                raise ValueError("snapshot checksum does not match its content")
            if not expected:
                meta["content_sha256"] = calculated
            self._cached = payload
            return payload
        except (OSError, ValueError, TypeError) as exc:
            raise UpstreamDataError(f"Could not read the verified Elexon snapshot: {exc}") from exc


class ElexonClient:
    """Historical Elexon BMRS retrieval.

    The /stream endpoints referenced by the assignment return only the latest
    publication and ignore start/end query parameters. To retrieve January
    2026 history we use the dataset endpoints with publishTime/settlementDate
    filters, in windows of no more than seven days (the API's hard limit).
    """

    def __init__(self, settings: Settings, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.settings = settings
        self.cache = DiskCache(settings.cache_dir, settings.cache_ttl_seconds)
        self.snapshot = SnapshotStore(settings.snapshot_path)
        self._transport = transport
        self._memory: RawPayload | None = None
        self._lock = asyncio.Lock()

    async def _request_json(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, str],
        *,
        label: str,
    ) -> list[dict[str, Any]]:
        last_error: Exception | None = None
        for attempt in range(1, self.settings.max_retries + 1):
            try:
                response = await client.get(url, params=params)
                if response.status_code in (429, 500, 502, 503, 504):
                    raise httpx.HTTPStatusError(
                        f"upstream {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()
                payload = response.json()
                rows = payload.get("data") if isinstance(payload, dict) else payload
                if not isinstance(rows, list):
                    raise UpstreamDataError(f"{label}: unexpected response envelope")
                if not all(isinstance(row, dict) for row in rows):
                    raise UpstreamDataError(f"{label}: response contains non-object rows")
                logger.info("Fetched %s rows=%d window=%s..%s", label, len(rows), params.get("from", params.get("publishDateTimeFrom", params.get("settlementDateFrom"))), params.get("to", params.get("publishDateTimeTo", params.get("settlementDateTo"))))
                return rows
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code if exc.response is not None else None
                if status is not None and 400 <= status < 500 and status != 429:
                    raise UpstreamDataError(
                        f"{label}: Elexon rejected the request ({status}): "
                        f"{exc.response.text[:300]}"
                    ) from exc
                last_error = exc
            except (httpx.HTTPError, UpstreamDataError, ValueError) as exc:
                last_error = exc
            if attempt < self.settings.max_retries:
                delay = self.settings.retry_backoff_seconds * (2 ** (attempt - 1))
                delay += random.uniform(0, 0.25)
                logger.warning("%s attempt %d failed: %s; retrying in %.2fs", label, attempt, last_error, delay)
                await asyncio.sleep(delay)
        raise UpstreamDataError(f"{label}: Elexon request failed after retries: {last_error}")

    async def _fetch_all(self) -> RawPayload:
        timeout = httpx.Timeout(self.settings.request_timeout_seconds, connect=10.0)
        limits = httpx.Limits(max_connections=self.settings.upstream_concurrency + 2)
        semaphore = asyncio.Semaphore(self.settings.upstream_concurrency)
        requests_log: list[dict[str, Any]] = []
        async with httpx.AsyncClient(
            base_url=self.settings.elexon_base_url.rstrip("/"),
            timeout=timeout,
            limits=limits,
            headers={
                "Accept": "application/json",
                "User-Agent": "AERIS-Wind-Intelligence/1.0 (forecast audit)",
            },
            transport=self._transport,
        ) as client:

            async def guarded(url: str, params: dict[str, str], label: str):
                async with semaphore:
                    return await self._request_json(client, url, params, label=label)

            tasks: list[asyncio.Task] = []
            labels: list[str] = []
            for start, end in _chunks(WINDOW_ACTUALS_START, WINDOW_ACTUALS_END):
                params = {
                    "settlementDateFrom": start.isoformat(),
                    "settlementDateTo": end.isoformat(),
                    "fuelType": "WIND",
                }
                labels.append(f"FUELHH {start}..{end}")
                tasks.append(
                    asyncio.create_task(
                        guarded("/datasets/FUELHH", params, labels[-1])
                    )
                )
            for start, end in _chunks(WINDOW_FORECASTS_START, WINDOW_FORECASTS_END):
                params = {
                    "publishDateTimeFrom": f"{start.isoformat()}T00:00:00Z",
                    "publishDateTimeTo": f"{end.isoformat()}T23:59:59Z",
                }
                labels.append(f"WINDFOR {start}..{end}")
                tasks.append(
                    asyncio.create_task(
                        guarded("/datasets/WINDFOR", params, labels[-1])
                    )
                )
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for label, result in zip(labels, results):
                if isinstance(result, BaseException):
                    for pending in tasks:
                        pending.cancel()
                    raise UpstreamDataError(f"{label}: {result}") from result
                requests_log.append({"label": label, "rows": len(result)})
            actuals = [row for result in results[: len(list(_chunks(WINDOW_ACTUALS_START, WINDOW_ACTUALS_END)))] for row in result]
            forecasts = [row for result in results[len(list(_chunks(WINDOW_ACTUALS_START, WINDOW_ACTUALS_END))):] for row in result]

        return RawPayload(
            actuals=actuals,
            forecasts=forecasts,
            fetched_at=datetime.now(UTC),
            requests=requests_log,
            origin="elexon_live",
        )

    def _payload_from_disk(self, cached: tuple[dict[str, Any], float]) -> RawPayload:
        data, age = cached
        fetched_at = datetime.fromisoformat(str(data["fetched_at"]).replace("Z", "+00:00"))
        return RawPayload(
            actuals=list(data["actuals"]),
            forecasts=list(data["forecasts"]),
            fetched_at=fetched_at,
            requests=list(data.get("requests", [])),
            origin="elexon_cache",
            cache_age_seconds=round(age, 3),
            warnings=["Served from the local Elexon response cache; upstream was not re-checked."],
        )

    def _payload_from_snapshot(self, reason: str | None) -> RawPayload:
        snapshot = self.snapshot.load()
        meta = snapshot.get("metadata", {})
        fetched_at_raw = meta.get("generated_at")
        try:
            fetched_at = datetime.fromisoformat(str(fetched_at_raw).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            fetched_at = datetime.now(UTC)
        return RawPayload(
            actuals=list(snapshot["actuals"]),
            forecasts=list(snapshot["forecasts"]),
            fetched_at=fetched_at,
            requests=[],
            origin="verified_snapshot",
            fallback_reason=reason,
            snapshot_generated_at=str(fetched_at_raw) if fetched_at_raw else None,
            snapshot_sha256=meta.get("content_sha256"),
            warnings=[
                "Served from the verified Elexon snapshot bundled with the app. "
                "This is real Elexon data, but it is not a fresh upstream response."
            ],
        )

    async def get_payload(self, *, refresh: bool = False) -> RawPayload:
        if self.settings.data_mode == "snapshot":
            return self._payload_from_snapshot("AERIS_DATA_MODE=snapshot")

        if self._memory is not None and not refresh:
            age = (datetime.now(UTC) - self._memory.fetched_at).total_seconds()
            if age <= self.settings.cache_ttl_seconds:
                return self._memory

        async with self._lock:
            if self._memory is not None and not refresh:
                age = (datetime.now(UTC) - self._memory.fetched_at).total_seconds()
                if age <= self.settings.cache_ttl_seconds:
                    return self._memory

            cached = None if refresh else self.cache.load()
            if cached is not None and cached[1] <= self.settings.cache_ttl_seconds:
                payload = self._payload_from_disk(cached)
                self._memory = payload
                return payload

            try:
                payload = await self._fetch_all()
                self._memory = payload
                self.cache.save(
                    {
                        "fetched_at": _iso_z(payload.fetched_at),
                        "actuals": payload.actuals,
                        "forecasts": payload.forecasts,
                        "requests": payload.requests,
                    }
                )
                return payload
            except Exception as exc:
                reason = f"Live Elexon retrieval failed: {exc}"
                logger.error(reason)
                if cached is not None:
                    payload = self._payload_from_disk(cached)
                    payload.origin = "elexon_cache"
                    payload.fallback_reason = reason
                    payload.warnings = [
                        "Live Elexon retrieval failed. Showing the last successfully "
                        "cached Elexon response; no synthetic data was substituted."
                    ]
                    self._memory = payload
                    return payload
                if self.settings.allow_snapshot_fallback:
                    payload = self._payload_from_snapshot(reason)
                    self._memory = payload
                    return payload
                raise UpstreamDataError(reason) from exc

    async def get_dataset(self, *, refresh: bool = False) -> RawDataset:
        payload = await self.get_payload(refresh=refresh)
        fetched_at = _iso_z(payload.fetched_at)
        source = {
            "provider": "Elexon BMRS Insights",
            "datasets": ["FUELHH", "WINDFOR"],
            "origin": payload.origin,
            "fetched_at": fetched_at,
            "served_at": _iso_z(datetime.now(UTC)),
            "cache_age_seconds": payload.cache_age_seconds,
            "fallback_reason": payload.fallback_reason,
            "snapshot_generated_at": payload.snapshot_generated_at,
            "snapshot_sha256": payload.snapshot_sha256,
            "requests": payload.requests,
            "notes": [
                "Historical retrieval uses /datasets/{code} with bounded filters; "
                "/stream returns only the latest publication and ignores ranges."
            ],
        }
        dataset = build_raw_dataset(payload.actuals, payload.forecasts, source=source)
        if payload.warnings:
            dataset.warnings.extend(payload.warnings)
        return dataset
