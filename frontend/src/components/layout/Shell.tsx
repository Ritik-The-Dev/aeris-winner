import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { SourceBadge } from '../ui/SourceBadge';
import { FilterBar } from './FilterBar';
import { useAnalysis } from '../../context/AnalysisContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { Inspector } from '../intervals/Inspector';

const NAV = [
  { to: '/overview', label: 'Overview', index: '01' },
  { to: '/windfield', label: 'Wind field', index: '02' },
  { to: '/accuracy', label: 'Accuracy', index: '03' },
  { to: '/intervals', label: 'Intervals', index: '04' },
  { to: '/method', label: 'Method', index: '05' },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [pathname, reduced]);
  return null;
}

function TopBar() {
  const { data } = useAnalysis();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-[1560px]">
        <div className="flex h-[4.35rem] items-center gap-3 rounded-[1.4rem] border border-paper/10 bg-ink-950/80 px-3 shadow-soft backdrop-blur-2xl sm:px-4">
          <Link to="/" className="shrink-0" aria-label="AERIS home">
            <Logo />
          </Link>

          <nav
            className="ml-2 hidden items-center gap-1 rounded-full border border-paper/10 bg-ink-900/50 p-1 lg:flex"
            aria-label="Primary"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group relative inline-flex items-center rounded-full px-3.5 py-2 font-mono text-[0.63rem] uppercase tracking-[0.12em] transition-all duration-200 ${
                    isActive
                      ? 'bg-paper text-ink-950 shadow-soft'
                      : 'text-mist hover:bg-paper/5 hover:text-paper'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`mr-1.5 text-[0.52rem] ${
                        isActive ? 'text-ink-950/55' : 'text-teal-400/80'
                      }`}
                    >
                      {item.index}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full border border-paper/10 bg-ink-900/45 px-3 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim xl:flex">
              <span
                className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-teal-300 shadow-[0_0_0_4px_rgba(43,75,242,0.1)]"
                aria-hidden="true"
              />
              GB national wind · Jan 2026
            </span>
            {data && (
              <span className="hidden md:inline-flex">
                <SourceBadge source={data.source} compact />
              </span>
            )}
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer noopener"
              className="hidden items-center gap-1 rounded-full border border-paper/10 bg-ink-900/45 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim transition-colors hover:border-teal-300/40 hover:text-teal-200 sm:inline-flex"
            >
              API
              <ArrowUpRight size={11} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="icon-button lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Close navigation' : 'Open navigation'}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id={menuId}
            className="mt-2 rounded-[1.4rem] border border-paper/10 bg-ink-950/95 p-2 shadow-lift backdrop-blur-2xl lg:hidden"
            aria-label="Mobile primary"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-[0.95rem] px-3 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors ${
                      isActive
                        ? 'bg-paper text-ink-950'
                        : 'bg-ink-900/55 text-mist hover:bg-ink-850 hover:text-paper'
                    }`
                  }
                >
                  <span className="text-[0.52rem] opacity-55">{item.index}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-paper/10 bg-ink-950/75">
      <div className="mx-auto max-w-[1560px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-mist">
              A day-ahead wind forecast audit for a Great Britain electricity purchasing
              desk. National wind only. Every interval accounted for, including the ones
              the forecast got wrong.
            </p>
            <p className="mt-5 max-w-[46ch] font-mono text-[0.6rem] leading-relaxed tracking-[0.04em] text-dim">
              Decision dates 1–31 January 2026 · delivery 2 January–1 February 2026 ·
              Europe/London.
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="label text-dim">Data</p>
            <ul className="mt-4 space-y-2.5 text-sm text-mist">
              <li>
                <a
                  className="transition-colors hover:text-teal-200"
                  href="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Elexon FUELHH — outturn
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-teal-200"
                  href="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Elexon WINDFOR — forecasts
                </a>
              </li>
              <li className="text-dim">No API key. No synthetic fallback.</li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <p className="label text-dim">Method & disclosure</p>
            <p className="mt-4 text-sm leading-relaxed text-mist">
              The 09:50 cutoff is a documented, configurable market-informed assumption.
              It is not presented as an official Elexon or client rule.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[0.6rem] uppercase tracking-[0.12em]">
              <Link to="/method" className="text-teal-200 hover:text-teal-100">
                Read the method
              </Link>
              <Link to="/intervals" className="text-dim hover:text-mist">
                Interval ledger
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-2 px-4 py-4 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>AERIS / Wind Intelligence / v1.0.0</span>
          <span>Forecast minus actual · positive means overforecast</span>
        </div>
      </div>
    </footer>
  );
}

export function Shell() {
  const location = useLocation();
  const showFilters = !['/', '/method'].includes(location.pathname);

  return (
    <div className="relative flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollToTop />
      <TopBar />
      {showFilters && <FilterBar />}
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Inspector />
    </div>
  );
}
