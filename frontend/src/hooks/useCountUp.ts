import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { formatNumber } from '../lib/format';

export function useCountUp(value: number | null | undefined, digits = 0): string {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value ?? null);
  const previous = useRef<number | null>(value ?? null);

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplay(null);
      previous.current = null;
      return;
    }
    if (reduced) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const startValue = previous.current ?? value;
    const state = { value: startValue };
    const tween = gsap.to(state, {
      value,
      duration: 0.75,
      ease: 'power2.out',
      onUpdate: () => setDisplay(state.value),
      onComplete: () => {
        setDisplay(value);
        previous.current = value;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, reduced]);

  return formatNumber(display, digits);
}
