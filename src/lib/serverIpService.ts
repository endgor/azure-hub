import { promises as fs } from 'fs';
import path from 'path';
import { AzureIpAddress, AzureCloudName } from '../types/azure';
import { matchesSearchTerm } from './utils/searchMatcher';
import { CACHE_TTL_MS } from '@/config/constants';
import { ipv4ToUint32, ipv6ToHex, cidrToRange, isIPv6 } from './ipUtils';

/**
 * Server-side IP service that loads Azure IP data from disk.
 * Uses a pre-built numeric index for O(log n) IP lookups via binary search.
 *
 * Benefits vs client-side approach:
 * - No large downloads to client (typical response < 10KB vs 4MB)
 * - Binary search on pre-computed numeric ranges (~5ms vs ~1000ms)
 * - Better caching across all users
 * - Reduced mobile data usage
 */

/** Per-cloud cache for Azure IP data (used by search/filter functions) */
const cloudCache: Map<AzureCloudName, { data: AzureIpAddress[]; expiry: number }> = new Map();

/** All Azure cloud environments to search */
const ALL_CLOUDS: AzureCloudName[] = [
  AzureCloudName.AzureCloud,
  AzureCloudName.AzureChinaCloud,
  AzureCloudName.AzureUSGovernment
];

export interface SearchOptions {
  region?: string;
  service?: string;
}

// --- Lookup Index Types ---

interface MetaEntry {
  t: string; // serviceTagId
  r: string; // region
  ri: string; // regionId
  s: string; // systemService
  n: string; // networkFeatures
  c: string; // cloud name
}

interface IPv6Entry {
  s: string; // start hex
  e: string; // end hex
  m: number; // meta index
  c: string; // original CIDR
}

interface IpLookupIndex {
  version: number;
  meta: MetaEntry[];
  ipv4: number[];
  ipv4Cidrs: string[];
  ipv4MaxSpan: number;
  ipv6: IPv6Entry[];
}

// --- Lookup Index Cache ---

let lookupIndexCache: { data: IpLookupIndex; expiry: number } | null = null;

