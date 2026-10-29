import { Archive, CloudDownload, Database } from 'lucide-react';
import type { SourceInfo } from '../../api/types';
import { formatDateTimeFull } from '../../lib/format';

const CONFIG = {
  elexon_live: {
    label: 'Elexon live',
    detail: 'Fetched directly from Elexon BMRS for this session',
    tone: 'border-teal-300/25 bg-teal-300/10 text-teal-200',
    dot: 'bg-teal-300',
    Icon: CloudDownload,
  },
  elexon_cache: {
    label: 'Elexon cached',
    detail: 'Served from a previously fetched Elexon response',
    tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    dot: 'bg-amber-400',
    Icon: Database,
  },
  verified_snapshot: {
    label: 'Verified snapshot',
    detail: 'Bundled, verified Elexon data. Not a fresh upstream response',
    tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    dot: 'bg-amber-400',
    Icon: Archive,
  },
} as const;

export function SourceBadge({ source, compact = false }: { source: SourceInfo; compact?: boolean }) {
  const config = CONFIG[source.origin as keyof typeof CONFIG] ?? CONFIG.elexon_cache;
  const { Icon } = config;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.14em] ${config.tone}`}
      title={`${config.detail}. Fetched ${formatDateTimeFull(source.fetched_at)} Europe/London.`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      <Icon size={11} strokeWidth={1.8} aria-hidden="true" />
      <span>{config.label}</span>
      {!compact && (
        <span className="hidden text-[0.55rem] tracking-normal opacity-70 sm:inline">
          {formatDateTimeFull(source.fetched_at)}
        </span>
      )}
    </span>
  );
}
