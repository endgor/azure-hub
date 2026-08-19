export interface ParsedVmSize {
  /** Leading letters, e.g. D, NC, FX */
  prefix: string;
  /** Advertised vCPU count in the name */
  cores: number | null;
  /** Constrained-core count, e.g. 4 for E16-4as_v6 */
  constrainedCores: number | null;
  /** Feature letters after the core count, e.g. ads */
  suffix: string;
  /** Version segment, e.g. v5 */
  version: string;
  /** Non-numeric extras such as A100 or cc */
  extras: string[];
  /** Normalised series label, e.g. Dsv5, Easv6, NCadsA100v4 */
  series: string;
}

/**
 * Azure writes the constrained-core count either before the feature letters (E16-4as_v6)
 * or after them (M176ds-44_3_v3), so both positions are captured.
 */
const SIZE_PATTERN = /^([A-Za-z]+?)(\d+)(?:-(\d+))?([a-z]*)(?:-(\d+))?((?:_[A-Za-z0-9]+)*)$/;

/** Strips the Standard_ / Basic_ tier prefix, and the Experimental_ infix Azure uses on preview sizes. */
export function stripSkuTier(sku: string): string {
  return sku.trim().replace(/^(Standard|Basic)_/i, '').replace(/^Experimental_/i, '');
}

export function parseVmSize(sku: string): ParsedVmSize {
  const size = stripSkuTier(sku);
  const match = SIZE_PATTERN.exec(size);

  if (!match) {
    return {
      prefix: size,
      cores: null,
      constrainedCores: null,
      suffix: '',
      version: '',
      extras: [],
      series: size
    };
  }

  const [, prefix, coresText, constrainedBefore, suffix, constrainedAfter, tail] = match;
  const constrainedText = constrainedBefore ?? constrainedAfter;
  const segments = tail ? tail.slice(1).split('_') : [];

  let version = '';
  let promo = false;
  const extras: string[] = [];

  for (const segment of segments) {
    if (/^v\d+$/i.test(segment)) {
      version = segment.toLowerCase();
    } else if (/^promo$/i.test(segment)) {
      promo = true;
    } else if (/^\d+$/.test(segment)) {
      // Memory-tier discriminators such as the "4" in M176ds-88_4_v3 are not part of the series.
      continue;
    } else {
      extras.push(segment);
    }
  }

  return {
    prefix,
    cores: Number(coresText),
    constrainedCores: constrainedText ? Number(constrainedText) : null,
    suffix,
    version,
    extras,
    series: `${prefix}${suffix}${extras.join('')}${version}${promo ? ' Promo' : ''}`
  };
}

const CATEGORY_BY_PREFIX: Record<string, string> = {
  A: 'General purpose',
  B: 'General purpose',
  D: 'General purpose',
  DC: 'Confidential computing',
  E: 'Memory optimized',
  EC: 'Confidential computing',
  F: 'Compute optimized',
  FX: 'Compute optimized',
  G: 'Memory optimized',
  GS: 'Memory optimized',
  H: 'High performance compute',
  HB: 'High performance compute',
  HC: 'High performance compute',
  HX: 'High performance compute',
  L: 'Storage optimized',
  M: 'Memory optimized',
  NC: 'GPU accelerated',
  ND: 'GPU accelerated',
  NG: 'GPU accelerated',
  NP: 'FPGA accelerated',
  NV: 'GPU accelerated',
  PB: 'GPU accelerated',
  X: 'Memory optimized'
};

export function getVmCategory(sku: string): string {
  const { prefix } = parseVmSize(sku);
  const upper = prefix.toUpperCase();

  // Match the longest known prefix so DC/EC/NC beat D/E/N.
  for (let length = Math.min(2, upper.length); length >= 1; length--) {
    const candidate = CATEGORY_BY_PREFIX[upper.slice(0, length)];
    if (candidate) return candidate;
  }

  return 'Other';
}
