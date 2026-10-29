import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowUpRight, Bot, Clock3, Database } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { useReveal } from '../../hooks/useReveal';
import { formatDateTimeFull, formatNumber } from '../../lib/format';
import { SourceBadge } from '../ui/SourceBadge';

const SECTIONS = [
  { id: 'scope', label: 'Scope' },
  { id: 'january', label: 'January window' },
  { id: 'times', label: 'Four times' },
  { id: 'cutoff', label: 'Cutoff' },
  { id: 'selection', label: 'Selection' },
  { id: 'resolution', label: 'Resolution' },
  { id: 'missing', label: 'Missing data' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'provenance', label: 'Provenance' },
  { id: 'limits', label: 'Limits' },
  { id: 'ai', label: 'AI disclosure' },
];

export function MethodPage() {
  const { data } = useAnalysis();
  const reveal = useReveal('method');
  const source = data?.source;
  const cutoff = data?.cutoff;

  return (
    <div ref={reveal} className="mx-auto max-w-[1560px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header className="max-w-5xl" data-reveal>
        <p className="eyebrow">Method / 05</p>
        <h1 className="mt-3 max-w-[19ch] font-display text-[clamp(3rem,7vw,6.2rem)] leading-[0.88] tracking-[-0.035em] text-paper">
          The method behind <span className="italic text-teal-200/85">the number.</span>
        </h1>
        <p className="mt-6 max-w-[64ch] text-[0.98rem] leading-relaxed text-mist">
          A forecast audit is only as credible as the information boundary it respects.
          This page states the window, the cutoff, the selection rule, the resolution bridge
          and the arithmetic in full — including what is an assumption rather than a fact.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {source && <SourceBadge source={source} />}
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">
            v1.0.0 · Europe/London · audited against Elexon BMRS
          </span>
        </div>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 border-l border-paper/10 pl-4" aria-label="Method sections">
            <p className="label text-dim">On this page</p>
            <ol className="mt-4 space-y-2.5">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-baseline gap-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim transition-colors hover:text-teal-200"
                  >
                    <span className="text-[0.52rem] text-teal-400/55">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 max-w-4xl space-y-16">
          <Section id="scope" index="01" title="Scope and the question">
            <p>
              AERIS audits the accuracy of national Great Britain wind generation
              forecasts used for day-ahead purchasing decisions. It is deliberately narrow:
              one fuel type, one country, one month, one market-informed decision cutoff.
            </p>
            <p>
              The question is not &ldquo;which model is best?&rdquo; It is: <em>given only the
              information a purchasing desk could have seen at its cutoff, how close was the
              selected WINDFOR vintage to the wind that actually arrived?</em> No financial
              optimisation, procurement strategy or intraday trading is modelled.
            </p>
            <div className="mt-6 grid gap-px bg-paper/10 sm:grid-cols-3">
              <Fact label="Fuel" value="WIND" note="Elexon FUELHH filter" />
              <Fact label="Geography" value="Great Britain" note="national aggregate" />
              <Fact label="Forecast" value="WINDFOR" note="Elexon BMRS" />
            </div>
          </Section>

          <Section id="january" index="02" title="January is the decision window">
            <p>
              The brief supplies January 2026 as purchasing-decision data. A decision made
              on day <span className="font-mono text-paper">d</span> purchases for the
              following delivery day <span className="font-mono text-paper">d + 1</span>.
              AERIS therefore treats <strong className="font-medium text-paper">1–31 January
              2026 as decision dates</strong>, mapping them to delivery days{' '}
              <strong className="font-medium text-paper">2 January–1 February 2026</strong>.
            </p>
            <div className="mt-5 grid gap-px bg-paper/10 sm:grid-cols-2">
              <Fact
                label="Decision dates"
                value={data ? `${data.window.decision_start} → ${data.window.decision_end}` : '2026-01-01 → 2026-01-31'}
                note="purchase is struck"
              />
              <Fact
                label="Delivery dates"
                value={data ? `${data.window.delivery_start} → ${data.window.delivery_end}` : '2026-01-02 → 2026-02-01'}
                note="wind is delivered"
              />
            </div>
            <p className="mt-5 text-sm text-mist/80">
              This is an interpretation, not a claim about the client&apos;s actual settlement
              calendar. It is stated in the API, the UI and the exported CSV so the window can
              be challenged and changed.
            </p>
          </Section>

          <Section id="times" index="03" title="Four different times">
            <p>
              Most forecast-audit errors hide in timezone or timestamp semantics. AERIS keeps
              four times distinct, stores everything in UTC internally, and renders
              Europe/London wall-clock time in the interface.
            </p>
            <div className="mt-5 space-y-3">
              <TimeRow
                label="Publication"
                value="WINDFOR publishTime"
                body="When Elexon made the forecast vintage available. This is the only time used to decide eligibility."
              />
              <TimeRow
                label="Cutoff"
                value={cutoff ? `${cutoff.time} ${cutoff.timezone}` : '09:50 Europe/London'}
                body="The instant after which new information is treated as unavailable to the desk. Converted to an absolute UTC instant per decision date."
              />
              <TimeRow
                label="Delivery"
                value="interval startTime"
                body="The half-hour being forecast and, separately, the FUELHH outturn interval. Displayed in local time; the API carries UTC offsets."
              />
              <TimeRow
                label="Retrieval"
                value={source ? formatDateTimeFull(source.fetched_at) : 'at request time'}
                body="When this application fetched or loaded the data. Never used as a proxy for publication time."
              />
            </div>
            <Note icon={Clock3} title="DST handling">
              The cutoff is constructed as a local wall-clock time on the decision date and
              converted with the IANA <span className="font-mono text-paper">Europe/London</span>{' '}
              zone, so GMT/BST transitions are resolved by the timezone database rather than
              by a fixed offset. January sits in GMT, but the code path is DST-safe and tested.
            </Note>
          </Section>

          <Section id="cutoff" index="04" title="The cutoff is an assumption, stated plainly">
            <p>
              The default cutoff is <strong className="font-medium text-paper">09:50
              Europe/London on the decision date</strong>. It is aligned with the published
              N2EX day-ahead auction gate closure, a plausible point by which a GB purchasing
              desk would have committed its day-ahead position.
            </p>
            <div className="mt-5 border-l-2 border-amber-400/60 bg-amber-400/[0.04] p-4">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-amber-200">
                Important distinction
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                This is a <strong className="font-medium text-paper">market-informed
                assumption for the pilot</strong>. It is not an official Elexon rule, not a
                rule supplied by the client, and not a claim about the client&apos;s internal
                gate. It is configurable in the interface and through the API.
              </p>
            </div>
            <p className="mt-5">
              A cutoff of 09:50 means the 09:30 WINDFOR run is eligible and the 11:30 run is
              not. The app makes that boundary visible on every interval rather than burying it
              in code.
            </p>
            {cutoff?.source && (
              <p className="mt-4 text-sm text-mist/85">
                Basis for the default:{' '}
                <a
                  className="text-teal-200 underline decoration-teal-500/40 underline-offset-4 hover:text-teal-100"
                  href={cutoff.source}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Nord Pool — About the N2EX day-ahead auction
                </a>
                . Read the primary source; do not treat this app as the authority.
              </p>
            )}
            <div className="mt-5 overflow-x-auto">
              <table className="method-table">
                <thead>
                  <tr>
                    <th>Assumption</th>
                    <th>Default</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Decision-day cutoff</td>
                    <td className="font-mono text-teal-200">09:50 London</td>
                    <td>N2EX day-ahead gate closure; configurable</td>
                  </tr>
                  <tr>
                    <td>Decision → delivery</td>
                    <td className="font-mono">d → d + 1</td>
                    <td>Day-ahead purchase interpretation</td>
                  </tr>
                  <tr>
                    <td>Forecast eligibility</td>
                    <td className="font-mono">publish ≤ cutoff</td>
                    <td>Strict no-look-ahead boundary</td>
                  </tr>
                  <tr>
                    <td>Vintage choice</td>
                    <td className="font-mono">latest eligible</td>
                    <td>Best information legally available at cutoff</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="selection" index="05" title="Forecast selection, step by step">
            <ol className="method-steps">
              <li>
                <span>01</span>
                Group WINDFOR rows by their target hour, derived from{' '}
                <span className="font-mono text-paper">startTime</span> in UTC.
              </li>
              <li>
                <span>02</span>
                For a given delivery interval, discard any row whose{' '}
                <span className="font-mono text-paper">publishTime</span> is later than the
                decision cutoff.
              </li>
              <li>
                <span>03</span>
                From the remaining eligible rows, select the greatest{' '}
                <span className="font-mono text-paper">publishTime</span>. That is the vintage
                the desk could have used.
              </li>
              <li>
                <span>04</span>
                Exact <span className="font-mono text-paper">(publishTime, startTime)</span>{' '}
                duplicates collapse deterministically to the last row in API order; conflicting
                values are counted and disclosed in data quality.
              </li>
              <li>
                <span>05</span>
                Every other vintage remains visible in the interval inspector, explicitly marked
                available or after cutoff. Nothing is deleted from the audit trail.
              </li>
            </ol>
            <p className="mt-5">
              The number of eligible and ignored versions is reported per interval and across
              the run. A missing eligible vintage is a missing forecast, never a zero.
            </p>
            <div className="mt-5 grid gap-px bg-paper/10 sm:grid-cols-3">
              <Fact
                label="Candidates"
                value={data ? formatNumber(data.data_quality.forecast_versions_considered) : '—'}
                note="rows in scope"
              />
              <Fact
                label="Eligible"
                value={data ? formatNumber(data.data_quality.eligible_forecast_versions) : '—'}
                note="at or before cutoff"
              />
              <Fact
                label="Ignored"
                value={data ? formatNumber(data.data_quality.post_cutoff_versions_ignored) : '—'}
                note="after cutoff"
              />
            </div>
          </Section>

          <Section id="resolution" index="06" title="Hourly forecast, half-hourly outturn">
            <p>
              WINDFOR is natively hourly. FUELHH is half-hourly. AERIS does not interpolate,
              smooth or synthesise a half-hourly forecast. Instead, each hourly value is held
              across both half-hour delivery intervals inside that hour.
            </p>
            <div className="mt-5 grid gap-px bg-paper/10 sm:grid-cols-2">
              <Fact label="Forecast resolution" value="60 min" note="WINDFOR target hour" />
              <Fact label="Outturn resolution" value="30 min" note="FUELHH settlement period" />
            </div>
            <p className="mt-5">
              This is a transparent bridge, not a claim that the forecast has genuine
              half-hourly resolution. It preserves the published value and avoids inventing
              detail. The second half-hour in each hour is flagged in the ledger.
            </p>
          </Section>

          <Section id="missing" index="07" title="Missing data, zero outturn and units">
            <p>
              A missing forecast and a missing actual are different states. The UI and the
              CSV carry both, and the metrics only use intervals where both sides are present.
              A zero is a legitimate observed value; a blank is not.
            </p>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-mist">
              <li>• Missing values are never replaced with zero or an average.</li>
              <li>• Intervals are keyed by exact half-hour start; no mismatched interval is joined.</li>
              <li>• Zero actuals are retained in MAE, RMSE, bias and WAPE, but excluded from the MAPE denominator.</li>
              <li>• Generation is in MW on both sides; no unit conversion is silently applied.</li>
              <li>• Sign convention is fixed: <span className="font-mono text-paper">error = forecast − actual</span>.</li>
            </ul>
            {data && (
              <div className="mt-5 grid gap-px bg-paper/10 sm:grid-cols-4">
                <Fact label="Matched" value={formatNumber(data.metrics.matched_intervals)} note="both sides present" />
                <Fact label="No forecast" value={formatNumber(data.metrics.missing_forecast)} note="eligible vintage absent" />
                <Fact label="No actual" value={formatNumber(data.metrics.missing_actual)} note="outturn absent" />
                <Fact label="Missing both" value={formatNumber(data.metrics.missing_both)} note="neither" />
              </div>
            )}
          </Section>

          <Section id="metrics" index="08" title="The arithmetic">
            <div className="space-y-4">
              <Formula
                title="MAE"
                formula="MAE = (1/n) Σ |forecastᵢ − actualᵢ|"
                body="Average absolute miss in MW. Interpretable, but treats a large miss and several small ones symmetrically."
              />
              <Formula
                title="RMSE"
                formula="RMSE = √((1/n) Σ (forecastᵢ − actualᵢ)²)"
                body="Same units, heavier penalty on large errors. Compare with MAE to see tail behaviour."
              />
              <Formula
                title="Bias"
                formula="bias = (1/n) Σ (forecastᵢ − actualᵢ)"
                body="Signed mean error. Positive means the forecast was higher than outturn. Bias can be zero while errors are large."
              />
              <Formula
                title="MAPE / WAPE"
                formula="MAPE = (1/n) Σ |eᵢ| / |actualᵢ| × 100 · WAPE = Σ|eᵢ| / Σ|actualᵢ| × 100"
                body="Scale-free summaries. MAPE excludes zero actuals; WAPE uses total actual generation and is more stable for this series."
              />
              <Formula
                title="P90 / coverage"
                formula="P90 = 90th percentile of |eᵢ| · coverage = matched / expected"
                body="Tail exposure and the share of expected intervals that could actually be scored. Coverage is not accuracy."
              />
            </div>
            <p className="mt-5 text-sm text-mist/80">
              Percentiles use the nearest-rank method. All displayed values are rounded for
              presentation; the API carries three decimal places and the CSV carries the raw
              interval values.
            </p>
          </Section>

          <Section id="provenance" index="09" title="Where the data came from">
            <p>
              Both series are pulled from Elexon BMRS Insights, which requires no API key.
              Historical retrieval uses the bounded{' '}
              <span className="font-mono text-paper">/datasets/&#123;code&#125;</span> endpoints
              with explicit date ranges. The <span className="font-mono text-paper">/stream</span>{' '}
              endpoints return only the latest publication and ignore ranges, so they are not
              suitable for this audit.
            </p>
            <div className="mt-5 space-y-3">
              <SourceRow
                name="FUELHH"
                detail="startTime · generation · fuelType=WIND"
                endpoint="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH"
              />
              <SourceRow
                name="WINDFOR"
                detail="startTime · publishTime · generation"
                endpoint="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR"
              />
            </div>
            <p className="mt-5">
              Requests are chunked to respect the API&apos;s seven-day range limit. Date-only
              upper bounds are widened to the end of day; a date-only{' '}
              <span className="font-mono text-paper">publishDateTimeTo</span> is midnight
              and would otherwise silently drop the final day. Responses are cached briefly
              and normalised before analysis.
            </p>
            {source && (
              <div className="mt-5 border border-paper/10 bg-ink-900/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Database size={13} className="text-teal-300" aria-hidden="true" />
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-mist">
                      Current source
                    </span>
                  </div>
                  <SourceBadge source={source} />
                </div>
                <dl className="mt-3 grid gap-2 text-[0.64rem] leading-relaxed text-dim sm:grid-cols-2">
                  <div>
                    <dt className="font-mono uppercase tracking-[0.1em]">Origin</dt>
                    <dd className="mt-0.5 font-mono text-mist">{source.origin}</dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-[0.1em]">Fetched</dt>
                    <dd className="mt-0.5 font-mono text-mist">{formatDateTimeFull(source.fetched_at)}</dd>
                  </div>
                  {source.snapshot_sha256 && (
                    <div className="sm:col-span-2">
                      <dt className="font-mono uppercase tracking-[0.1em]">Snapshot SHA-256</dt>
                      <dd className="mt-0.5 break-all font-mono text-mist">{source.snapshot_sha256}</dd>
                    </div>
                  )}
                  {source.fallback_reason && (
                    <div className="sm:col-span-2">
                      <dt className="font-mono uppercase tracking-[0.1em]">Fallback reason</dt>
                      <dd className="mt-0.5 font-mono text-mist">{source.fallback_reason}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 border-t border-paper/10 pt-3 text-[0.64rem] leading-relaxed text-dim">
                  The bundled snapshot is real, verified Elexon data — not synthetic filler.
                  When it is used, the UI labels it as a snapshot, not a live feed.
                </p>
              </div>
            )}
          </Section>

          <Section id="limits" index="10" title="Limits and what is not claimed">
            <ul className="space-y-3 text-sm leading-relaxed text-mist">
              <li>
                • The 09:50 cutoff is an assumption. A different cutoff changes which vintage
                is selected and therefore every metric.
              </li>
              <li>
                • National wind is not a tradable unit by itself. This audit does not model
                basis risk, imbalance prices, storage or portfolio positions.
              </li>
              <li>
                • WINDFOR&apos;s hourly target is bridged to half-hours by holding. That is
                transparent but not a claim of native resolution.
              </li>
              <li>
                • The results describe January 2026. They are not a forecast of future model
                performance and should not be extrapolated without new evidence.
              </li>
              <li>
                • No claim is made that Elexon, N2EX or the client endorses this methodology.
              </li>
            </ul>
          </Section>

          <Section id="ai" index="11" title="AI disclosure and reproducibility">
            <div className="border border-teal-500/25 bg-teal-500/[0.035] p-5">
              <div className="flex items-start gap-3">
                <Bot size={18} className="mt-0.5 shrink-0 text-teal-300" aria-hidden="true" />
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-teal-200">
                    Built with an AI coding agent
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-mist">
                    This application was built with <strong className="font-medium text-paper">OpenCode</strong>{' '}
                    using the <strong className="font-medium text-paper">DeepSeek V4.1 Flash Free</strong>{' '}
                    model, with human review of the data interpretation, cutoff assumption,
                    UI and final submission. AI assistance is disclosed rather than hidden.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-mist">
              The repository contains backend unit tests for timezone boundaries, cutoff
              inclusivity, duplicate collapse, missing data, zero actuals, empty datasets and
              API errors, plus a reproducible snapshot builder. The README records exact
              commands for the API, the frontend, Docker and tests.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/overview" className="btn-primary">
                Return to the audit
              </Link>
              <Link to="/intervals" className="btn-outline">
                Inspect an interval
              </Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24" data-reveal>
      <div className="flex items-baseline gap-3 border-b border-paper/10 pb-3">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-teal-400/70">{index}</span>
        <h2 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-paper">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4 text-[0.92rem] leading-relaxed text-mist">{children}</div>
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-ink-900/45 px-4 py-3.5">
      <p className="label text-dim">{label}</p>
      <p className="mt-2 font-mono text-[0.8rem] text-paper">{value}</p>
      <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-dim">{note}</p>
    </div>
  );
}

function TimeRow({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="grid gap-2 border-l border-paper/15 pl-4 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-teal-200">{label}</p>
      <div>
        <p className="font-mono text-[0.7rem] text-paper">{value}</p>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-mist/85">{body}</p>
      </div>
    </div>
  );
}

function Note({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock3;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 flex items-start gap-3 border border-paper/10 bg-ink-900/35 p-4">
      <Icon size={15} className="mt-0.5 shrink-0 text-teal-300" aria-hidden="true" />
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-mist">{title}</p>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-dim">{children}</p>
      </div>
    </div>
  );
}

function Formula({
  title,
  formula,
  body,
}: {
  title: string;
  formula: string;
  body: string;
}) {
  return (
    <div className="border border-paper/10 bg-ink-900/35 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-paper">{title}</h3>
        <code className="font-mono text-[0.72rem] text-teal-200">{formula}</code>
      </div>
      <p className="mt-2 text-[0.8rem] leading-relaxed text-dim">{body}</p>
    </div>
  );
}

function SourceRow({
  name,
  detail,
  endpoint,
}: {
  name: string;
  detail: string;
  endpoint: string;
}) {
  return (
    <div className="flex flex-col gap-2 border border-paper/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-paper">{name}</p>
        <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-dim">{detail}</p>
      </div>
      <a
        href={endpoint}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] text-teal-200 hover:text-teal-100"
      >
        BMRS endpoint
        <ArrowUpRight size={11} aria-hidden="true" />
      </a>
    </div>
  );
}

// The page closes here; interactive routes remain in the header and footer.

