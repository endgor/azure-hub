import type { LeafSubnet } from '@/lib/subnetCalculator';

interface ShareableLeaf {
  n: number;
  p: number;
  c?: string;
  m?: string;
}

export interface ShareableSubnetPlan {
  v: number;
  net: number;
  pre: number;
  az?: 1;
  leaves: ShareableLeaf[];
}

interface BuildSharePlanOptions {
  baseNetwork: number;
  basePrefix: number;
  useAzureReservations: boolean;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;
}

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

export function serialiseShareableSubnetPlan(plan: ShareableSubnetPlan): string {
  const json = JSON.stringify(plan);
  return encodeBase64Url(json);
}

export function parseShareableSubnetPlan(encoded: string): ShareableSubnetPlan | null {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const { v, net, pre, az, leaves } = parsed as ShareableSubnetPlan;
    if (v !== 1 || typeof net !== 'number' || typeof pre !== 'number' || !Array.isArray(leaves)) {
      return null;
    }

    const cleanedLeaves: ShareableLeaf[] = [];
    leaves.forEach((leaf) => {
      if (!leaf || typeof leaf !== 'object') {
        return;
      }
      const { n, p, c, m } = leaf as ShareableLeaf;
      if (typeof n !== 'number' || typeof p !== 'number') {
        return;
      }
      const entry: ShareableLeaf = {
        n: n >>> 0,
        p
      };
      if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) {
        entry.c = c;
      }
      if (typeof m === 'string' && m.trim().length > 0) {
        entry.m = m.trim().slice(0, 2000);
      }
      cleanedLeaves.push(entry);
    });

    if (cleanedLeaves.length === 0) {
      return null;
    }

    return {
      v: 1,
      net: net >>> 0,
      pre,
      az: az === 1 ? 1 : undefined,
      leaves: cleanedLeaves
    };
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64url');
  }

  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof window === 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  const padded = base64 + '==='.slice((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}
