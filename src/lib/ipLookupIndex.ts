import type { AzureCloudName, AzureIpAddress } from '@/types/azure';
import { matchesSearchTerm } from './utils/searchMatcher';
import {
  cidrToRange,
  hexToIpv6,
  ipv4RangeEnd,
  ipv4ToUint32,
  ipv6HexRangeEnd,
  ipv6ToHex,
  isIPv6,
  uint32ToIpv4
} from './ipUtils';

/**
 * Pre-sorted index behind /api/ipLookup. Built at data-update time, loaded once per
 * server process and searched with binary search. Range ends and CIDR strings are
 * derived from start + prefix at load time, which keeps the file at roughly half the
 * size of storing them.
 */

export const IP_LOOKUP_INDEX_VERSION = 2;

export interface IpLookupMeta {
  t: string; // serviceTagId
  r: string; // region
  ri: string; // regionId
  s: string; // systemService
  n: string; // networkFeatures
  c: string; // cloud name
}

/** On-disk shape of public/data/ip-lookup-index.json. All entry arrays are parallel. */
export interface IpLookupIndexFile {
  version: typeof IP_LOOKUP_INDEX_VERSION;
  meta: IpLookupMeta[];
  /** Sorted by start, then by end ascending */
  ipv4Start: number[];
  ipv4Prefix: number[];
  ipv4Meta: number[];
  /** 32-char lowercase hex, sorted the same way */
  ipv6Start: string[];
  ipv6Prefix: number[];
  ipv6Meta: number[];
}

export interface ServiceTagCloudDocument {
  cloud: AzureCloudName | string;
  values?: Array<{
    name: string;
    properties?: {
      addressPrefixes?: string[];
      systemService?: string;
      region?: string;
      regionId?: string | number;
      networkFeatures?: string[];
    };
  }>;
}

export interface IpLookupBuildStats {
  meta: number;
  ipv4: number;
  ipv6: number;
  skipped: number;
}

/** In-memory form used for lookups */
export interface PreparedIpLookupIndex {
  meta: IpLookupMeta[];
  v4Start: Uint32Array;
  v4End: Uint32Array;
  v4Prefix: Uint8Array;
  v4Meta: Uint32Array;
  /** Widest IPv4 range, bounds the backward scan after the binary search */
  v4MaxSpan: number;
  v6Start: string[];
  v6End: string[];
  v6Prefix: Uint8Array;
  v6Meta: Uint32Array;
  /** Smallest IPv6 prefix length; the first floor(n/4) hex chars are fixed within any range */
  v6MinPrefix: number;
}

// --- Build ---

export function buildIpLookupIndex(clouds: ServiceTagCloudDocument[]): {
  index: IpLookupIndexFile;
  stats: IpLookupBuildStats;
} {
  const metaMap = new Map<string, number>();
  const meta: IpLookupMeta[] = [];
  const v4: Array<{ start: number; end: number; prefix: number; meta: number }> = [];
  const v6: Array<{ start: string; end: string; prefix: number; meta: number }> = [];
  let skipped = 0;

  for (const document of clouds) {
    for (const tag of document.values ?? []) {
      const { name: serviceTagId, properties } = tag;
      const { addressPrefixes = [], systemService, region, regionId, networkFeatures } = properties ?? {};
      if (addressPrefixes.length === 0) continue;

      const metaKey = `${document.cloud}:${serviceTagId}:${region ?? ''}`;
      let metaIdx = metaMap.get(metaKey);
      if (metaIdx === undefined) {
        metaIdx = meta.length;
        metaMap.set(metaKey, metaIdx);
        meta.push({
          t: serviceTagId,
          r: region ?? '',
          ri: regionId?.toString() ?? '',
          s: systemService ?? '',
          n: networkFeatures?.join(', ') ?? '',
          c: String(document.cloud)
        });
      }

      for (const cidr of addressPrefixes) {
        const prefix = parseInt(cidr.split('/')[1], 10);
        if (!Number.isInteger(prefix)) {
          skipped++;
          continue;
        }

        try {
          const range = cidrToRange(cidr);
          if (range.isV6) {
            v6.push({ start: range.start as string, end: range.end as string, prefix, meta: metaIdx });
          } else {
            v4.push({ start: range.start as number, end: range.end as number, prefix, meta: metaIdx });
          }
        } catch {
          skipped++;
        }
      }
    }
  }

  v4.sort((a, b) => a.start - b.start || a.end - b.end);
  v6.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.end < b.end ? -1 : a.end > b.end ? 1 : 0));

  return {
    index: {
      version: IP_LOOKUP_INDEX_VERSION,
      meta,
      ipv4Start: v4.map((e) => e.start),
      ipv4Prefix: v4.map((e) => e.prefix),
      ipv4Meta: v4.map((e) => e.meta),
      ipv6Start: v6.map((e) => e.start),
      ipv6Prefix: v6.map((e) => e.prefix),
      ipv6Meta: v6.map((e) => e.meta)
    },
    stats: { meta: meta.length, ipv4: v4.length, ipv6: v6.length, skipped }
  };
}

// --- Load ---

