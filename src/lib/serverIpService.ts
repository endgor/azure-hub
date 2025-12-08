import IPCIDR from 'ip-cidr';
import { promises as fs } from 'fs';
import path from 'path';
import { AzureIpAddress, AzureCloudName } from '../types/azure';
import { matchesSearchTerm } from './utils/searchMatcher';
import { CACHE_TTL_MS } from '@/config/constants';

/**
 * Server-side IP service that loads Azure IP data from disk.
 * This keeps the 4MB+ dataset on the server and returns only matching results.
 *
 * Benefits vs client-side approach:
 * - No large downloads to client (typical response < 10KB vs 4MB)
 * - Faster CIDR parsing on server CPU
 * - Better caching across all users
 * - Reduced mobile data usage
 */

/** Per-cloud cache for Azure IP data */
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

/**
 * Checks if an IP address belongs to Azure by testing against all CIDR ranges
 * across all Azure clouds (Public, China, Government).
 * Returns all matching service tags with their cloud environment.
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
      // Skip invalid CIDR ranges
      continue;
    }
  }

  return matches;
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
