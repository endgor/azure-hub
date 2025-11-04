import { useEffect, RefObject } from 'react';

/**
 * useClickOutside Hook
 *
 * Detects clicks outside of a referenced element and triggers a callback.
 * Automatically handles event listener cleanup.
 *
 * @param ref - React ref object pointing to the element to monitor
 * @param handler - Callback function to execute when clicking outside
 * @param enabled - Optional flag to enable/disable the listener (defaults to true)
 *
 * @example
 * ```tsx
 * function Dropdown() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   const dropdownRef = useRef<HTMLDivElement>(null);
 *
 *   useClickOutside(dropdownRef, () => setIsOpen(false));
 *
 *   return (
 *     <div ref={dropdownRef}>
 *       {isOpen && <DropdownMenu />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * // Conditional activation
 * ```tsx
 * useClickOutside(menuRef, () => setShowMenu(false), showMenu);
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;

      // Do nothing if clicking ref's element or descendent elements
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Use mousedown and touchstart for better mobile support
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}
