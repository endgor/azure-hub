import {
  VM_PRICE_FIELDS,
  type PackedVmPrices,
  type VmCurrency,
  type VmOperatingSystem,
  type VmPriceMode,
  type VmResolvedPrice
} from '@/types/vmPricing';

/** Azure's billing month: 730 hours is an always-on VM. */
export const HOURS_PER_MONTH = 730;

/** Longest possible month, so a custom runtime cannot exceed real elapsed time. */
export const MAX_HOURS_PER_MONTH = 744;

export const HOURS_PER_MONTH_PRESETS: { hours: number; label: string; description: string }[] = [
  { hours: 730, label: '730h — Always on', description: 'Every hour of the month' },
  { hours: 504, label: '504h — Weekdays only', description: '21 days, around the clock' },
  { hours: 176, label: '176h — Office hours', description: '22 days x 8 hours' },
  { hours: 88, label: '88h — Half days', description: '22 days x 4 hours' },
  { hours: 40, label: '40h — One week', description: '5 days x 8 hours' }
];

/** Keeps a user-entered runtime inside one real month. */
export function clampHoursPerMonth(hours: number): number {
  if (!Number.isFinite(hours)) return HOURS_PER_MONTH;
  return Math.min(MAX_HOURS_PER_MONTH, Math.max(1, Math.round(hours)));
}

const FIELD_INDEX = new Map(VM_PRICE_FIELDS.map((field, index) => [field, index]));

function read(packed: PackedVmPrices | undefined, field: string): number | null {
  if (!packed) return null;
  const index = FIELD_INDEX.get(field as never);
  if (index === undefined || index >= packed.length) return null;
  const value = packed[index];
  // Zero means Azure has a meter but no released price, so treat it as absent.
  return typeof value === 'number' && value > 0 ? value : null;
}

export const VM_PRICE_MODES: { value: VmPriceMode; label: string; shortLabel: string }[] = [
  { value: 'payg', label: 'Pay as you go', shortLabel: 'PAYG' },
  { value: 'spot', label: 'Spot', shortLabel: 'Spot' },
  { value: 'savingsPlan1Year', label: 'Savings plan, 1 year', shortLabel: 'SP 1yr' },
  { value: 'savingsPlan3Years', label: 'Savings plan, 3 years', shortLabel: 'SP 3yr' },
  { value: 'reservation1Year', label: 'Reserved instance, 1 year', shortLabel: 'RI 1yr' },
  { value: 'reservation3Years', label: 'Reserved instance, 3 years', shortLabel: 'RI 3yr' },
  { value: 'lowPriority', label: 'Low priority', shortLabel: 'Low pri' },
  { value: 'devTest', label: 'Dev/Test', shortLabel: 'Dev/Test' }
];

export function getPriceModeLabel(mode: VmPriceMode): string {
  return VM_PRICE_MODES.find((entry) => entry.value === mode)?.label ?? mode;
}

/** True for modes where a Windows rate has to be estimated from the Linux rate. */
export function isCommitmentMode(mode: VmPriceMode): boolean {
  return mode === 'reservation1Year' || mode === 'reservation3Years';
}

/**
 * Resolves the hourly rate for one SKU. Reservations are sold per instance without a
 * Windows licence, so a Windows reservation rate is the Linux rate plus the Windows
 * pay-as-you-go surcharge and is flagged as an estimate.
 */
