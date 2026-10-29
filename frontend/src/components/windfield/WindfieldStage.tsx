import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { WindField } from '../../lib/analysis';
import { formatDateWithWeekday } from '../../lib/format';
import { WindfieldFallback } from './WindfieldFallback';
import { LoadingState } from '../ui/States';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const Windfield3D = lazy(() => import('./Windfield3D'));

interface Props {
  field: WindField;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onSelectInterval?: (startTime: string) => void;
  className?: string;
  compact?: boolean;
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('AERIS wind field scene failed', error.message, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return Boolean(context);
  } catch {
    return false;
  }
}

export function WindfieldStage({
  field,
  selectedDay,
  onSelectDay,
  onSelectInterval,
  className = '',
  compact = false,
}: Props) {
  const supported = useMemo(hasWebGL, []);
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);
  const fallback = (
    <WindfieldFallback
      field={field}
      selectedDay={selectedDay}
      onSelectDay={onSelectDay}
      onSelectInterval={onSelectInterval}
      compact={compact}
    />
  );

  if (!supported || failed) {
    return (
      <div className={className}>
        {fallback}
        <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-dim">
          {failed ? 'WebGL scene stopped · showing accessible grid' : '3D unavailable · showing accessible grid'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <SceneBoundary fallback={fallback}>
        <Suspense fallback={<LoadingState label="Assembling wind field" />}>
          <Windfield3D
            field={field}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            reducedMotion={reducedMotion}
            onReady={onReady}
            onFail={onFail}
          />
        </Suspense>
      </SceneBoundary>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-ink-950/55 backdrop-blur-[2px]">
          <span className="rounded-full border border-paper/10 bg-ink-950/80 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-teal-200 shadow-soft">
            Plotting {field.cells.length.toLocaleString('en-GB')} intervals…
          </span>
        </div>
      )}
      <div
        className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-teal-300/20 bg-ink-950/80 px-3 py-1.5 shadow-soft backdrop-blur"
        aria-live="polite"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal-300" aria-hidden="true" />
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-dim">
          Selected ridge
        </span>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.08em] text-teal-200">
          {formatDateWithWeekday(`${selectedDay}T12:00:00Z`)}
        </span>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 ${
          compact ? 'justify-between' : 'justify-end'
        }`}
      >
        {compact && (
          <span className="rounded-full bg-ink-950/80 px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-dim shadow-soft backdrop-blur">
            Drag to orbit · click a ridge
          </span>
        )}
        <span className="hidden items-center gap-2 rounded-full bg-ink-950/80 px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.1em] text-dim shadow-soft backdrop-blur sm:flex">
          <i className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          Forecast surface
        </span>
      </div>
    </div>
  );
}
