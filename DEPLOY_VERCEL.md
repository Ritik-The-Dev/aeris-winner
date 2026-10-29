# Deploying AERIS to Vercel with Services

AERIS deploys as **one Vercel project containing two services**:

| Service | Root | Build/runtime | Public path |
|---|---|---|---|
| `backend` | `backend` | FastAPI / ASGI on Vercel Functions | `/api/*` |
| `frontend` | `frontend` | Vite static build (`dist`) | everything else |

Both services share one deployment URL and one public routing table. The frontend and API are
reached from the same origin, so the browser calls `/api/...` directly and no CORS or
`VITE_API_BASE_URL` setup is needed in production.

> Vercel Services are currently in **Beta** and are available on all plans.

---

## 1. Final `vercel.json`

The repository root contains the complete Services configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend",
      "framework": "fastapi",
      "functions": {
        "app/main.py": {
          "maxDuration": 60,
          "excludeFiles": "{tests/**,backend/tests/**,.cache/**,backend/.cache/**,**/__pycache__/**,**/*.pyc}"
        }
      }
    },
    "frontend": {
      "root": "frontend",
      "framework": "vite",
      "installCommand": "npm ci",
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "rewrites": [
        {
          "source": "/((?!@|.*\\.[^/]+$).*)",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "/assets/(.*)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

How to read it:

- `backend.root` is `backend`, where Vercel finds `app/main.py` and the FastAPI `app` instance.
  `backend/requirements.txt` supplies dependencies and `backend/.python-version` pins Python 3.13.
  The root `.python-version` is also 3.13 so `vercel dev` creates the service environment with a
  supported interpreter. The verified `backend/data/elexon-jan-2026.json.gz` snapshot is inside
  the service bundle.
- `frontend.root` is `frontend`. Vercel runs `npm ci`, then `npm run build`, and publishes
  `frontend/dist`.
- `functions` is **inside** the backend service. It is not valid at the top level in Services
  mode. The `app/main.py` key is the resolved FastAPI entrypoint file; the exclusions keep tests
  and caches out of the function bundle.
- The frontend's service-level `rewrites` rule is the SPA fallback for React Router routes such
  as `/overview`, `/windfield`, and `/method`. The negative lookahead excludes Vite's
  `@`-prefixed dev endpoints and any path with a file extension, so modules, HMR, and static
  assets are never rewritten to `index.html`. Plain app paths such as `/overview` still receive
  the SPA shell.
- The top-level `rewrites` are the only public ingress, and they are ordered most-specific first.
- The backend receives the **original** request path. A request to `/api/overview` reaches
  FastAPI as `/api/overview`, matching the existing routes with no prefix rewrite.

## 2. Routing and bindings

### Public routes

| Request | Service | Service receives |
|---|---|---|
| `GET /` | `frontend` | `/` |
| `GET /overview` | `frontend` | `/overview` |
| `GET /api/health` | `backend` | `/api/health` |
| `GET /api/overview?...` | `backend` | `/api/overview?...` |
| `GET /api/docs` | `backend` | `/api/docs` |

Both services are internal unless a top-level rewrite targets them. The backend is public only
under `/api/*`; the frontend owns every other path.

### Bindings

**No service bindings are declared.** The frontend is a static Vite bundle and does not make
server-side calls. Its browser code calls the public same-origin `/api` path, which the top-level
rewrite sends to the backend. The backend does not call the frontend.

Bindings resolve only in server-side functions at runtime, not during Vite builds and not in
browser code. Adding a `frontend -> backend` binding would not make `import.meta.env` or a
browser `fetch` work; it would only add an unused runtime variable to a static service. If the
architecture later changes so a server-side function calls another service, declare the binding
on the calling service then.

## 3. Deploy the project

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave **Root Directory** at the repository root. Do not create separate projects for
   `backend` and `frontend`; the `services` block handles both.
4. Add the environment variables below under **Settings → Environment Variables** (Production,
   and Preview if you use preview deployments).
5. Deploy.

### Environment variables

| Name | Value | Why |
|---|---|---|
| `AERIS_ENVIRONMENT` | `production` | Labels the runtime environment. |
| `AERIS_DATA_MODE` | `snapshot` | Serves the verified real Elexon snapshot and avoids a live fetch on every cold start. |
| `AERIS_ALLOW_SNAPSHOT_FALLBACK` | `true` | Keeps the demo populated if a live upstream call fails. |
| `AERIS_CACHE_DIR` | `/tmp/aeris-cache` | Writable location for optional live-mode cache files. |

Do **not** set `VITE_API_BASE_URL` for this deployment. The frontend client defaults to the
relative `/api` base, which is exactly what the shared-domain routing needs. If you set it to an
external hostname, the browser will bypass the service rewrite.

Optional server-side settings from `.env.example` are still respected. No Elexon API key is
required.

## 4. Verify the deployment

Use the single project URL:

```bash
# Frontend SPA
curl -sI https://<project>.vercel.app/ | head -n 5
curl -sI https://<project>.vercel.app/overview | head -n 5

# Backend through the public /api rewrite
curl -s https://<project>.vercel.app/api/health
curl -s "https://<project>.vercel.app/api/overview?start_date=2026-01-01&end_date=2026-01-31&cutoff_time=09:50" | head -c 500

# Interactive API docs
curl -sI https://<project>.vercel.app/api/docs | head -n 5
```

Expected results:

- `/` and `/overview` return `200` and the same Vite `index.html` shell.
- `/api/health` returns `status: "ok"`.
- `/api/overview` reports `matched_intervals: 1488`, `mae_mw: 2016.313`, and
  `bias_mw: 1729.931` when using the verified snapshot.
- The frontend header badge reads **VERIFIED SNAPSHOT**.

## 5. Run the services locally

Use the Vercel CLI so the same services configuration, routing, and build steps run locally:

```bash
npm i -g vercel
vercel dev -L
```

`-L` (or `--local`) runs without linking to a Vercel Cloud project. The local URL serves the
frontend at `/` and the backend at `/api/*`, just like production. The existing Vite proxy in
`frontend/vite.config.ts` remains available when running `npm run dev` separately.

## 6. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Vercel says `functions` is invalid | A build/runtime key is at the top level while `services` is present. Move it inside the owning service. The included config already does this. |
| `/api/*` returns the frontend or a 404 | The top-level `/api/(.*)` rewrite is missing or ordered after the catch-all. Keep it first. |
| `/overview` returns 404 on refresh | The frontend service's SPA rewrite is missing. It must rewrite unmatched paths to `/index.html` inside the `frontend` service. |
| Backend returns 500 with “snapshot is missing” | The snapshot was not included in the function bundle. Confirm `backend/data/elexon-jan-2026.json.gz` is committed and under the `backend` service root; do not exclude `data/**`. |
| Browser requests go to a different host | `VITE_API_BASE_URL` was set at build time. Remove it and redeploy the frontend service. |
| CORS errors appear | They should not occur through the shared-domain rewrite. If you call the API from a different origin, configure `AERIS_CORS_ORIGINS` and use a service binding/proxy instead. |
| First API request is slow | Serverless cold start. Snapshot mode avoids upstream retrieval; the function limit is 60 seconds. |
| `FUNCTION_INVOCATION_TIMEOUT` | Raise `maxDuration` in the backend service's `functions` entry, or stay in snapshot mode. |
| Live mode cache errors | Set `AERIS_CACHE_DIR=/tmp/aeris-cache`. Cache writes are best-effort and no longer fail the request. |
| Framework detection picks the wrong app | Set `backend.entrypoint` to `app.main:app` explicitly and redeploy. |

## 7. Deployment checklist

- [ ] `vercel.json` is at the repository root and contains both services.
- [ ] No top-level `functions`, `framework`, `buildCommand`, `installCommand`, or
      `outputDirectory` keys remain.
- [ ] `backend/requirements.txt`, `backend/.python-version`, `backend/app/main.py`, and
      `backend/data/elexon-jan-2026.json.gz` are committed.
- [ ] `frontend/package-lock.json` is committed (`npm ci` requires it).
- [ ] Environment variables above are set; `VITE_API_BASE_URL` is unset.
- [ ] Production URL returns the SPA at `/` and `/overview`, and JSON at `/api/health` and
      `/api/overview`.
- [ ] The real deployment URL is recorded in `README.md`.

## 8. Live deployment

**Live URL:** [https://aeris.ritik.biz/](https://aeris.ritik.biz/)

The production deployment was verified at this URL: `/` and `/overview` return the SPA,
`/api/health` returns `200`, `/api/docs` returns `200`, and `/api/overview` returns MAE
**2,016.313 MW** with **1,488 matched intervals**.
