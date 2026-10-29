from __future__ import annotations

import os
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = REPO_ROOT / "backend" / "data"
DEFAULT_CACHE_DIR = REPO_ROOT / "backend" / ".cache"
DEFAULT_STATIC_DIR = REPO_ROOT / "static"


class Settings(BaseSettings):
    """Runtime configuration.

    Environment variables use the AERIS_ prefix, e.g. AERIS_DATA_MODE=snapshot.
    No secrets are required: the Elexon BMRS API is public.
    """

    model_config = SettingsConfigDict(
        env_prefix="AERIS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AERIS — Wind Intelligence"
    app_version: str = "1.0.0"
    environment: Literal["development", "test", "production"] = "development"

    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    request_timeout_seconds: float = 25.0
    max_retries: int = 3
    retry_backoff_seconds: float = 0.6
    upstream_concurrency: int = 4

    # live = call Elexon, falling back to the verified snapshot on failure.
    # snapshot = never call Elexon (used by tests and air-gapped demos).
    data_mode: Literal["live", "snapshot"] = "live"
    allow_snapshot_fallback: bool = True
    cache_ttl_seconds: int = 21_600
    cache_dir: Path = Field(default=DEFAULT_CACHE_DIR)
    snapshot_path: Path = Field(default=DEFAULT_DATA_DIR / "elexon-jan-2026.json.gz")

    default_decision_start: date = date(2026, 1, 1)
    default_decision_end: date = date(2026, 1, 31)
    allowed_decision_start: date = date(2026, 1, 1)
    allowed_decision_end: date = date(2026, 1, 31)
    default_cutoff_time: str = "09:50"
    allowed_cutoff_min: str = "00:00"
    allowed_cutoff_max: str = "23:59"
    market_timezone: str = "Europe/London"

    cors_origins: str = (
        "http://localhost:5173,http://localhost:4173,http://localhost:8000"
    )
    static_dir: Path = Field(default=DEFAULT_STATIC_DIR)
    log_level: str = "INFO"

    @field_validator("cache_dir", "snapshot_path", "static_dir", mode="before")
    @classmethod
    def _expand_path(cls, value: object) -> object:
        if isinstance(value, str):
            return Path(os.path.expanduser(os.path.expandvars(value)))
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