export function resolvePrice(
  packed: PackedVmPrices | undefined,
  os: VmOperatingSystem,
  mode: VmPriceMode
): VmResolvedPrice | null {
  if (!packed) return null;

  const prefix = os === 'windows' ? 'w' : 'l';

  switch (mode) {
    case 'payg':
      return wrap(read(packed, `${prefix}payg`));
    case 'spot':
      return wrap(read(packed, `${prefix}spot`));
    case 'lowPriority':
      return wrap(read(packed, `${prefix}low`));
    case 'devTest':
      return wrap(read(packed, `${prefix}dev`));
    case 'savingsPlan1Year':
      return wrap(read(packed, `${prefix}sp1`));
    case 'savingsPlan3Years':
      return wrap(read(packed, `${prefix}sp3`));
    case 'reservation1Year':
    case 'reservation3Years': {
      const linuxRate = read(packed, mode === 'reservation1Year' ? 'lri1' : 'lri3');
      if (linuxRate === null) return null;
      if (os === 'linux') return { hourly: linuxRate, estimated: false };

      const windowsPayg = read(packed, 'wpayg');
      const linuxPayg = read(packed, 'lpayg');
      if (windowsPayg === null || linuxPayg === null) return null;

      const surcharge = Math.max(0, windowsPayg - linuxPayg);
      return { hourly: linuxRate + surcharge, estimated: true };
    }
    default:
      return null;
  }
}

function wrap(hourly: number | null): VmResolvedPrice | null {
  return hourly === null ? null : { hourly, estimated: false };
}

export function getPaygPrice(packed: PackedVmPrices | undefined, os: VmOperatingSystem): number | null {
  return read(packed, os === 'windows' ? 'wpayg' : 'lpayg');
}

/** Discount against pay-as-you-go as a fraction, e.g. 0.62 for 62% off. */
export function getSavingsFraction(
  packed: PackedVmPrices | undefined,
  os: VmOperatingSystem,
  mode: VmPriceMode
): number | null {
  if (mode === 'payg') return null;

  const payg = getPaygPrice(packed, os);
  const resolved = resolvePrice(packed, os, mode);
  if (payg === null || payg === 0 || !resolved) return null;

  return 1 - resolved.hourly / payg;
}

/** The site is English, so formatting is pinned rather than following the visitor's locale. */
const PRICE_LOCALE = 'en-US';

/** Zero-decimal currencies, where Intl would otherwise reject fractional digits. */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'VND', 'IDR', 'ISK', 'HUF', 'TWD']);

export function getCurrencySymbol(currency: VmCurrency): string {
  try {
    const parts = new Intl.NumberFormat(PRICE_LOCALE, { style: 'currency', currency }).formatToParts(1);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

function formatCurrency(value: number, currency: VmCurrency, digits: number): string {
  // Intl throws on an unknown code, and a broken page is worse than a plain number.
  try {
    return new Intl.NumberFormat(PRICE_LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${currency}`;
  }
}

export function formatHourly(value: number | null, currency: VmCurrency, rate: number = 1): string {
  if (value === null) return '—';

  const converted = value * rate;
  // Small hourly rates need more decimals to stay distinguishable, but a currency with no
  // minor unit (JPY, KRW) cannot show them at all.
  const digits = ZERO_DECIMAL_CURRENCIES.has(currency)
    ? converted < 10
      ? 2
      : 0
    : converted < 0.01
      ? 5
      : converted < 1
        ? 4
        : converted < 100
          ? 3
          : 2;

  return formatCurrency(converted, currency, digits);
}

export function formatMonthly(
  hourly: number | null,
  currency: VmCurrency,
  hoursPerMonth: number = HOURS_PER_MONTH,
  rate: number = 1
): string {
  if (hourly === null) return '—';

  const monthly = hourly * hoursPerMonth * rate;
  const digits = monthly < 100 && !ZERO_DECIMAL_CURRENCIES.has(currency) ? 2 : 0;
  return formatCurrency(monthly, currency, digits);
}

export function formatPercent(fraction: number | null): string {
  if (fraction === null) return '—';
  return `${(fraction * 100).toFixed(0)}%`;
}

export function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${new Intl.NumberFormat('en-US').format(value)}${suffix}`;
}

/** Human-readable currency name for the picker, falling back to the bare code. */
export function getCurrencyLabel(currency: VmCurrency): string {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'currency' });
    return names.of(currency) ?? currency;
  } catch {
    return currency;
  }
}
