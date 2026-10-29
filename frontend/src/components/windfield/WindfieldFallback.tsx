import type { WindField } from '../../lib/analysis';
import { dayLabel } from '../../lib/analysis';
import { errorColour } from '../../lib/colors';
import { formatMW, formatSignedMW } from '../../lib/format';

interface Props {
  field: WindField;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onSelectInterval?: (startTime: string) => void;
  compact?: boolean;
}

export function WindfieldFallback({
  field,
  selectedDay,
  onSelectDay,
  onSelectInterval,
  compact = false,
}: Props) {
  const width = 980;
  const height = compact ? 300 : 400;
  const left = 62;
  const right = 14;
  const top = 18;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const columns = Math.max(...field.byDay.map((row) => row.length), 1);
  const cellWidth = plotWidth / columns;
  const cellHeight = plotHeight / Math.max(field.days.length, 1);
  const selectedIndex = field.days.indexOf(selectedDay);
  const tickEvery = 4;

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full min-w-[680px]"
          role="img"
          aria-label="Half-hourly wind forecast error by delivery day and time of day. Teal is underforecast; amber is overforecast."
        >
          <defs>
            <linearGradient id="fallback-fade" x1="0" x2="1">
              <stop offset="0" stopColor="#04090c" stopOpacity="0" />
              <stop offset="1" stopColor="#04090c" stopOpacity="0.28" />
            </linearGradient>
          </defs>

          {field.days.map((day, dayIndex) => {
            const row = field.byDay[dayIndex] ?? [];
            const isSelected = dayIndex === selectedIndex;
            return (
              <g key={day}>
                <text
                  x={left - 9}
                  y={top + dayIndex * cellHeight + cellHeight - 2}
                  textAnchor="end"
                  className="fill-dim font-mono"
                  style={{ fontSize: 8.5 }}
                >
                  {day.slice(8)}/{day.slice(5, 7)}
                </text>
                {isSelected && (
                  <rect
                    x={left - 2}
                    y={top + dayIndex * cellHeight - 1}
                    width={plotWidth + 4}
                    height={cellHeight + 2}
                    fill="none"
                    stroke="#eeeade"
                    strokeOpacity="0.65"
                    strokeWidth="1"
                  />
                )}
                {row.map((cell) => (
                  <rect
                    key={cell.startTime}
                    x={left + cell.intervalIndex * cellWidth}
                    y={top + dayIndex * cellHeight}
                    width={Math.max(cellWidth - 1, 0.8)}
                    height={Math.max(cellHeight - 1, 0.8)}
                    fill={errorColour(cell.error, field.maxAbsoluteError)}
                    className="cursor-pointer transition-opacity hover:opacity-75"
                    onClick={() => {
                      onSelectDay(day);
                      if (cell.status === 'matched') onSelectInterval?.(cell.startTime);
                    }}
                  >
                    <title>
                      {`${dayLabel(day)}, ${cell.label}\nActual ${formatMW(cell.actual)}\nForecast ${formatMW(cell.forecast)}\nError ${formatSignedMW(cell.error)}`}
                    </title>
                  </rect>
                ))}
              </g>
            );
          })}

          {Array.from({ length: Math.floor(columns / tickEvery) + 1 }).map((_, index) => {
            const column = index * tickEvery;
            const label = field.intervalLabels[column] ?? '';
            return (
              <text
                key={column}
                x={left + column * cellWidth + cellWidth / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-dim font-mono"
                style={{ fontSize: 8.5 }}
              >
                {label}
              </text>
            );
          })}
          <text
            x={left + plotWidth / 2}
            y={height - 1}
            textAnchor="middle"
            className="fill-dim font-mono"
            style={{ fontSize: 8, letterSpacing: '0.14em' }}
          >
            DELIVERY TIME · EUROPE/LONDON
          </text>
          <rect x={left} y={top} width={plotWidth} height={plotHeight} fill="url(#fallback-fade)" pointerEvents="none" />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">Under</span>
          <span className="h-2 w-24 bg-[linear-gradient(90deg,#3fd4c5,#10262e_52%,#e89b4b,#b9563f)]" aria-hidden="true" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">Over</span>
        </div>
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
          Colour = forecast − actual · height = absolute error
        </p>
      </div>
    </div>
  );
}
