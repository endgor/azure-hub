import IPCIDR from 'ip-cidr';
import { promises as fs } from 'fs';
import path from 'path';
import { AzureIpAddress } from '../types/azure';
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

let azureIpAddressCache: AzureIpAddress[] | null = null;
let ipCacheExpiry = 0;

export interface SearchOptions {
  region?: string;
  service?: string;
}

/**
 * Loads Azure IP data from the filesystem (server-side only).
 * Caches in memory for 6 hours to avoid repeated file reads.
 */
async function loadAzureIpData(): Promise<AzureIpAddress[]> {
  const now = Date.now();

  if (azureIpAddressCache && ipCacheExpiry > now) {
    return azureIpAddressCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'AzureCloud.json');
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
            networkFeatures: properties.networkFeatures?.join(', ') || ''
          });
        }
      }
    }

    azureIpAddressCache = ipRanges;
    ipCacheExpiry = now + CACHE_TTL_MS;

    return ipRanges;
  } catch (error) {
    throw new Error(`Failed to load Azure IP data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if an IP address belongs to Azure by testing against all CIDR ranges.
 * Returns all matching service tags.
 */
export async function checkIpAddress(ipAddress: string): Promise<AzureIpAddress[]> {
  const azureIpRanges = await loadAzureIpData();
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
 * Searches Azure IP ranges by region and/or service name.
 */
export async function searchAzureIpAddresses(options: SearchOptions): Promise<AzureIpAddress[]> {
  const { region, service } = options;

  if (!region && !service) {
    return [];
  }

  const azureIpAddressList = await loadAzureIpData();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    return [];
  }

  let results = azureIpAddressList;

  if (region) {
    results = results.filter(ip => matchesSearchTerm(ip.region, region));
  }

  if (service) {
    results = results.filter(ip => {
      if (ip.systemService && matchesSearchTerm(ip.systemService, service)) {
        return true;
      }
      return matchesSearchTerm(ip.serviceTagId, service);
    });
  }

  return results.map(ip => ({ ...ip }));
}

/**
 * Returns sorted list of all unique service tag names.
 */
export async function getAllServiceTags(): Promise<string[]> {
  const azureIpData = await loadAzureIpData();
  const serviceTags = new Set(azureIpData.map(ip => ip.serviceTagId));
  return Array.from(serviceTags).sort();
}

/**
 * Retrieves all IP ranges for a specific service tag.
 */
export async function getServiceTagDetails(serviceTag: string): Promise<AzureIpAddress[]> {
  const azureIpData = await loadAzureIpData();
  return azureIpData.filter(ip =>
    ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase()
  );
}
