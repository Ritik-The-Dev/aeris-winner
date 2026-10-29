import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * A restrained page reveal. Only runs on elements marked data-reveal, never on
 * the chart SVG itself, and is skipped entirely under reduced-motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(dependency: unknown): RefObject<T> {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current) return;
    const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!nodes.length) return;
    if (reduced) {
      gsap.set(nodes, { clearProps: 'all', opacity: 1, y: 0 });
      return;
    }
    const context = gsap.context(() => {
      gsap.fromTo(
        nodes,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: 'power3.out',
          stagger: 0.055,
          clearProps: 'transform',
        },
      );
    }, ref.current);
    return () => context.revert();
  }, [dependency, reduced]);

  return ref;
}

