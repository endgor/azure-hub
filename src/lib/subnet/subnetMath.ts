/**
 * Subnet capacity calculations and address range operations.
 * Provides functions for calculating usable IP ranges, host counts, and address counts.
 */

import { NetworkType } from './types';

/**
 * Ensures a number is treated as an unsigned 32-bit integer.
 */
const toUint32 = (value: number): number => value >>> 0;

/** Returns total number of addresses in subnet (2^(32-prefix)) */
export function subnetAddressCount(prefix: number): number {
  if (prefix < 0 || prefix > 32) {
    throw new Error('Invalid prefix length');
  }
  return 2 ** (32 - prefix);
}

/** Returns the last (broadcast) address in the subnet */
export function subnetLastAddress(network: number, prefix: number): number {
  return toUint32(network + subnetAddressCount(prefix) - 1);
}

/** Alias for prefixToMask - converts prefix to netmask */
export function subnetNetmask(prefix: number): number {
  return prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : toUint32(~((1 << (32 - prefix)) - 1));
}

/**
 * Returns usable IP range (RFC standard).
 * For /31 and /32, all IPs are usable (RFC 3021).
 * Otherwise, excludes network address and broadcast address.
 */
export function usableRange(network: number, prefix: number): {
  first: number;
  last: number;
} {
  if (prefix >= 31) {
    const last = subnetLastAddress(network, prefix);
    return { first: network, last };
  }

  const first = network + 1; // Skip network address
  const last = subnetLastAddress(network, prefix) - 1; // Skip broadcast
  return { first, last };
}

/**
 * Returns usable host count (RFC standard).
 * /32 = 1 host, /31 = 2 hosts, others = total - 2 (network + broadcast)
 */
export function hostCapacity(prefix: number): number {
  if (prefix === 32) {
    return 1;
  }

  if (prefix === 31) {
    return 2;
  }

  return Math.max(subnetAddressCount(prefix) - 2, 0);
}

/**
 * Returns usable IP range for Azure VNets.
 * Azure reserves first 3 IPs (.0, .1, .2, .3) and last IP (broadcast).
 * Minimum usable subnet is /29 (8 IPs total, 3 usable after reservations).
 */
export function usableRangeAzure(network: number, prefix: number): {
  first: number;
  last: number;
} | null {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return null; // Too small for Azure (need at least 6 IPs)
  }
  const first = network + 4; // Skip Azure reserved IPs (.0-.3)
  const last = subnetLastAddress(network, prefix) - 1; // Skip broadcast
  if (first > last) {
    return null;
  }
  return { first, last };
}

/**
 * Returns usable host count for Azure VNets.
 * Azure reserves 5 IPs total (first 4 + broadcast).
 */
export function hostCapacityAzure(prefix: number): number {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return 0;
  }
  return total - 5;
}

/**
 * Returns usable IP range based on network type.
 * - VNET: Uses standard RFC rules (no Azure reservations at VNet level)
 * - SUBNET: Uses Azure subnet rules (reserves first 4 + broadcast)
 * - UNASSIGNED: Defaults to Azure subnet rules for safety
 */
export function usableRangeByType(
  network: number,
  prefix: number,
  networkType: NetworkType = NetworkType.UNASSIGNED
): {
  first: number;
  last: number;
} | null {
  if (networkType === NetworkType.VNET) {
    // VNets don't have Azure IP reservations - they're just address spaces
    const range = usableRange(network, prefix);
    return range;
  }

  // Subnets and unassigned use Azure reservation rules
  return usableRangeAzure(network, prefix);
}

/**
 * Returns usable host count based on network type.
 * - VNET: Uses standard RFC rules
 * - SUBNET: Uses Azure subnet rules (reserves 5 IPs)
 * - UNASSIGNED: Defaults to Azure subnet rules for safety
 */
export function hostCapacityByType(
  prefix: number,
  networkType: NetworkType = NetworkType.UNASSIGNED
): number {
  if (networkType === NetworkType.VNET) {
    // VNets use standard host capacity (no Azure reservations)
    return hostCapacity(prefix);
  }

  // Subnets and unassigned use Azure reservation rules
  return hostCapacityAzure(prefix);
}
