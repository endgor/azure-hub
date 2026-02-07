/**
 * IP address conversion and manipulation utilities.
 * Handles conversion between string and integer representations of IPv4 addresses.
 */

/**
 * Ensures a number is treated as an unsigned 32-bit integer.
 * The >>> 0 operation converts signed 32-bit integers to unsigned.
 * This is necessary because JavaScript bitwise operations work on signed 32-bit integers.
 */
const toUint32 = (value: number): number => value >>> 0;

/**
 * Converts IPv4 address string to 32-bit unsigned integer.
 * Example: "192.168.1.1" -> 3232235777
 */
export function inetAtov(address: string): number | null {
  const parts = address.trim().split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return NaN;
    }
    return Number(part);
  });

  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  // Combine octets using bitwise shifts: (octet1 << 24) | (octet2 << 16) | (octet3 << 8) | octet4
  return toUint32((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]);
}

/**
 * Converts 32-bit unsigned integer to IPv4 address string.
 * Example: 3232235777 -> "192.168.1.1"
 */
export function inetNtoa(address: number): string {
  const value = toUint32(address);
  return [
    (value >>> 24) & 0xff, // Extract first octet
    (value >>> 16) & 0xff, // Extract second octet
    (value >>> 8) & 0xff,  // Extract third octet
    value & 0xff           // Extract fourth octet
  ].join('.');
}

/**
 * Converts CIDR prefix to subnet mask as 32-bit integer.
 * Example: prefix 24 -> 0xffffff00 (255.255.255.0)
 */
export function prefixToMask(prefix: number): number {
  if (prefix <= 0) {
    return 0;
  }
  // Create mask by inverting a number with (32 - prefix) trailing 1s
  return prefix === 32 ? 0xffffffff : toUint32(~((1 << (32 - prefix)) - 1));
}

/**
 * Normalizes IP address to network address by applying subnet mask.
 * Example: normaliseNetwork("192.168.1.100", 24) -> "192.168.1.0"
 */
export function normaliseNetwork(address: number, prefix: number): number {
  const mask = prefixToMask(prefix);
  return address & mask;
}

/**
 * Checks whether a CIDR block falls entirely within an RFC 1918 private range.
 *
 * RFC 1918 defines three private address ranges:
 *   - 10.0.0.0/8     (10.0.0.0 – 10.255.255.255)
 *   - 172.16.0.0/12   (172.16.0.0 – 172.31.255.255)
 *   - 192.168.0.0/16  (192.168.0.0 – 192.168.255.255)
 *
 * The prefix must be at least as specific as the containing range so that
 * the block cannot extend beyond the private range boundary.
 * For example, 10.0.0.0/7 would be rejected because it spans outside 10.0.0.0/8.
 *
 * @param network - Normalised 32-bit unsigned network address
 * @param prefix  - CIDR prefix length (0-32)
 */
export function isRfc1918Cidr(network: number, prefix: number): boolean {
  const n = network >>> 0;

  // 10.0.0.0/8 — first octet must be 10, prefix >= 8
  if ((n >>> 24) === 10 && prefix >= 8) return true;

  // 172.16.0.0/12 — first 12 bits must be 0xAC1 (172.16-172.31), prefix >= 12
  if ((n >>> 20) === 0xac1 && prefix >= 12) return true;

  // 192.168.0.0/16 — first 16 bits must be 0xC0A8 (192.168), prefix >= 16
  if ((n >>> 16) === 0xc0a8 && prefix >= 16) return true;

  return false;
}
