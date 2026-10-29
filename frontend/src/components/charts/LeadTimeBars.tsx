import type { LeadTime } from '../../api/types';
import { formatNumber } from '../../lib/format';

export function LeadTimeBars({ leadTime }: { leadTime: LeadTime }) {
  const max = Math.max(...leadTime.buckets.map((bucket) => bucket.count), 1);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-paper/10 pb-3">
        <div>
          <p className="label text-dim">Median lead</p>
          <p className="mt-1 font-mono text-xl text-paper">
            {leadTime.median_hours !== null ? `${formatNumber(leadTime.median_hours, 1)}h` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="label text-dim">Range</p>
          <p className="mt-1 font-mono text-xs text-mist">
            {leadTime.min_hours !== null ? `${formatNumber(leadTime.min_hours, 1)}h` : '—'} –{' '}
            {leadTime.max_hours !== null ? `${formatNumber(leadTime.max_hours, 1)}h` : '—'}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {leadTime.buckets.map((bucket) => (
          <div key={bucket.label} className="grid grid-cols-[4.6rem_1fr_2.5rem] items-center gap-2">
            <span className="font-mono text-[0.6rem] tracking-[0.03em] text-dim">{bucket.label}</span>
            <span className="h-1.5 bg-paper/5">
              <span
                className="block h-full bg-teal-500/75"
                style={{ width: `${(bucket.count / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-[0.62rem] tabular-nums text-mist">
              {formatNumber(bucket.count)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-paper/10 pt-3 text-[0.68rem] leading-relaxed text-dim">
        Lead time is interval start minus the selected WINDFOR publication time. Negative values
        are impossible for eligible forecasts and would indicate a selection defect.
      </p>
    </div>
  );
}
