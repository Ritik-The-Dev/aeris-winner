export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M3 23.5c5.6 0 5.8-14 11.7-14 4.4 0 5.2 10.5 9.6 10.5 2.1 0 3.2-1.8 4.7-4"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          className="text-teal-300"
        />
        <path
          d="M3 16.2c4.1 0 4.7-7.3 8.7-7.3 3.5 0 4.2 8.4 8.1 8.4 2.7 0 3.7-4 6.2-4"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-paper/55"
        />
        <path
          d="M3 8.4c2.7 0 3.2-2.6 5.4-2.6"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-paper/30"
        />
        <circle cx="27.8" cy="23.5" r="1.5" fill="currentColor" className="text-teal-300" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-sans text-[0.98rem] font-semibold tracking-[0.26em] text-paper">
            AERIS
          </span>
          <span className="mt-1 font-mono text-[0.52rem] uppercase tracking-[0.24em] text-dim">
            Wind intelligence
          </span>
        </span>
      )}
    </span>
  );
}
