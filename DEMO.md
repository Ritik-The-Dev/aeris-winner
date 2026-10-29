# AERIS — 10-minute demo script

**Format:** two parts, recorded screen + voice, no more than 10:00.
**Target runtime:** 9:30, leaving 30 seconds of safety.
**Thesis:** *The forecast did not just miss. It ran high — and this tool shows exactly which
forecast the desk could have seen when it made the call.*

> This file is the recording plan. No video has been uploaded yet. After recording, add the
> unlisted YouTube URL to the README and the submission form.

---

## Before recording

1. Start in deterministic snapshot mode so the numbers cannot move mid-take:

   ```powershell
   $env:AERIS_DATA_MODE = "snapshot"
   .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000
   ```

2. In a second terminal:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:5173` at 1440 × 900, browser zoom 100%, bookmarks bar hidden.
4. Confirm the badge reads **VERIFIED SNAPSHOT**, coverage **100%**, MAE **2,016 MW**.
5. Close other tabs and notifications. Do a 15-second test take for audio and legibility.
6. Have `docs/` screenshots open in a second window as an emergency fallback.

**If recording the production container instead**, run `docker compose up --build` and use
`http://localhost:8000`. The UI and numbers are identical.

---

## Part I — The measurement problem (0:00–3:45)

### 0:00–0:25 — Open cold on the result

**Screen:** landing page, hero and KPI strip.

**Say:**
> "This is AERIS. It audits January 2026 national wind forecasts for a GB day-ahead purchasing
> desk. Over 1,488 matched half-hours, the forecast was wrong by 2,016 megawatts on average —
> and it was biased high by 1,730 megawatts. This is not a dashboard of everything. It is an
> answer to one question: what could the desk have known, and how wrong was it?"

Do not read every KPI. Point at MAE, bias, and coverage once.

### 0:25–0:55 — Why the question is hard

**Screen:** scroll to the three-step chain: publication → cutoff → delivery.

**Say:**
> "The naive version of this is easy and wrong: compare today's latest forecast with what
> happened. That leaks future information. WINDFOR publishes eight vintages a day, and each
> target hour accumulates a stack of them. The audit has to choose a version at a specific
> decision time, then live with that choice."

### 0:55–1:45 — The cutoff is an assumption, stated plainly

**Screen:** click **HOW THE CUTOFF WORKS**; or `/method`, cutoff section.

**Say:**
> "The brief did not give a cutoff, so I did not invent an official one. I used 09:50
> Europe/London — the published N2EX day-ahead auction gate closure — as a configurable,
> market-informed assumption. The app says that in the UI and the API. Change the cutoff and
> the eligible vintage set changes with it."

Point out that publication, cutoff, delivery, and retrieval are four distinct times.

### 1:45–2:35 — Selection and the vintage trail

**Screen:** `/intervals`, open any row to show the inspector. Highlight eligible vs excluded
versions and the selected timestamp.

**Say:**
> "For every target hour: keep only rows published at or before the cutoff, then take the
> latest publish time. Ties break deterministically. Every other version is still shown here,
> greyed out as unavailable at the decision. That is the no-look-ahead guarantee made visible,
> not just asserted."

### 2:35–3:10 — Hourly forecast, half-hourly outturn

**Screen:** inspector's resolution note, or `/method` bridge section.

**Say:**
> "WINDFOR is hourly. FUELHH is half-hourly. I hold each hourly value across both half-hours in
> that hour. No interpolation, no synthetic values. Missing data is never zero-filled: an
> interval only enters the metrics when both a selected forecast and an actual exist, and the
> missing counts are published alongside."

### 3:10–3:45 — The headline, earned

**Screen:** `/overview`, KPI row.

**Say:**
> "That gives 100% coverage and the result: MAE 2,016, RMSE 2,510, bias plus 1,730 megawatts.
> The sign convention is forecast minus actual, so positive means overforecast. The forecast ran
> high all month — that is a purchasing exposure, not noise."

**Transition:** "Part two is the evidence behind that sentence."

---

## Part II — The evidence and the product (3:45–9:30)

### 3:45–5:00 — Overview: a day and a month

**Screen:** `/overview`; use the delivery-day selector and the **WEEK 1** preset, then back to
**JANUARY**.

**Say:**
> "The overview starts at one delivery day so the shape is legible: the dashed forecast sits
> above the solid outturn for most of 15 January, and the bars below are signed error. The
> right panel is the decision anchor: cutoff, selected vintage, median lead time, and the
> interval count. The month strip aggregates by delivery day, and the largest-miss table makes
> 12 January impossible to miss — 6.9 gigawatts at 01:00."

**Action:** click the 12 January bar to jump there, then restore January. Do not spend time on
every chart.

### 5:00–6:10 — Wind field: the shape of the miss

**Screen:** `/windfield`.

