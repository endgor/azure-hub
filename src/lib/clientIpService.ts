import IPCIDR from 'ip-cidr';
import { AzureIpAddress } from '../types/azure';
import { matchesSearchTerm } from './utils/searchMatcher';
import { CACHE_TTL_MS } from '@/config/constants';

/**
 * In-memory cache for Azure IP data and versions.
 * Reduces API calls and improves performance on repeated lookups.
 * Cache expires after 6 hours to balance freshness with performance.
 */
let azureIpAddressCache: AzureIpAddress[] | null = null;
let ipCacheExpiry = 0;

export interface SearchOptions {
  region?: string; // Region name (e.g., "westeurope", "East US")
  service?: string; // Service name or tag (e.g., "AzureStorage", "SQL")
}

/**
 * Loads and caches Azure Public Cloud IP ranges from static JSON file.
 * Data structure: Service tags containing IP address prefixes.
 * Flattens nested structure into searchable flat list of IP ranges.
 *
 * Cache behavior:
 * - Returns cached data if available and not expired (< 6 hours old)
 * - Otherwise fetches from /data/AzureCloud.json and caches result
 *
 * Data source is updated periodically by build scripts (see scripts/updateIpData.ts).
 */
async function loadAzureIpData(): Promise<AzureIpAddress[]> {
  const now = Date.now();

  if (azureIpAddressCache && ipCacheExpiry > now) {
    return azureIpAddressCache; // Return cached data
  }

  try {
    const response = await fetch('/data/AzureCloud.json');
    if (!response.ok) {
      throw new Error(`Failed to load Azure IP data: ${response.statusText}`);
    }

    const data = await response.json();
    const ipRanges: AzureIpAddress[] = [];

    // Process service tags: each tag contains multiple IP prefixes
    if (data.values && Array.isArray(data.values)) {
      for (const serviceTag of data.values) {
        const { name: serviceTagId, properties } = serviceTag;
        const { addressPrefixes = [], systemService, region } = properties || {};

        // Flatten: one entry per IP prefix
        for (const ipRange of addressPrefixes) {
          ipRanges.push({
            serviceTagId,
            ipAddressPrefix: ipRange,
            region: region || '',
            regionId: properties.regionId?.toString() || '',
            systemService: systemService || '',
            networkFeatures: properties.networkFeatures?.join(', ') || ''
          });
        }
      }
    }

    // Update cache
    azureIpAddressCache = ipRanges;
    ipCacheExpiry = now + CACHE_TTL_MS;

    return ipRanges;
  } catch (error) {
    throw new Error(`Failed to load Azure IP data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if an IP address belongs to Azure by testing against all CIDR ranges.
 * Uses ip-cidr library for accurate CIDR containment checking.
 * Returns all matching service tags (an IP may belong to multiple tags).
 *
 * Example: "13.107.42.14" might match both "AzureFrontDoor.Frontend" and "AzureFrontDoor.FirstParty"
 *
 * IMPORTANT: Returns cloned objects to prevent cache pollution when callers
 * mutate results (e.g., adding DNS resolution metadata).
 */
export async function checkIpAddress(ipAddress: string): Promise<AzureIpAddress[]> {
  const azureIpRanges = await loadAzureIpData();
  const matches: AzureIpAddress[] = [];

  for (const azureIpRange of azureIpRanges) {
    try {
      const cidr = new IPCIDR(azureIpRange.ipAddressPrefix);
      if (cidr.contains(ipAddress)) {
        // Clone the object to prevent mutations from affecting the cache
        matches.push({ ...azureIpRange });
      }
    } catch {
      // Skip invalid CIDR ranges (malformed data)
      continue;
    }
  }

  return matches;
}

/**
 * Searches Azure IP ranges by region and/or service name.
 * Filters are cumulative (AND logic): results must match all specified filters.
 *
 * Search behavior:
 * - Region: matches against the 'region' field
 * - Service: matches against both 'systemService' and 'serviceTagId'
 * - Uses fuzzy matching (handles camelCase variations, substring matches)
 *
 * Returns empty array if no filters specified.
 *
 * IMPORTANT: Returns cloned objects to prevent cache pollution.
 */
export async function searchAzureIpAddresses(options: SearchOptions): Promise<AzureIpAddress[]> {
  const regionFilter = options.region?.trim();
  const serviceFilter = options.service?.trim();
  const hasRegionFilter = Boolean(regionFilter);
  const hasServiceFilter = Boolean(serviceFilter);

  if (!hasRegionFilter && !hasServiceFilter) {
    return []; // Require at least one filter
  }

  const azureIpAddressList = await loadAzureIpData();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    return [];
  }

  let results = azureIpAddressList;

  // Filter by region (if specified)
  if (hasRegionFilter && regionFilter) {
    results = results.filter(ip => matchesSearchTerm(ip.region, regionFilter));
  }

  // Filter by service (if specified)
  if (hasServiceFilter && serviceFilter) {
    results = results.filter(ip => {
      // Check systemService first (e.g., "AzureStorage")
      if (ip.systemService && matchesSearchTerm(ip.systemService, serviceFilter)) {
        return true;
      }
      // Then check serviceTagId (e.g., "Storage.WestEurope")
      return matchesSearchTerm(ip.serviceTagId, serviceFilter);
    });
  }

  // Clone all results to prevent cache pollution
  return results.map(ip => ({ ...ip }));
}

/**
 * Returns sorted list of all unique service tag names.
 * Used for populating dropdown/autocomplete UI elements.
 */
export async function getAllServiceTags(): Promise<string[]> {
  const azureIpData = await loadAzureIpData();
  const serviceTags = new Set(azureIpData.map(ip => ip.serviceTagId));
  return Array.from(serviceTags).sort();
}

/**
 * Retrieves all IP ranges for a specific service tag (case-insensitive).
 * Example: "Storage.WestEurope" returns all IP prefixes for that tag.
 */
export async function getServiceTagDetails(serviceTag: string): Promise<AzureIpAddress[]> {
  const azureIpData = await loadAzureIpData();
  return azureIpData.filter(ip =>
    ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase()
  );
}

