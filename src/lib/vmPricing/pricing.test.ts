import { describe, it, expect } from 'vitest';
import {
  resolvePrice,
  getSavingsFraction,
  getPaygPrice,
  formatHourly,
  formatMonthly,
  clampHoursPerMonth,
  getCurrencySymbol,
  getCurrencyLabel
} from './pricing';
import { VM_PRICE_FIELDS, type PackedVmPrices } from '@/types/vmPricing';

function pack(values: Partial<Record<(typeof VM_PRICE_FIELDS)[number], number>>): PackedVmPrices {
  return VM_PRICE_FIELDS.map((field) => values[field] ?? null);
}

// Real Standard_D4s_v5 West Europe USD rates.
const D4S_V5 = pack({
  lpayg: 0.23,
  lspot: 0.042504,
  llow: 0.046,
  lri1: 0.141895,
  lri3: 0.090868,
  lsp1: 0.1748,
  lsp3: 0.1265,
  wpayg: 0.414,
  wspot: 0.076507,
  wlow: 0.166,
  wdev: 0.23
});

describe('resolvePrice', () => {
  it('reads Linux consumption rates directly', () => {
    expect(resolvePrice(D4S_V5, 'linux', 'payg')).toEqual({ hourly: 0.23, estimated: false });
    expect(resolvePrice(D4S_V5, 'linux', 'spot')).toEqual({ hourly: 0.042504, estimated: false });
    expect(resolvePrice(D4S_V5, 'linux', 'lowPriority')).toEqual({ hourly: 0.046, estimated: false });
  });

  it('reads Windows consumption rates directly', () => {
    expect(resolvePrice(D4S_V5, 'windows', 'payg')).toEqual({ hourly: 0.414, estimated: false });
    expect(resolvePrice(D4S_V5, 'windows', 'devTest')).toEqual({ hourly: 0.23, estimated: false });
  });

  it('reads savings plan rates', () => {
    expect(resolvePrice(D4S_V5, 'linux', 'savingsPlan1Year')?.hourly).toBe(0.1748);
    expect(resolvePrice(D4S_V5, 'linux', 'savingsPlan3Years')?.hourly).toBe(0.1265);
  });

  it('returns Linux reservation rates as reported', () => {
    expect(resolvePrice(D4S_V5, 'linux', 'reservation1Year')).toEqual({ hourly: 0.141895, estimated: false });
    expect(resolvePrice(D4S_V5, 'linux', 'reservation3Years')).toEqual({ hourly: 0.090868, estimated: false });
  });

  it('estimates Windows reservation rates as Linux plus the Windows surcharge', () => {
    const result = resolvePrice(D4S_V5, 'windows', 'reservation1Year');
    expect(result?.estimated).toBe(true);
    expect(result?.hourly).toBeCloseTo(0.141895 + (0.414 - 0.23), 9);
  });

  it('estimates Windows savings plan rates the same way', () => {
    // Azure rarely publishes a Windows savings plan meter.
    const result = resolvePrice(D4S_V5, 'windows', 'savingsPlan1Year');
    expect(result?.estimated).toBe(true);
    expect(result?.hourly).toBeCloseTo(0.1748 + (0.414 - 0.23), 9);
  });

  it('falls back to the Linux pay-as-you-go rate for an unpublished dev/test meter', () => {
    // Dev/Test only waives the Windows licence, so Azure publishes no Linux dev/test price.
    expect(resolvePrice(D4S_V5, 'linux', 'devTest')).toEqual({ hourly: 0.23, estimated: true });
  });

  it('returns null for a missing rate rather than zero', () => {
    expect(resolvePrice(pack({ lspot: 1 }), 'linux', 'devTest')).toBeNull();
    expect(resolvePrice(pack({ lpayg: 1 }), 'linux', 'reservation1Year')).toBeNull();
    expect(resolvePrice(pack({ lpayg: 1 }), 'linux', 'savingsPlan1Year')).toBeNull();
    expect(resolvePrice(pack({ lsp1: 1 }), 'windows', 'savingsPlan1Year')).toBeNull();
    expect(resolvePrice(undefined, 'linux', 'payg')).toBeNull();
  });

  it('tolerates rows whose trailing nulls were trimmed', () => {
    const trimmed = [0.5, null, null, null, 0.3];
    expect(resolvePrice(trimmed, 'linux', 'payg')?.hourly).toBe(0.5);
    expect(resolvePrice(trimmed, 'linux', 'reservation1Year')?.hourly).toBe(0.3);
    expect(resolvePrice(trimmed, 'windows', 'payg')).toBeNull();
  });
});

describe('getPaygPrice', () => {
  it('picks the rate for the requested OS', () => {
    expect(getPaygPrice(D4S_V5, 'linux')).toBe(0.23);
    expect(getPaygPrice(D4S_V5, 'windows')).toBe(0.414);
  });
});