export function prepareIpLookupIndex(file: IpLookupIndexFile): PreparedIpLookupIndex {
  if (file.version !== IP_LOOKUP_INDEX_VERSION) {
    throw new Error(`Unsupported IP lookup index version ${String(file.version)}; regenerate with npm run generate-ip-lookup-index`);
  }

  const v4Count = file.ipv4Start.length;
  const v4Start = Uint32Array.from(file.ipv4Start);
  const v4Prefix = Uint8Array.from(file.ipv4Prefix);
  const v4Meta = Uint32Array.from(file.ipv4Meta);
  const v4End = new Uint32Array(v4Count);
  let v4MaxSpan = 0;
  for (let i = 0; i < v4Count; i++) {
    v4End[i] = ipv4RangeEnd(v4Start[i], v4Prefix[i]);
    const span = v4End[i] - v4Start[i];
    if (span > v4MaxSpan) v4MaxSpan = span;
  }

  const v6Count = file.ipv6Start.length;
  const v6Prefix = Uint8Array.from(file.ipv6Prefix);
  const v6End = new Array<string>(v6Count);
  let v6MinPrefix = 128;
  for (let i = 0; i < v6Count; i++) {
    v6End[i] = ipv6HexRangeEnd(file.ipv6Start[i], v6Prefix[i]);
    if (v6Prefix[i] < v6MinPrefix) v6MinPrefix = v6Prefix[i];
  }

  return {
    meta: file.meta,
    v4Start,
    v4End,
    v4Prefix,
    v4Meta,
    v4MaxSpan,
    v6Start: file.ipv6Start,
    v6End,
    v6Prefix,
    v6Meta: Uint32Array.from(file.ipv6Meta),
    v6MinPrefix
  };
}

// --- Lookup ---

function toAzureIpAddress(meta: IpLookupMeta, cidr: string): AzureIpAddress {
  return {
    serviceTagId: meta.t,
    ipAddressPrefix: cidr,
    region: meta.r,
    regionId: meta.ri,
    systemService: meta.s,
    networkFeatures: meta.n,
    cloud: meta.c as AzureCloudName
  };
}

function v4Entry(index: PreparedIpLookupIndex, i: number): AzureIpAddress {
  return toAzureIpAddress(index.meta[index.v4Meta[i]], `${uint32ToIpv4(index.v4Start[i])}/${index.v4Prefix[i]}`);
}

function v6Entry(index: PreparedIpLookupIndex, i: number): AzureIpAddress {
  return toAzureIpAddress(index.meta[index.v6Meta[i]], `${hexToIpv6(index.v6Start[i])}/${index.v6Prefix[i]}`);
}

/** Rightmost i with starts[i] <= target, or -1 */
function upperBound<T>(count: number, target: T, startAt: (i: number) => T): number {
  let lo = 0;
  let hi = count - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (startAt(mid) <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** Azure ranges that fully contain [qStart, qEnd] */
function lookupV4(index: PreparedIpLookupIndex, qStart: number, qEnd: number): AzureIpAddress[] {
  const { v4Start, v4End, v4MaxSpan } = index;
  const matches: AzureIpAddress[] = [];

  for (let i = upperBound(v4Start.length, qStart, (k) => v4Start[k]); i >= 0; i--) {
    // No earlier range can reach qStart once the gap exceeds the widest range
    if (qStart - v4Start[i] > v4MaxSpan) break;
    if (v4End[i] >= qEnd) matches.push(v4Entry(index, i));
  }

  return matches;
}

function lookupV6(index: PreparedIpLookupIndex, qStartHex: string, qEndHex: string): AzureIpAddress[] {
  const { v6Start, v6End, v6MinPrefix } = index;
  const matches: AzureIpAddress[] = [];
  const safeChars = Math.floor(v6MinPrefix / 4);
  const qPrefix = qStartHex.substring(0, safeChars);

  for (let i = upperBound(v6Start.length, qStartHex, (k) => v6Start[k]); i >= 0; i--) {
    if (v6End[i] >= qEndHex) matches.push(v6Entry(index, i));
    if (safeChars > 0 && qPrefix > v6Start[i].substring(0, safeChars)) break;
  }

  return matches;
}

/** Find every Azure range containing an IP address or CIDR block */
export function lookupIpInIndex(index: PreparedIpLookupIndex, query: string): AzureIpAddress[] {
  if (query.includes('/')) {
    const range = cidrToRange(query);
    return range.isV6
      ? lookupV6(index, range.start as string, range.end as string)
      : lookupV4(index, range.start as number, range.end as number);
  }

  if (isIPv6(query)) {
    const hex = ipv6ToHex(query);
    return lookupV6(index, hex, hex);
  }

  const value = ipv4ToUint32(query);
  return lookupV4(index, value, value);
}

export interface IpIndexSearchFilters {
  region?: string;
  service?: string;
}

/** Every range whose service tag matches the region and/or service filters */
export function searchIpIndex(index: PreparedIpLookupIndex, filters: IpIndexSearchFilters): AzureIpAddress[] {
  const region = filters.region?.trim();
  const service = filters.service?.trim();
  if (!region && !service) return [];

  const matchingMeta = new Set<number>();
  index.meta.forEach((meta, i) => {
    if (region && !matchesSearchTerm(meta.r, region)) return;
    if (service && !matchesSearchTerm(meta.s, service) && !matchesSearchTerm(meta.t, service)) return;
    matchingMeta.add(i);
  });
  if (matchingMeta.size === 0) return [];

  const results: AzureIpAddress[] = [];
  for (let i = 0; i < index.v4Start.length; i++) {
    if (matchingMeta.has(index.v4Meta[i])) results.push(v4Entry(index, i));
  }
  for (let i = 0; i < index.v6Start.length; i++) {
    if (matchingMeta.has(index.v6Meta[i])) results.push(v6Entry(index, i));
  }
  return results;
}
