import IPCIDR from 'ip-cidr';
import { AzureIpAddress, AzureCloudName } from '../types/azure';
import { matchesSearchTerm } from './utils/searchMatcher';
import { CACHE_TTL_MS } from '@/config/constants';

/** Per-cloud cache for Azure IP data */
const cloudCache: Map<AzureCloudName, { data: AzureIpAddress[]; expiry: number }> = new Map();

/** All Azure cloud environments to load */
const ALL_CLOUDS: AzureCloudName[] = [
  AzureCloudName.AzureCloud,
  AzureCloudName.AzureChinaCloud,
  AzureCloudName.AzureUSGovernment
];

export interface SearchOptions {
  region?: string; // Region name (e.g., "westeurope", "East US")
  service?: string; // Service name or tag (e.g., "AzureStorage", "SQL")
}

/**
 * Loads and caches Azure IP ranges for a specific cloud from static JSON file.
 * Data structure: Service tags containing IP address prefixes.
 * Flattens nested structure into searchable flat list of IP ranges.
 *
 * Cache behavior:
 * - Returns cached data if available and not expired (< 6 hours old)
 * - Otherwise fetches from /data/{cloud}.json and caches result
 */
async function loadAzureIpData(cloud: AzureCloudName): Promise<AzureIpAddress[]> {
  const now = Date.now();
  const cached = cloudCache.get(cloud);

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const response = await fetch(`/data/${cloud}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load Azure IP data for ${cloud}: ${response.statusText}`);
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
            networkFeatures: properties.networkFeatures?.join(', ') || '',
            cloud
          });
        }
      }
    }

    // Update cache
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

/**
 * Checks if an IP address belongs to Azure by testing against all CIDR ranges
 * across all Azure clouds (Public, China, Government).
 * Returns all matching service tags with their cloud environment.
 *
 * IMPORTANT: Returns cloned objects to prevent cache pollution.
 */
export async function checkIpAddress(ipAddress: string): Promise<AzureIpAddress[]> {
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

/**
 * Searches Azure IP ranges by region and/or service name
 * across all Azure clouds (Public, China, Government).
 *
 * IMPORTANT: Returns cloned objects to prevent cache pollution.
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
 * Retrieves all IP ranges for a specific service tag.
 * Optionally filters by cloud environment.
 */
export async function getServiceTagDetails(serviceTag: string, cloud?: AzureCloudName): Promise<AzureIpAddress[]> {
  const azureIpData = await loadAllCloudsIpData();
  return azureIpData.filter(ip => {
    const matchesTag = ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase();
    if (!matchesTag) return false;
    if (cloud) return ip.cloud === cloud;
    return true;
  });
}

