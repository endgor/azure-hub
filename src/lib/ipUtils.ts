/**
 * Pure IP address conversion utilities for numeric range lookups.
 * Used by both the build-time index generator and runtime lookup.
 */

/** Check if an IP string is IPv6 (contains a colon) */
export function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/** Convert dotted-decimal IPv4 to unsigned 32-bit integer */
export function ipv4ToUint32(ip: string): number {
  const parts = ip.split('.');
  return (
    ((parseInt(parts[0], 10) << 24) |
      (parseInt(parts[1], 10) << 16) |
      (parseInt(parts[2], 10) << 8) |
      parseInt(parts[3], 10)) >>>
    0
  );
}

/**
 * Expand an IPv6 address to its full 8-group form.
 * Handles :: expansion and IPv4-mapped addresses (e.g. ::ffff:1.2.3.4).
 */
export function expandIPv6(ip: string): string {
  // Handle IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1)
  const v4Suffix = ip.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Suffix) {
    const v4 = v4Suffix[1];
    const parts = v4.split('.').map(p => parseInt(p, 10));
    const high = ((parts[0] << 8) | parts[1]).toString(16);
    const low = ((parts[2] << 8) | parts[3]).toString(16);
    ip = ip.replace(`:${v4}`, `:${high}:${low}`);
  }

  const halves = ip.split('::');
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0');
    const groups = [...left, ...middle, ...right];
    return groups.map(g => g.padStart(4, '0')).join(':');
  }

  return ip
    .split(':')
    .map(g => g.padStart(4, '0'))
    .join(':');
}

/**
 * Convert a fully expanded IPv6 address to a 32-character hex string.
 * Lexicographic comparison on fixed-length hex strings preserves numeric order.
 */
export function ipv6ToHex(ip: string): string {
  const expanded = expandIPv6(ip);
  return expanded.replace(/:/g, '').toLowerCase();
}

/** Result of parsing a CIDR string into numeric start/end range */
export interface CidrRange {
  start: number | string; // uint32 for IPv4, hex string for IPv6
  end: number | string;
  isV6: boolean;
}

/** Convert a CIDR string to its numeric start/end range */
export function cidrToRange(cidr: string): CidrRange {
  const [ip, prefixStr] = cidr.split('/');
  const prefixLen = parseInt(prefixStr, 10);

  if (isIPv6(ip)) {
    const hex = ipv6ToHex(ip);

    // Convert hex string to array of 4-bit nibbles for bitwise ops
    const startNibbles = hex.split('');

    // Calculate end: set all host bits to 1
    const endNibbles = [...startNibbles];
    // Zero out host bits in start, set to 1 in end
    const firstHostNibble = Math.floor(prefixLen / 4);
    const bitsInPartialNibble = prefixLen % 4;

    if (bitsInPartialNibble > 0 && firstHostNibble < 32) {
      const nibbleVal = parseInt(startNibbles[firstHostNibble], 16);
      // Mask: keep only the prefix bits within this nibble
      const mask = (0xf << (4 - bitsInPartialNibble)) & 0xf;
      startNibbles[firstHostNibble] = (nibbleVal & mask).toString(16);
      endNibbles[firstHostNibble] = ((nibbleVal & mask) | (~mask & 0xf)).toString(16);
    }

    for (let i = firstHostNibble + (bitsInPartialNibble > 0 ? 1 : 0); i < 32; i++) {
      startNibbles[i] = '0';
      endNibbles[i] = 'f';
    }

    return {
      start: startNibbles.join(''),
      end: endNibbles.join(''),
      isV6: true,
    };
  } else {
    const ipNum = ipv4ToUint32(ip);
    if (prefixLen === 32) {
      return { start: ipNum, end: ipNum, isV6: false };
    }
    // Create mask with prefixLen leading 1s.
    // JS shift counts are mod 32, so `~0 << 32` would leave every bit set
    // instead of clearing them; /0 has to be special-cased.
    const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
    const start = (ipNum & mask) >>> 0;
    const end = (start | (~mask >>> 0)) >>> 0;
    return { start, end, isV6: false };
  }
}

/** Convert an unsigned 32-bit integer back to dotted-decimal */
export function uint32ToIpv4(value: number): string {
  return `${value >>> 24}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
}

/** Last address of the IPv4 block that starts at `start` with the given prefix length */
export function ipv4RangeEnd(start: number, prefixLen: number): number {
  if (prefixLen >= 32) return start;
  if (prefixLen <= 0) return 0xffffffff;
  return (start | (0xffffffff >>> prefixLen)) >>> 0;
}

/** Last address of the IPv6 block that starts at `startHex` (32 hex chars), as 32 hex chars */
export function ipv6HexRangeEnd(startHex: string, prefixLen: number): string {
  const nibbles = startHex.split('');
  const firstHostNibble = Math.floor(prefixLen / 4);
  const partialBits = prefixLen % 4;

  if (partialBits > 0 && firstHostNibble < 32) {
    const mask = (0xf << (4 - partialBits)) & 0xf;
    const value = parseInt(nibbles[firstHostNibble], 16);
    nibbles[firstHostNibble] = ((value & mask) | (~mask & 0xf)).toString(16);
  }

  for (let i = firstHostNibble + (partialBits > 0 ? 1 : 0); i < 32; i++) {
    nibbles[i] = 'f';
  }

  return nibbles.join('');
}

/** Format 32 hex chars as RFC 5952 text: longest zero run collapsed, leftmost wins ties */
export function hexToIpv6(hex: string): string {
  const groups: number[] = [];
  for (let i = 0; i < 8; i++) {
    groups.push(parseInt(hex.slice(i * 4, i * 4 + 4), 16));
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLength) {
      bestLength = j - i;
      bestStart = i;
    }
    i = j;
  }

  const text = (values: number[]) => values.map((v) => v.toString(16)).join(':');
  if (bestLength < 2) return text(groups);
  return `${text(groups.slice(0, bestStart))}::${text(groups.slice(bestStart + bestLength))}`;
}