describe('getSavingsFraction', () => {
  it('measures the discount against pay-as-you-go', () => {
    expect(getSavingsFraction(D4S_V5, 'linux', 'spot')).toBeCloseTo(1 - 0.042504 / 0.23, 9);
    expect(getSavingsFraction(D4S_V5, 'linux', 'reservation3Years')).toBeCloseTo(1 - 0.090868 / 0.23, 9);
  });

  it('has nothing to compare for pay-as-you-go itself', () => {
    expect(getSavingsFraction(D4S_V5, 'linux', 'payg')).toBeNull();
  });

  it('returns null when either side is missing', () => {
    expect(getSavingsFraction(pack({ lspot: 0.1 }), 'linux', 'spot')).toBeNull();
    expect(getSavingsFraction(pack({ lpayg: 0.1 }), 'linux', 'reservation1Year')).toBeNull();
  });

  it('reports no discount for Linux dev/test, which is the pay-as-you-go rate', () => {
    expect(getSavingsFraction(D4S_V5, 'linux', 'devTest')).toBe(0);
  });
});

describe('formatHourly', () => {
  it('scales precision to the magnitude', () => {
    expect(formatHourly(0.042504, 'USD')).toBe('$0.0425');
    expect(formatHourly(0.0004, 'USD')).toBe('$0.00040');
    expect(formatHourly(0.23, 'USD')).toBe('$0.2300');
    expect(formatHourly(12.5, 'USD')).toBe('$12.500');
  });

  it('renders an em dash for a missing price', () => {
    expect(formatHourly(null, 'USD')).toBe('—');
    expect(formatMonthly(null, 'SEK')).toBe('—');
  });
});

describe('formatMonthly', () => {
  it('bills 730 hours a month by default', () => {
    expect(formatMonthly(1, 'USD')).toBe('$730');
  });

  it('bills a custom runtime', () => {
    expect(formatMonthly(1, 'USD', 40)).toBe('$40.00');
    expect(formatMonthly(2, 'USD', 176)).toBe('$352');
  });

  it('keeps cents on small monthly totals', () => {
    expect(formatMonthly(0.01, 'USD')).toBe('$7.30');
  });
});

describe('zero-priced meters', () => {
  // Azure publishes 0.0 for meters with no released price, e.g. unreleased M_v4 sizes.
  const unreleased = pack({ lpayg: 0, lspot: 0, wpayg: 0.046 });

  it('treats a zero rate as no price at all', () => {
    expect(resolvePrice(unreleased, 'linux', 'payg')).toBeNull();
    expect(resolvePrice(unreleased, 'linux', 'spot')).toBeNull();
    expect(getPaygPrice(unreleased, 'linux')).toBeNull();
  });

  it('still reads a genuine non-zero rate on the same row', () => {
    expect(resolvePrice(unreleased, 'windows', 'payg')?.hourly).toBe(0.046);
  });

  it('does not report a discount against a zero baseline', () => {
    expect(getSavingsFraction(unreleased, 'linux', 'spot')).toBeNull();
  });
});

describe('clampHoursPerMonth', () => {
  it('keeps a runtime inside one real month', () => {
    expect(clampHoursPerMonth(40)).toBe(40);
    expect(clampHoursPerMonth(0)).toBe(1);
    expect(clampHoursPerMonth(-5)).toBe(1);
    expect(clampHoursPerMonth(10000)).toBe(744);
  });

  it('rounds fractions and falls back on nonsense', () => {
    expect(clampHoursPerMonth(40.4)).toBe(40);
    expect(clampHoursPerMonth(Number.NaN)).toBe(730);
  });
});

/** Intl separates a currency code from the number with a non-breaking space. */
function plain(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

describe('currency conversion', () => {
  // Azure quotes every currency as the USD price times one rate it sets monthly.
  it('applies the rate to hourly prices', () => {
    expect(formatHourly(0.23, 'USD', 1)).toBe('$0.2300');
    expect(formatHourly(0.23, 'EUR', 0.878619)).toBe('€0.2021');
  });

  it('applies the rate to monthly prices', () => {
    expect(formatMonthly(1, 'USD', 730, 1)).toBe('$730');
    // 730 x 9.72535 = 7099.51, and totals above 100 drop the minor unit.
    expect(plain(formatMonthly(1, 'SEK', 730, 9.72535))).toBe('SEK 7,100');
  });

  it('defaults to a rate of 1 when none is given', () => {
    expect(formatHourly(0.23, 'USD')).toBe('$0.2300');
  });

  it('drops minor units for currencies that have none', () => {
    // JPY has no subunit, so Intl would reject fractional digits.
    expect(formatMonthly(1, 'JPY', 730, 163)).toBe('¥118,990');
    expect(formatHourly(100, 'JPY', 1)).toBe('¥100');
  });

  it('still formats a well-formed code Intl has no symbol for', () => {
    expect(plain(formatHourly(1, 'XYZ', 1))).toBe('XYZ 1.000');
  });

  it('falls back to a plain number for a malformed code', () => {
    // Intl only accepts three-letter codes and throws on anything else.
    expect(formatHourly(1, 'XY', 1)).toBe('1.000 XY');
  });
});

describe('currency labels', () => {
  it('resolves a symbol and a name', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencyLabel('SEK')).toContain('Swedish');
  });

  it('falls back to the code when malformed', () => {
    expect(getCurrencySymbol('XY')).toBe('XY');
    expect(getCurrencyLabel('XY')).toBe('XY');
  });
});
