# AERIS runtime image: build the React app, then serve it from FastAPI.
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AERIS_ENVIRONMENT=production \
    AERIS_DATA_MODE=live \
    AERIS_ALLOW_SNAPSHOT_FALLBACK=true \
    AERIS_STATIC_DIR=/app/static \
    AERIS_CACHE_DIR=/tmp/aeris-cache

WORKDIR /app

RUN addgroup --system aeris && adduser --system --ingroup aeris aeris

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY --from=frontend-build /build/frontend/dist ./static

RUN mkdir -p /tmp/aeris-cache && chown -R aeris:aeris /app /tmp/aeris-cache

USER aeris
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
