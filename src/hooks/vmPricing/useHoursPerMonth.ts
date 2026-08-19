import { useCallback, useEffect } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { HOURS_PER_MONTH, clampHoursPerMonth } from '@/lib/vmPricing/pricing';

/**
 * Monthly runtime, shared by the pricing table and the size detail pages. Clamped on read
 * as well as on write, so a stored value from an older build can never render a zero-hour
 * month, and the repaired value is written back.
 */
export function useHoursPerMonth(): [number, (hours: number) => void] {
  const [stored, setStored] = useLocalStorageState<number>('vm-pricing-hours', HOURS_PER_MONTH);
  const hoursPerMonth = clampHoursPerMonth(stored);

  useEffect(() => {
    if (hoursPerMonth !== stored) setStored(hoursPerMonth);
  }, [hoursPerMonth, stored, setStored]);

  const setHoursPerMonth = useCallback((hours: number) => setStored(clampHoursPerMonth(hours)), [setStored]);

  return [hoursPerMonth, setHoursPerMonth];
}
