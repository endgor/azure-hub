import type { LeafSubnet } from '@/lib/subnetCalculator';

/**
 * Compressed leaf subnet representation for sharing.
 * Uses abbreviated field names to reduce URL length.
 * n = network address, p = prefix, c = color, m = memo/comment
 */
interface ShareableLeaf {
  n: number; // Network address (32-bit unsigned int)
  p: number; // CIDR prefix (0-32)
  c?: string; // Row background color (hex)
  m?: string; // User comment/memo
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
  rowComments
}: BuildSharePlanOptions): ShareableSubnetPlan {
  const shareLeaves: ShareableLeaf[] = [...leaves]
    .sort((a, b) => a.network - b.network)
    .map((leaf) => {
      const entry: ShareableLeaf = {
        n: leaf.network,
        p: leaf.prefix
      };
      const color = rowColors[leaf.id];
      const comment = rowComments[leaf.id]?.trim();
      // Only include optional fields if set (reduce payload size)
      if (color) {
        entry.c = color;
      }
      if (comment) {
        entry.m = comment;
      }
      return entry;
    });

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
 *
 * Security measures:
 * - Validates all required fields and types
 * - Sanitizes color codes (must be valid hex)
 * - Limits comment length to 2000 chars
 * - Ensures unsigned integers for network addresses
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

    const cleanedLeaves: ShareableLeaf[] = [];
    leaves.forEach((leaf) => {
      if (!leaf || typeof leaf !== 'object') {
        return; // Skip invalid leaf
      }
      const { n, p, c, m } = leaf as ShareableLeaf;
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
  if (typeof window === 'undefined') {
    // Node.js: use native Buffer API with base64url encoding
    return Buffer.from(value, 'utf-8').toString('base64url');
  }

  // Browser: manually convert UTF-8 to Base64, then to Base64URL
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  // Convert Base64 to Base64URL
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes Base64URL string back to UTF-8 string.
 * Handles both Node.js and browser environments.
 * Automatically adds padding if missing (Base64URL omits it).
 */
function decodeBase64Url(encoded: string): string {
  // Convert Base64URL back to standard Base64
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

  if (typeof window === 'undefined') {
    // Node.js: use native Buffer API
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  // Browser: add padding and decode
  const padded = base64 + '==='.slice((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}
