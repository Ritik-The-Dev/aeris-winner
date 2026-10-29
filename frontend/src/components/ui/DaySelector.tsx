import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyPoint } from '../../api/types';
import { shiftDay } from '../../lib/analysis';
import { formatDate } from '../../lib/format';

export function DaySelector({
  daily,
  value,
  onChange,
  label = 'Delivery day',
}: {
  daily: DailyPoint[];
  value: string;
  onChange: (day: string) => void;
  label?: string;
}) {
  if (!daily.length) return null;
  const index = daily.findIndex((point) => point.delivery_date === value);
  return (
    <div className="flex flex-col gap-2">
      <span className="label text-dim">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(shiftDay(daily, value, -1))}
          disabled={index <= 0}
          aria-label="Previous delivery day"
        >
          <ChevronLeft size={14} />
        </button>
        <label className="sr-only" htmlFor="delivery-day-input">
          Delivery day
        </label>
        <input
          id="delivery-day-input"
          type="date"
          className="field w-[9.1rem] font-mono text-[0.7rem]"
          min={daily[0]?.delivery_date}
          max={daily[daily.length - 1]?.delivery_date}
          value={value}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(shiftDay(daily, value, 1))}
          disabled={index < 0 || index >= daily.length - 1}
          aria-label="Next delivery day"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <span className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-dim">
        {formatDate(`${daily[0]?.delivery_date}T12:00:00Z`)} –{' '}
        {formatDate(`${daily[daily.length - 1]?.delivery_date}T12:00:00Z`)}
      </span>
    </div>
  );
}
