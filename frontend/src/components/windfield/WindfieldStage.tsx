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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-950/55">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-teal-200">
            Plotting {field.cells.length.toLocaleString('en-GB')} intervals…
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
        <span className="bg-ink-950/75 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-dim backdrop-blur">
          Drag to orbit · click a day
        </span>
        <span className="hidden items-center gap-2 bg-ink-950/75 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-dim backdrop-blur sm:flex">
          <i className="h-px w-4 bg-amber-300" aria-hidden="true" />
          Forecast surface
        </span>
      </div>
    </div>
  );
}
