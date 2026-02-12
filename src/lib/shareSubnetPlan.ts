import { Base64 } from 'js-base64';
import type { LeafSubnet, SubnetTree } from '@/lib/subnetCalculator';
import { isRfc1918Cidr, normaliseNetwork } from '@/lib/subnetCalculator';

/**
 * Compressed leaf subnet representation for sharing.
 * Uses abbreviated field names to reduce URL length.
 * n = network address, p = prefix, c = color, m = memo/comment, t = type, f = full/single subnet
 */
interface ShareableLeaf {
  n: number; // Network address (32-bit unsigned int)
  p: number; // CIDR prefix (0-32)
  c?: string; // Row background color (hex)
  m?: string; // User comment/memo
  t?: 'v' | 's'; // Network type: 'v' = VNet, 's' = Subnet (omit for unassigned)
  f?: 1; // Single/full subnet flag: 1 = VNet leaf uses entire range as subnet
}

/**
 * Shareable subnet plan format for encoding in URLs.
 * Uses abbreviated field names to minimize encoded size.
 * v = version, net = network, pre = prefix, az = Azure mode
 */
export interface ShareableSubnetPlan {
  v: number; // Format version (currently 1)
  net: number; // Base network address
  pre: number; // Base prefix
  az?: 1; // Azure reservation mode flag (1 = enabled)
  leaves: ShareableLeaf[]; // List of subnets in plan
}

interface BuildSharePlanOptions {
  baseNetwork: number;
  basePrefix: number;
  useAzureReservations: boolean;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>; // Keyed by leaf ID
  rowComments: Record<string, string>; // Keyed by leaf ID
  tree: SubnetTree; // Tree structure to extract network types
}

/**
 * Builds a compressed, shareable representation of a subnet plan.
 * Omits default/empty values to minimize URL length.
 * Sorts leaves by network address for consistent encoding.
 */
export function buildShareableSubnetPlan({
  baseNetwork,
  basePrefix,
  useAzureReservations,
  leaves,
  rowColors,
  rowComments,
  tree
}: BuildSharePlanOptions): ShareableSubnetPlan {
  // Build shareable entries from actual leaves
  const shareLeaves: ShareableLeaf[] = [...leaves]
    .map((leaf) => {
      const entry: ShareableLeaf = {
        n: leaf.network,
        p: leaf.prefix
      };
      const color = rowColors[leaf.id];
      const comment = rowComments[leaf.id]?.trim();
      const node = tree[leaf.id];
      const networkType = node?.networkType;

      // Only include optional fields if set (reduce payload size)
      if (color) {
        entry.c = color;
      }
      if (comment) {
        entry.m = comment;
      }
      // Serialize network type (omit UNASSIGNED to save space)
      if (networkType === 'vnet') {
        entry.t = 'v';
        // Serialize singleSubnet flag for VNet leaves
        if (node?.singleSubnet) {
          entry.f = 1;
        }
      } else if (networkType === 'subnet') {
        entry.t = 's';
      }
      return entry;
    });

  // Also include VNet parents that have children (locked VNets)
  // These are not leaves but need to be serialized to preserve the VNet type
  Object.values(tree).forEach((node) => {
    if (node.children && node.networkType === 'vnet') {
      const entry: ShareableLeaf = {
        n: node.network,
        p: node.prefix,
        t: 'v'
      };
      const color = rowColors[node.id];
      const comment = rowComments[node.id]?.trim();
      if (color) {
        entry.c = color;
      }
      if (comment) {
        entry.m = comment;
      }
      shareLeaves.push(entry);
    }
  });

  // Sort by network address for consistent encoding
  shareLeaves.sort((a, b) => a.n - b.n);

  return {
    v: 1,
    net: baseNetwork >>> 0,
    pre: basePrefix,
    az: useAzureReservations ? 1 : undefined,
    leaves: shareLeaves
  };
}

/**
 * Serializes a subnet plan to Base64URL-encoded string for URL sharing.
 * Base64URL is URL-safe (no +, /, or = padding characters).
 */
export function serialiseShareableSubnetPlan(plan: ShareableSubnetPlan): string {
  const json = JSON.stringify(plan);
  return encodeBase64Url(json);
}

/**
 * Parses and validates a Base64URL-encoded subnet plan.
 * Returns null if parsing fails or data is invalid.
 */
export function parseShareableSubnetPlan(encoded: string): ShareableSubnetPlan | null {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const { v, net, pre, az, leaves } = parsed as ShareableSubnetPlan;
    if (v !== 1 || typeof net !== 'number' || typeof pre !== 'number' || !Array.isArray(leaves)) {
      return null; // Invalid structure or version
    }

    // Reject plans whose base network is outside RFC 1918 private ranges
    const normalisedBase = normaliseNetwork(net >>> 0, pre);
    if (!isRfc1918Cidr(normalisedBase, pre)) {
      return null;
    }

    const cleanedLeaves: ShareableLeaf[] = [];
    leaves.forEach((leaf) => {
      if (!leaf || typeof leaf !== 'object') {
        return; // Skip invalid leaf
      }
      const { n, p, c, m, t, f } = leaf as ShareableLeaf;
      if (typeof n !== 'number' || typeof p !== 'number') {
        return; // Skip if network or prefix missing
      }
      const entry: ShareableLeaf = {
        n: n >>> 0, // Ensure unsigned integer
        p
      };
      // Validate hex color format
      if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) {
        entry.c = c;
      }
      // Sanitize and limit comment length
      if (typeof m === 'string' && m.trim().length > 0) {
        entry.m = m.trim().slice(0, 2000);
      }
      // Validate network type
      if (t === 'v' || t === 's') {
        entry.t = t;
      }
      // Validate singleSubnet flag (only valid for VNet leaves)
      if (f === 1 && t === 'v') {
        entry.f = 1;
      }
      cleanedLeaves.push(entry);
    });

    if (cleanedLeaves.length === 0) {
      return null; // Plan must have at least one subnet
    }

    return {
      v: 1,
      net: net >>> 0,
      pre,
      az: az === 1 ? 1 : undefined,
      leaves: cleanedLeaves
    };
  } catch {
    return null; // Catch JSON parse errors or decoding failures
  }
}

/**
 * Encodes UTF-8 string to Base64URL format (URL-safe Base64).
 * Base64URL replaces + with -, / with _, and removes = padding.
 * Supports both Node.js (Buffer) and browser (TextEncoder + btoa) environments.
 */
function encodeBase64Url(value: string): string {
  return Base64.encodeURI(value);
}

/**
 * Decodes Base64URL string back to UTF-8 string.
 * Handles both Node.js and browser environments.
 * Automatically adds padding if missing (Base64URL omits it).
 */
function decodeBase64Url(encoded: string): string {
  return Base64.decode(encoded);
}
