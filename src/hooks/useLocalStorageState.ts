import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * useLocalStorageState Hook
 *
 * A useState-like hook that persists state to localStorage with SSR safety.
 * Automatically syncs state across browser tabs/windows.
 *
 * **SSR-Safe**: Defers localStorage reads to useEffect to avoid hydration mismatches.
 *
 * @param key - localStorage key to store the value under
 * @param initialValue - Default value if localStorage is empty or unavailable
 * @param options - Optional configuration
 * @returns [state, setState] tuple compatible with useState
 *
 * @example
 * ```tsx
 * // Basic usage
 * function Settings() {
 *   const [isDarkMode, setIsDarkMode] = useLocalStorageState('theme-dark', false);
 *
 *   return (
 *     <button onClick={() => setIsDarkMode(!isDarkMode)}>
 *       {isDarkMode ? 'Light Mode' : 'Dark Mode'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * // With complex objects
 * ```tsx
 * interface UserPrefs {
 *   notifications: boolean;
 *   language: string;
 * }
 *
 * const [prefs, setPrefs] = useLocalStorageState<UserPrefs>('user-prefs', {
 *   notifications: true,
 *   language: 'en'
 * });
 * ```
 *
 * @example
 * // Sync across tabs
 * ```tsx
 * // Changes in one tab will reflect in others automatically
 * const [count, setCount] = useLocalStorageState('counter', 0, { syncAcrossTabs: true });
 * ```
 */
function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options?: {
    /**
     * Enable synchronization across browser tabs/windows (defaults to true)
     */
    syncAcrossTabs?: boolean;

    /**
     * Custom serializer function (defaults to JSON.stringify)
     */
    serializer?: (value: T) => string;

    /**
     * Custom deserializer function (defaults to JSON.parse)
     */
    deserializer?: (value: string) => T;
  }
): [T, Dispatch<SetStateAction<T>>] {
  const {
    syncAcrossTabs = true,
    serializer = JSON.stringify,
    deserializer = JSON.parse,
  } = options ?? {};

  // Initialize with default value (SSR-safe)
  const [state, setState] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setState(deserializer(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    } finally {
      setIsInitialized(true);
    }
  }, [key, deserializer]);

  // Save to localStorage when state changes (but not on initial load)
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, serializer(state));
    } catch (error) {
      console.warn(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, state, serializer, isInitialized]);

  // Sync across tabs/windows
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;

      try {
        setState(deserializer(event.newValue));
      } catch (error) {
        console.warn(`Error syncing localStorage key "${key}" from storage event:`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserializer, syncAcrossTabs]);

  return [state, setState];
}

// Boolean serializer/deserializer functions (defined outside to prevent re-creation)
const booleanSerializer = (value: boolean) => String(value);
const booleanDeserializer = (value: string) => value === 'true';

/**
 * useLocalStorageBoolean Hook
 *
 * Convenience hook for boolean localStorage values (e.g., feature flags, dismissed banners).
 * Handles string-to-boolean conversion automatically.
 *
 * @param key - localStorage key
 * @param initialValue - Default boolean value
 * @returns [state, setState] tuple
 *
 * @example
 * ```tsx
 * function Banner() {
 *   const [isDismissed, setIsDismissed] = useLocalStorageBoolean('banner-dismissed', false);
 *
 *   if (isDismissed) return null;
 *
 *   return (
 *     <div>
 *       <button onClick={() => setIsDismissed(true)}>Dismiss</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocalStorageBoolean(
  key: string,
  initialValue: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] {
  return useLocalStorageState<boolean>(key, initialValue, {
    serializer: booleanSerializer,
    deserializer: booleanDeserializer,
  });
}
