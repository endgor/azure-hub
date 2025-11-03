import IPCIDR from 'ip-cidr';
import { AzureIpAddress, AzureCloudVersions } from '../types/azure';
import { getCachedNormalization } from './normalization';

// Client-side cache
let azureIpAddressCache: AzureIpAddress[] | null = null;
let azureVersionsCache: AzureCloudVersions | null = null;
let ipCacheExpiry = 0;
let versionsCacheExpiry = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export interface SearchOptions {
  region?: string;
  service?: string;
}

/**
 * Check if a search term matches a target string using various strategies
 */
function matchesSearchTerm(target: string, searchTerm: string): boolean {
  if (!target) return false;

  const targetLower = target.toLowerCase();
  const searchLower = searchTerm.toLowerCase();

  // Substring match (covers exact match too)
  if (targetLower.includes(searchLower)) return true;

  // Normalized match (handles "WestEurope" vs "West Europe")
  const normalizedTarget = getCachedNormalization(target.replace(/([a-z])([A-Z])/g, '$1 $2'));
  const normalizedSearch = getCachedNormalization(searchTerm.replace(/([a-z])([A-Z])/g, '$1 $2'));

  return normalizedTarget.includes(normalizedSearch);
}

/**
 * Load Azure IP data from static files
 */
async function loadAzureIpData(): Promise<AzureIpAddress[]> {
  const now = Date.now();
  
  // Check if cache is valid
  if (azureIpAddressCache && ipCacheExpiry > now) {
    return azureIpAddressCache;
  }

  try {
    // Load the main Azure Public Cloud data
    const response = await fetch('/data/AzureCloud.json');
    if (!response.ok) {
      throw new Error(`Failed to load Azure IP data: ${response.statusText}`);
    }
    
    const data = await response.json();
    const ipRanges: AzureIpAddress[] = [];

    // Process the service tags and extract IP ranges
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

    // Cache the results
    azureIpAddressCache = ipRanges;
    ipCacheExpiry = now + CACHE_TTL;

    return ipRanges;
  } catch (error) {
    throw new Error(`Failed to load Azure IP data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if an IP address is in Azure
 */
export async function checkIpAddress(ipAddress: string): Promise<AzureIpAddress[]> {
  const azureIpRanges = await loadAzureIpData();
  const matches: AzureIpAddress[] = [];
  
  for (const azureIpRange of azureIpRanges) {
    try {
      const cidr = new IPCIDR(azureIpRange.ipAddressPrefix);
      if (cidr.contains(ipAddress)) {
        matches.push(azureIpRange);
      }
    } catch (error) {
      // Skip invalid CIDR ranges
      continue;
    }
  }
  
  return matches;
}

/**
 * Search for Azure IP addresses by region and/or service
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
  
  let results = [...azureIpAddressList];
  
  // Filter by region if specified
  if (region) {
    results = results.filter(ip => matchesSearchTerm(ip.region, region));
  }
  
  // Filter by service if specified
  if (service) {
    results = results.filter(ip => {
      // Match by systemService first
      if (ip.systemService && matchesSearchTerm(ip.systemService, service)) {
        return true;
      }

      // Then by serviceTagId
      return matchesSearchTerm(ip.serviceTagId, service);
    });
  }
  
  return results;
}

/**
 * Get all unique service tags
 */
export async function getAllServiceTags(): Promise<string[]> {
  const azureIpData = await loadAzureIpData();
  const serviceTags = new Set(azureIpData.map(ip => ip.serviceTagId));
  return Array.from(serviceTags).sort();
}

/**
 * Get IP ranges for a specific service tag
 */
export async function getServiceTagDetails(serviceTag: string): Promise<AzureIpAddress[]> {
  const azureIpData = await loadAzureIpData();
  return azureIpData.filter(ip => 
    ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase()
  );
}

/**
 * Get version information for all clouds from file metadata
 */
export async function getVersions(): Promise<AzureCloudVersions> {
  const now = Date.now();

  // Check if cache is valid
  if (azureVersionsCache && versionsCacheExpiry > now) {
    return azureVersionsCache;
  }

  try {
    const response = await fetch('/data/file-metadata.json');
    if (!response.ok) {
      throw new Error(`Failed to load file metadata: ${response.statusText}`);
    }

    const metadata = await response.json();

    // Transform file metadata into versions format
    const versions: AzureCloudVersions = {};
    metadata.forEach((file: any) => {
      const cloudKey = file.cloud as keyof AzureCloudVersions;
      versions[cloudKey] = file.changeNumber.toString();
    });

    azureVersionsCache = versions;
    versionsCacheExpiry = now + CACHE_TTL;

    return versions;
  } catch (error) {
    throw new Error(`Failed to load version data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}