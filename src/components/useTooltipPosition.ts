import { useEffect, useLayoutEffect, useState, RefObject } from 'react';

/** useLayoutEffect warns during server rendering, where there is nothing to measure. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Tracks the viewport position of a tooltip trigger.
 *
 * Pass `enabled` as false while the tooltip is closed so lists of triggers do not
 * each keep a scroll and resize listener attached.
 */
export function useTooltipPosition(triggerRef: RefObject<HTMLElement | null>, enabled: boolean = true) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useIsomorphicLayoutEffect(() => {
    if (!enabled) return;

    function updatePosition() {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Position above the trigger with 10px gap
        left: rect.left + rect.width / 2 // Center horizontally
      });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [triggerRef, enabled]);

  return position;
}
