from __future__ import annotations

import logging
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .analysis import (
    AnalysisRequest,
    AnalysisResult,
    AnalysisService,
    interval_detail,
    intervals_csv,
    intervals_page,
    series_point,
)
from .config import Settings, get_settings
from .domain import UpstreamDataError
from .schemas import (
    AccuracyResponse,
    ErrorResponse,
    ForecastsResponse,
    HealthResponse,
    IntervalDetailResponse,
    IntervalsResponse,
    MetaResponse,
    OverviewResponse,
)
from .timeutils import parse_iso_timestamp

logger = logging.getLogger(__name__)

PRODUCT = "AERIS — Wind Intelligence"
PRODUCT_VERSION = "1.0.0"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_window(
    settings: Settings,
    start_date: date | None,
    end_date: date | None,
) -> tuple[date, date]:
    start = start_date or settings.default_decision_start
    end = end_date or settings.default_decision_end
    return start, end


def _base_payload(result: AnalysisResult, settings: Settings) -> dict[str, Any]:
    return {
        "product": PRODUCT,
        "version": settings.app_version,
        "generated_at": _now(),
        "window": result.window,
        "cutoff": result.cutoff,
        "resolution": result.resolution,
        "source": result.source,
        "warnings": result.warnings,
    }


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    app = FastAPI(
        title=PRODUCT,
        version=settings.app_version,
        description=(
            "National GB wind generation forecast audit for January 2026 day-ahead "
            "purchase decisions. Data: Elexon BMRS FUELHH and WINDFOR."
        ),
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.service = AnalysisService(settings)

    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
    )

    def service(request: Request) -> AnalysisService:
        return request.app.state.service

    @app.exception_handler(UpstreamDataError)
    async def upstream_error_handler(_: Request, exc: UpstreamDataError) -> JSONResponse:
        logger.error("Upstream data failure: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Elexon data is temporarily unavailable and no verified fallback "
                    "could be served. No synthetic data has been substituted."
                ),
                "code": "upstream_unavailable",
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Invalid request parameters.",
                "code": "validation_error",
                "errors": exc.errors(),
            },
        )

    @app.get("/api/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            version=settings.app_version,
            timestamp=_now(),
            data_mode=settings.data_mode,
            snapshot_available=settings.snapshot_path.exists(),
            static_app_available=(settings.static_dir / "index.html").exists(),
        )

    @app.get("/api/meta", response_model=MetaResponse, tags=["system"])
    async def meta() -> MetaResponse:
        return MetaResponse(
            product=PRODUCT,
            version=settings.app_version,
            environment=settings.environment,
            default_decision_start=settings.default_decision_start.isoformat(),
            default_decision_end=settings.default_decision_end.isoformat(),
            allowed_decision_start=settings.allowed_decision_start.isoformat(),
            allowed_decision_end=settings.allowed_decision_end.isoformat(),
            default_cutoff_time=settings.default_cutoff_time,
            market_timezone=settings.market_timezone,
            data_mode=settings.data_mode,
            endpoints={
                "health": "/api/health",
                "meta": "/api/meta",
                "overview": "/api/overview",
                "forecasts": "/api/forecasts",
                "accuracy": "/api/accuracy",
                "intervals": "/api/intervals",
                "interval_detail": "/api/intervals/detail",
                "vintages": "/api/vintages",
                "export": "/api/export.csv",
                "docs": "/api/docs",
            },
            sources=[
                {
                    "dataset": "FUELHH",
                    "fields": "startTime, generation, fuelType=WIND",
                    "endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH",
                },
                {
                    "dataset": "WINDFOR",
                    "fields": "startTime, publishTime, generation",
                    "endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR",
                },
            ],
            interpretation=(
                "January 2026 is treated as the period in which purchase decisions "
                "were made (decision dates 1–31 Jan 2026, delivery 2 Jan–1 Feb 2026)."
            ),
            notes=[
                "No API key is required for Elexon BMRS.",
                "WINDFOR is hourly; FUELHH is half-hourly.",
                "The decision cutoff is a configurable market-informed assumption.",
                "No financial or procurement optimisation is performed.",
            ],
        )

    @app.get("/api/overview", response_model=OverviewResponse, tags=["analytics"])
    async def overview(
        request: Request,
        start_date: date | None = Query(default=None, description="Decision date from (inclusive)"),
        end_date: date | None = Query(default=None, description="Decision date to (inclusive)"),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
        refresh: bool = Query(default=False),
    ) -> OverviewResponse:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(
            start_date=start,
            end_date=end,
            cutoff_time=cutoff_time,
            timezone_name=settings.market_timezone,
        )
        try:
            result = await service(request).get_analysis(analysis_request, refresh=refresh)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return OverviewResponse(
            **_base_payload(result, settings),
            metrics=result.metrics,
            series=[series_point(row) for row in result.intervals],
            daily=result.daily,
            diurnal=result.diurnal,
            histogram=result.histogram,
            top_errors=result.top_errors,
            lead_time=result.lead_time,
            data_quality=result.data_quality,
        )

    @app.get("/api/accuracy", response_model=AccuracyResponse, tags=["analytics"])
    async def accuracy(
        request: Request,
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
        refresh: bool = Query(default=False),
    ) -> AccuracyResponse:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request, refresh=refresh)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return AccuracyResponse(
            **_base_payload(result, settings),
            metrics=result.metrics,
            daily=result.daily,
            diurnal=result.diurnal,
            histogram=result.histogram,
            top_errors=result.top_errors,
            lead_time=result.lead_time,
            data_quality=result.data_quality,
        )

    @app.get("/api/forecasts", response_model=ForecastsResponse, tags=["analytics"])
    async def forecasts(
        request: Request,
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
        refresh: bool = Query(default=False),
    ) -> ForecastsResponse:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request, refresh=refresh)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        counts: Counter[str] = Counter(
            row.forecast_publish_time.isoformat()
            for row in result.intervals
            if row.forecast_publish_time is not None
        )
        publication_runs = [
            {"publish_time": publish_time, "selected_intervals": count}
            for publish_time, count in sorted(counts.items())
        ]
        return ForecastsResponse(
            **_base_payload(result, settings),
            series=[series_point(row) for row in result.intervals],
            publication_runs=publication_runs,
        )

    @app.get("/api/intervals", response_model=IntervalsResponse, tags=["analytics"])
    async def intervals(
        request: Request,
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
        status: str = Query(default="all", pattern=r"^(all|matched|missing_forecast|missing_actual|missing_both)$"),
        delivery_date: date | None = Query(default=None),
        sort_by: str = Query(default="start_time", pattern=r"^(start_time|forecast|actual|error|abs_error|delivery_date)$"),
        sort_dir: str = Query(default="asc", pattern=r"^(asc|desc)$"),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=500),
        refresh: bool = Query(default=False),
    ) -> IntervalsResponse:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request, refresh=refresh)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        payload = intervals_page(
            result,
            page=page,
            page_size=page_size,
            status=status,
            delivery_date=delivery_date,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
        return IntervalsResponse(**payload)

    def _resolve_single_interval(result: AnalysisResult, start_time: str) -> dict[str, Any]:
        cleaned = start_time.replace(" ", "+")
        try:
            parsed = parse_iso_timestamp(cleaned, field_name="start_time")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid start_time: {exc}") from exc
        detail = interval_detail(result, parsed)
        if detail is None:
            raise HTTPException(
                status_code=404,
                detail="That delivery interval is not in the selected decision window.",
            )
        return detail

    @app.get("/api/intervals/detail", response_model=IntervalDetailResponse, tags=["analytics"])
    async def interval_detail_route(
        request: Request,
        start_time: str = Query(description="Delivery interval start, ISO-8601 UTC"),
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    ) -> IntervalDetailResponse:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return IntervalDetailResponse(**_resolve_single_interval(result, start_time))

    @app.get("/api/vintages", tags=["analytics"])
    async def vintages(
        request: Request,
        start_time: str = Query(description="Delivery interval start, ISO-8601 UTC"),
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    ) -> dict[str, Any]:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        detail = _resolve_single_interval(result, start_time)
        return {
            "start_time": detail["start_time"],
            "cutoff_time": detail["cutoff_time"],
            "selected_publish_time": detail["forecast_publish_time"],
            "selected_generation_mw": detail["forecast_generation_mw"],
            "versions": detail["versions"],
            "cutoff": detail["cutoff"],
            "resolution": detail["resolution"],
        }

    @app.get("/api/export.csv", tags=["analytics"])
    async def export_csv(
        request: Request,
        start_date: date | None = Query(default=None),
        end_date: date | None = Query(default=None),
        cutoff_time: str = Query(default="09:50", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
    ) -> Response:
        start, end = _resolve_window(settings, start_date, end_date)
        analysis_request = AnalysisRequest(start, end, cutoff_time, settings.market_timezone)
        try:
            result = await service(request).get_analysis(analysis_request)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        body = intervals_csv(result)
        filename = f"aeris-wind-audit-{start.isoformat()}-{end.isoformat()}.csv"
        return Response(
            content=body,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    static_dir: Path = settings.static_dir
    index_file = static_dir / "index.html"
    if index_file.exists():
        assets_dir = static_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def spa_fallback(full_path: str) -> Response:
            if full_path.startswith("api/") or full_path == "api":
                raise HTTPException(status_code=404, detail="API route not found")
            candidate = (static_dir / full_path).resolve()
            try:
                candidate.relative_to(static_dir.resolve())
            except ValueError:
                raise HTTPException(status_code=404, detail="Not found")
            if candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(index_file)

    return app


app = create_app()
