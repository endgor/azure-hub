import { useEffect, useRef } from 'react';

interface UseSwipeDrawerOptions {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Pixels from the left edge that count as a swipe-start zone (default: 24) */
  edgeWidth?: number;
  /** Minimum horizontal distance in px to trigger open/close (default: 60) */
  threshold?: number;
}

/**
 * Detects left-edge swipe gestures on mobile to open/close a drawer menu.
 *
 * - Swipe right from the left edge → open
 * - Swipe left while open → close
 * - Ignores vertical scrolling (only triggers when horizontal movement dominates)
 */
export function useSwipeDrawer({
  isOpen,
  onOpen,
  onClose,
  edgeWidth = 24,
  threshold = 60,
}: UseSwipeDrawerOptions) {
  const isOpenRef = useRef(isOpen);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const edgeWidthRef = useRef(edgeWidth);
  const thresholdRef = useRef(threshold);

  useEffect(() => {
    isOpenRef.current = isOpen;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    edgeWidthRef.current = edgeWidth;
    thresholdRef.current = threshold;
  });

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let directionLocked = false;
    let horizontal = false;

    function handleTouchStart(e: TouchEvent) {
      if (window.innerWidth >= 768) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      directionLocked = false;
      horizontal = false;

      // Start tracking if touch is in the left-edge zone or menu is open
      tracking = (!isOpenRef.current && touch.clientX <= edgeWidthRef.current) || isOpenRef.current;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!tracking) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Lock scroll direction after first significant movement
      if (!directionLocked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        directionLocked = true;
        horizontal = Math.abs(dx) > Math.abs(dy);

        if (!horizontal) {
          tracking = false;
          return;
        }
      }

      // Prevent browser back/forward navigation for edge swipes
      if (horizontal && !isOpenRef.current && dx > 0) {
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!tracking || !horizontal) {
        tracking = false;
        return;
      }

      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX;

      if (!isOpenRef.current && dx >= thresholdRef.current) {
        onOpenRef.current();
      } else if (isOpenRef.current && dx <= -thresholdRef.current) {
        onCloseRef.current();
      }

      tracking = false;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []); // Empty deps — all values accessed via refs
}
