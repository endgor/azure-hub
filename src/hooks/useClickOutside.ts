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

/**
 * useClickOutsideMultiple Hook
 *
 * Detects clicks outside of multiple referenced elements and triggers individual callbacks.
 * Useful when you have several dropdowns/modals that need independent click-outside handling.
 *
 * @param handlers - Array of objects with ref and handler pairs
 * @param enabled - Optional flag to enable/disable all listeners (defaults to true)
 *
 * @example
 * ```tsx
 * function MultiDropdown() {
 *   const [showService, setShowService] = useState(false);
 *   const [showAction, setShowAction] = useState(false);
 *   const serviceRef = useRef<HTMLDivElement>(null);
 *   const actionRef = useRef<HTMLDivElement>(null);
 *
 *   useClickOutsideMultiple([
 *     { ref: serviceRef, handler: () => setShowService(false) },
 *     { ref: actionRef, handler: () => setShowAction(false) }
 *   ]);
 *
 *   return (
 *     <>
 *       <div ref={serviceRef}>{showService && <ServiceMenu />}</div>
 *       <div ref={actionRef}>{showAction && <ActionMenu />}</div>
 *     </>
 *   );
 * }
 * ```
 */
export function useClickOutsideMultiple<T extends HTMLElement = HTMLElement>(
  handlers: Array<{ ref: RefObject<T>; handler: (event: MouseEvent | TouchEvent) => void }>,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled || handlers.length === 0) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      handlers.forEach(({ ref, handler }) => {
        const element = ref.current;

        // Do nothing if clicking ref's element or descendent elements
        if (!element || element.contains(event.target as Node)) {
          return;
        }

        handler(event);
      });
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handlers, enabled]);
}
