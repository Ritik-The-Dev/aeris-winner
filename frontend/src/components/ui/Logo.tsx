export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-paper text-ink-950 shadow-soft">
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="M3 23.5c5.6 0 5.8-14 11.7-14 4.4 0 5.2 10.5 9.6 10.5 2.1 0 3.2-1.8 4.7-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-ink-950"
          />
          <path
            d="M3 16.2c4.1 0 4.7-7.3 8.7-7.3 3.5 0 4.2 8.4 8.1 8.4 2.7 0 3.7-4 6.2-4"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            className="text-ink-950/55"
          />
          <path
            d="M3 8.4c2.7 0 3.2-2.6 5.4-2.6"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            className="text-ink-950/30"
          />
          <circle cx="27.8" cy="23.5" r="1.7" fill="currentColor" className="text-lime" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-sans text-[1.02rem] font-extrabold tracking-[0.22em] text-paper">
            AERIS
          </span>
          <span className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-dim">
            Wind intelligence
          </span>
        </span>
      )}
      {compact && <span className="sr-only">AERIS</span>}
    </span>
  );
}
