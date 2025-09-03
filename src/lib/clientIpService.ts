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
    return [];
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
    results = results.filter(ip => {
      if (!ip.region) return false;
      
      // Try exact match first (case insensitive)
      if (ip.region.toLowerCase() === region.toLowerCase()) {
        return true;
      }
      
      // Then try substring match
      if (ip.region.toLowerCase().includes(region.toLowerCase())) {
        return true;
      }
      
      // Try to match "WestEurope" with "westeurope" or "West Europe"
      const normalizedRegion = getCachedNormalization(region.replace(/([a-z])([A-Z])/g, '$1 $2'));
      const normalizedIpRegion = getCachedNormalization(ip.region.replace(/([a-z])([A-Z])/g, '$1 $2'));
      
      return normalizedIpRegion.includes(normalizedRegion);
    });
  }
  
  // Filter by service if specified
  if (service) {
    results = results.filter(ip => {
      const serviceLower = service.toLowerCase();
      
      // Match by systemService first
      if (ip.systemService) {
        const systemServiceLower = ip.systemService.toLowerCase();
        
        if (systemServiceLower === serviceLower) {
          return true;
        }
        
        const normalizedSearch = getCachedNormalization(serviceLower);
        const normalizedSystem = getCachedNormalization(systemServiceLower);
        
        if (normalizedSystem === normalizedSearch) {
          return true;
        }
        
        if (normalizedSystem.includes(normalizedSearch) || 
            normalizedSearch.includes(normalizedSystem)) {
          return true;
        }
      }
      
      // Then by serviceTagId
      const serviceTagIdLower = ip.serviceTagId.toLowerCase();
      const normalizedSearch = getCachedNormalization(serviceLower);
      const normalizedTagId = getCachedNormalization(serviceTagIdLower);
      
      return normalizedTagId.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedTagId);
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
 * Get file metadata information
 */
/**
 * Get version information for all clouds
 */
export async function getVersions(): Promise<AzureCloudVersions> {
  const now = Date.now();
  
  // Check if cache is valid
  if (azureVersionsCache && versionsCacheExpiry > now) {
    return azureVersionsCache;
  }

  try {
    const response = await fetch('/data/versions.json');
    if (!response.ok) {
      throw new Error(`Failed to load versions: ${response.statusText}`);
    }

    const versions = await response.json();
    azureVersionsCache = versions;
    versionsCacheExpiry = now + CACHE_TTL;

    return versions;
  } catch (error) {
    return {
      AzureCloud: { version: 'unknown', lastModified: '' },
      AzureChinaCloud: { version: 'unknown', lastModified: '' },
      AzureUSGovernment: { version: 'unknown', lastModified: '' }
    };
  }
}