**Say:**
> "Aggregates hide structure, so the wind field turns the month into ridges: one ridge per
> delivery day, actual surface height, amber wireframe for the forecast, colour for signed error.
> You can see the forecast surface sitting above outturn, and the deep cuts where the miss
> spikes. Drag to orbit; click a day to load its half-hour strip."

**Action:** orbit once, click 12 January, point at the error strip.

**Say:**
> "This is a real Three.js scene, but it is not the only way in. The GRID toggle gives the same
> data as an accessible table, and reduced-motion disables the animation. The 3D is an
> affordance, not a gate."

Click **GRID** once, then back to **3D**.

### 6:10–7:10 — Accuracy: where and when it hurt

**Screen:** `/accuracy`.

**Say:**
> "The histogram shows the distribution is shifted right: more mass on overforecast. Lead time
> shows the selected vintages are mostly 24 to 42 hours ahead, so this is genuine day-ahead
> exposure. The diurnal profile shows the bias persisting through the day, not cancelling out.
> And the audit counts below explain exactly what entered the arithmetic: 22,192 forecast rows,
> 16,864 eligible versions, 19,344 post-cutoff versions excluded, zero filled values."

### 7:10–8:20 — Interval ledger: the audit trail

**Screen:** `/intervals`.

**Say:**
> "Every number is traceable. The ledger has all 1,488 intervals: delivery time, forecast,
> actual, signed error, absolute error, lead time, and status. Sort by absolute error to see the
> worst misses, filter by delivery day, or filter to missing data. Open a row and the global
> inspector follows you across the app."

**Action:** sort by absolute error descending, open the top row, show the vintage trail, close.
Then click **NO FORECAST** to show the explicit empty state (do not leave it there).

**Say:**
> "An empty state is a finding, not a zero. That distinction is enforced end to end."

### 8:20–8:50 — Export and reproducibility

**Screen:** click **CSV** (one download), then `/method`.

**Say:**
> "The CSV exports the full selected window, including missing rows and flags — 1,488 rows for
> January. The backend rebuilds every figure from source rows; the bundled snapshot is real
> Elexon data with a published checksum, used only as a labelled fallback. There are 40 backend
> tests and 15 frontend tests, and the Docker image was built and smoke-tested in production
> mode."

### 8:50–9:30 — Limits and close

**Screen:** `/method`, limits section.

**Say:**
> "What this is not: not a trading strategy, not a price model, not an official Elexon or N2EX
> product. It is a defensible measurement of day-ahead wind forecast error at a stated decision
> time. The cutoff is configurable because the client may have a different gate. The method is
> on the page, the data provenance is on the page, and the AI disclosure is on the page.
> AERIS: a month of wind, held to account."

Stop on the landing page or the method page. Do not fade to black mid-sentence.

---

## Timing guardrails

| Section | Budget | Hard stop |
|---|---:|---:|
| Part I | 3:45 | 4:00 |
| Overview | 1:15 | 5:15 |
| Wind field | 1:10 | 6:25 |
| Accuracy | 1:00 | 7:25 |
| Ledger + inspector | 1:10 | 8:35 |
| Export + method | 0:30 | 9:05 |
| Close | 0:40 | 9:45 |

If running long, cut in this order:

1. The **NO FORECAST** empty-state click.
2. The **GRID** toggle demonstration (mention it instead).
3. The **WEEK 1** preset (stay on January).
4. The CSV download (say the row count).

Never cut: the cutoff assumption, the vintage trail, the bias interpretation, or the limits.

---

## Fallback plan

| Failure | Recovery |
|---|---|
| Elexon is slow or down | Use snapshot mode before recording. The badge must say **VERIFIED SNAPSHOT**; explain that it is real Elexon data, not synthetic. |
| WebGL unavailable | Click **GRID** and continue. The fallback is part of the story. |
| Three.js scene is blank | Reload once; if still blank, use GRID and keep moving. |
| App will not start | `docker compose up --build`, then use `http://localhost:8000`. |
| Live data changes the numbers | Do not refresh mid-take. Snapshot mode is deterministic. |
| Recording overruns | Stop after the ledger/inspector; move limits to a caption or the README. |
| Total failure | Record a narration over the `docs/` screenshots. State that it is a screenshot walkthrough. |

---

## Recording checklist

- [ ] Snapshot mode, badge verified, coverage 100%.
- [ ] 1440 × 900, 100% zoom, no notifications.
- [ ] Test audio levels; speak at a measured pace.
- [ ] Show the cursor only when it is doing something meaningful.
- [ ] No dead air while a chart loads; the first load can take a second.
- [ ] Keep the cursor away from the 3D canvas when not orbiting.
- [ ] Final duration ≤ 10:00.
- [ ] Upload as **Unlisted**, captions on, then add the URL to the README.
- [ ] Do not claim a public deployment that has not happened.

---

## One-sentence close (use verbatim if needed)

> "AERIS does not just report that January's wind forecast was wrong — it shows which forecast
> the desk could have seen, holds it to the outturn, and makes every excluded vintage visible."
