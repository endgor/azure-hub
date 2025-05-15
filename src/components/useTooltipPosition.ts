import { useEffect, useState, RefObject } from 'react';

export function useTooltipPosition(triggerRef: RefObject<HTMLElement>) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePosition() {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Position above the trigger with 10px gap
        left: rect.left + (rect.width / 2), // Center horizontally
      });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [triggerRef]);

  return position;
}