async function loadLookupIndex(): Promise<IpLookupIndex | null> {
  const now = Date.now();
  if (lookupIndexCache && lookupIndexCache.expiry > now) {
    return lookupIndexCache.data;
  }

  try {
    const indexPath = path.join(process.cwd(), 'public', 'data', 'ip-lookup-index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    const data = JSON.parse(content) as IpLookupIndex;
    lookupIndexCache = { data, expiry: now + CACHE_TTL_MS };
    return data;
  } catch (error) {
    console.warn(
      'Failed to load IP lookup index, falling back to linear scan:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// --- Binary Search Lookup ---

function metaToAzureIpAddress(m: MetaEntry, cidr: string): AzureIpAddress {
  return {
    serviceTagId: m.t,
    ipAddressPrefix: cidr,
    region: m.r,
    regionId: m.ri,
    systemService: m.s,
    networkFeatures: m.n,
    cloud: m.c as AzureCloudName,
  };
}

/**
 * Binary search: find rightmost index where ipv4[i*3] <= target.
 * Returns -1 if all starts are greater than target.
 */
function upperBoundIpv4(ipv4: number[], target: number, count: number): number {
  let lo = 0;
  let hi = count - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (ipv4[mid * 3] <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function lookupIpv4Single(index: IpLookupIndex, ipNum: number): AzureIpAddress[] {
  const { ipv4, ipv4Cidrs, ipv4MaxSpan, meta } = index;
  const count = ipv4Cidrs.length;
  const matches: AzureIpAddress[] = [];

  const rightmost = upperBoundIpv4(ipv4, ipNum, count);
  if (rightmost < 0) return matches;

  // Scan backward from rightmost, collecting matches
  for (let i = rightmost; i >= 0; i--) {
    const start = ipv4[i * 3];
    const end = ipv4[i * 3 + 1];

    // Early termination: if ipNum - start exceeds max span, no prior range can contain ipNum
    if (ipNum - start > ipv4MaxSpan) break;

    if (end >= ipNum) {
      const metaIdx = ipv4[i * 3 + 2];
      matches.push(metaToAzureIpAddress(meta[metaIdx], ipv4Cidrs[i]));
    }
  }

  return matches;
}

function lookupIpv4Cidr(index: IpLookupIndex, qStart: number, qEnd: number): AzureIpAddress[] {
  const { ipv4, ipv4Cidrs, ipv4MaxSpan, meta } = index;
  const count = ipv4Cidrs.length;
  const matches: AzureIpAddress[] = [];

  // Find Azure ranges that fully contain the queried CIDR: start <= qStart AND end >= qEnd
  const rightmost = upperBoundIpv4(ipv4, qStart, count);
  if (rightmost < 0) return matches;

  for (let i = rightmost; i >= 0; i--) {
    const start = ipv4[i * 3];
    const end = ipv4[i * 3 + 1];

    if (qStart - start > ipv4MaxSpan) break;

    if (start <= qStart && end >= qEnd) {
      const metaIdx = ipv4[i * 3 + 2];
      matches.push(metaToAzureIpAddress(meta[metaIdx], ipv4Cidrs[i]));
    }
  }

  return matches;
}

/**
 * Binary search on IPv6 entries: find rightmost index where entry.s <= target.
 */
function upperBoundIpv6(entries: IPv6Entry[], target: string): number {
  let lo = 0;
  let hi = entries.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (entries[mid].s <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function lookupIpv6Single(index: IpLookupIndex, ipHex: string): AzureIpAddress[] {
  const { ipv6, meta } = index;
  const matches: AzureIpAddress[] = [];

  const rightmost = upperBoundIpv6(ipv6, ipHex);
  if (rightmost < 0) return matches;

  // Scan backward — IPv6 ranges are generally smaller, scan is bounded
  for (let i = rightmost; i >= 0; i--) {
    const entry = ipv6[i];
    if (entry.e >= ipHex) {
      matches.push(metaToAzureIpAddress(meta[entry.m], entry.c));
    }
    // Heuristic early termination: if we've moved far enough back, stop
    // For IPv6 we check if the first 8 hex chars (top 32 bits) differ significantly
    if (ipHex.substring(0, 8) > entry.s.substring(0, 8)) break;
  }

  return matches;
}

function lookupIpv6Cidr(index: IpLookupIndex, qStartHex: string, qEndHex: string): AzureIpAddress[] {
  const { ipv6, meta } = index;
  const matches: AzureIpAddress[] = [];

  const rightmost = upperBoundIpv6(ipv6, qStartHex);
  if (rightmost < 0) return matches;

  for (let i = rightmost; i >= 0; i--) {
    const entry = ipv6[i];
    if (entry.s <= qStartHex && entry.e >= qEndHex) {
      matches.push(metaToAzureIpAddress(meta[entry.m], entry.c));
    }
    if (qStartHex.substring(0, 8) > entry.s.substring(0, 8)) break;
  }

  return matches;
}

async function checkIpAddressWithIndex(index: IpLookupIndex, ipAddress: string): Promise<AzureIpAddress[]> {
  const isCidr = ipAddress.includes('/');

  if (isCidr) {
    const range = cidrToRange(ipAddress);
    if (range.isV6) {
      return lookupIpv6Cidr(index, range.start as string, range.end as string);
    } else {
      return lookupIpv4Cidr(index, range.start as number, range.end as number);
    }
  }

  if (isIPv6(ipAddress)) {
    const hex = ipv6ToHex(ipAddress);
    return lookupIpv6Single(index, hex);
  } else {
    const num = ipv4ToUint32(ipAddress);
    return lookupIpv4Single(index, num);
  }
}

// --- Raw Data Functions (used by search/filter/service tags) ---

/**
 * Loads Azure IP data for a specific cloud from the filesystem.
 * Caches in memory for 6 hours to avoid repeated file reads.
 */
async function loadAzureIpData(cloud: AzureCloudName): Promise<AzureIpAddress[]> {
  const now = Date.now();
  const cached = cloudCache.get(cloud);

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', `${cloud}.json`);
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const ipRanges: AzureIpAddress[] = [];

    if (data.values && Array.isArray(data.values)) {
      for (const serviceTag of data.values) {
        const { name: serviceTagId, properties } = serviceTag;
        const { addressPrefixes = [], systemService, region } = properties || {};

        for (const ipRange of addressPrefixes) {
          ipRanges.push({
            serviceTagId,
            ipAddressPrefix: ipRange,
            region: region || '',
            regionId: properties.regionId?.toString() || '',
            systemService: systemService || '',
            networkFeatures: properties.networkFeatures?.join(', ') || '',
            cloud
          });
        }
      }
    }

    cloudCache.set(cloud, { data: ipRanges, expiry: now + CACHE_TTL_MS });

    return ipRanges;
  } catch (error) {
    throw new Error(`Failed to load Azure IP data for ${cloud}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Loads IP data from all Azure clouds (Public, China, Government).
 * Each cloud is loaded in parallel for performance.
 */
async function loadAllCloudsIpData(): Promise<AzureIpAddress[]> {
  const results = await Promise.all(ALL_CLOUDS.map(loadAzureIpData));
  return results.flat();
}

// --- Fallback: Linear scan using ip-cidr (used if index fails to load) ---

async function checkIpAddressFallback(ipAddress: string): Promise<AzureIpAddress[]> {
  // Dynamic import to avoid bundling ip-cidr when the index is available
  const IPCIDR = (await import('ip-cidr')).default;
  const azureIpRanges = await loadAllCloudsIpData();
  const matches: AzureIpAddress[] = [];

  for (const azureIpRange of azureIpRanges) {
    try {
      const cidr = new IPCIDR(azureIpRange.ipAddressPrefix);
      if (cidr.contains(ipAddress)) {
        matches.push({ ...azureIpRange });
      }
    } catch {
      continue;
    }
  }

  return matches;
}

// --- Public API ---

/**
 * Checks if an IP address or CIDR belongs to Azure by using the pre-built
 * numeric index with binary search. Falls back to linear IPCIDR scan if
 * the index is unavailable.
 */
export async function checkIpAddress(ipAddress: string): Promise<AzureIpAddress[]> {
  const index = await loadLookupIndex();
  if (index) {
    return checkIpAddressWithIndex(index, ipAddress);
  }
  return checkIpAddressFallback(ipAddress);
}

/**
 * Searches Azure IP ranges by region and/or service name
 * across all Azure clouds (Public, China, Government).
 */
export async function searchAzureIpAddresses(options: SearchOptions): Promise<AzureIpAddress[]> {
  const regionFilter = options.region?.trim();
  const serviceFilter = options.service?.trim();
  const hasRegionFilter = Boolean(regionFilter);
  const hasServiceFilter = Boolean(serviceFilter);

  if (!hasRegionFilter && !hasServiceFilter) {
    return [];
  }

  const azureIpAddressList = await loadAllCloudsIpData();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    return [];
  }

  let results = azureIpAddressList;

  if (hasRegionFilter && regionFilter) {
    results = results.filter(ip => matchesSearchTerm(ip.region, regionFilter));
  }

  if (hasServiceFilter && serviceFilter) {
    results = results.filter(ip => {
      if (ip.systemService && matchesSearchTerm(ip.systemService, serviceFilter)) {
        return true;
      }
      return matchesSearchTerm(ip.serviceTagId, serviceFilter);
    });
  }

  return results.map(ip => ({ ...ip }));
}

/**
 * Returns sorted list of all unique service tag names from all clouds.
 */
export async function getAllServiceTags(): Promise<string[]> {
  const azureIpData = await loadAllCloudsIpData();
  const serviceTags = new Set(azureIpData.map(ip => ip.serviceTagId));
  return Array.from(serviceTags).sort();
}

/**
 * Retrieves all IP ranges for a specific service tag from all clouds.
 */
export async function getServiceTagDetails(serviceTag: string): Promise<AzureIpAddress[]> {
  const azureIpData = await loadAllCloudsIpData();
  return azureIpData.filter(ip =>
    ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase()
  );
}
