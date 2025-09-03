import { promises as dns } from 'dns';
import path from 'path';
import { promises as fs } from 'fs';
import { isIP } from 'net';
import IPCIDR from 'ip-cidr';
import { AzureIpAddress, AzureCloudName, AzureServiceTagsRoot, AzureCloudVersions, AzureFileMetadata } from '../types/azure';
import { getCachedNormalization } from './normalization';

// Directory paths - using single source of truth in public directory
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// In-memory cache with global module-level persistence
let azureIpAddressCache: AzureIpAddress[] | null = null;
let azureVersionsCache: AzureCloudVersions | null = null;
let ipCacheExpiry = 0;
let versionsCacheExpiry = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (longer for better cold start performance)

// Pre-compiled regex pattern for service/region tags
const tagRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;

// Promise used to load data when cache is empty or expired
let loadPromise: Promise<AzureIpAddress[]> | null = null;

export interface SearchOptions {
  region?: string;
  service?: string;
}


/**
 * Search for Azure IP addresses by region and/or service
 */
export async function searchAzureIpAddresses(options: SearchOptions): Promise<AzureIpAddress[]> {
  const { region, service } = options;
  
  if (!region && !service) {
    return [];
  }
  
  const azureIpAddressList = await getAzureIpAddressListFromCache();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    console.log('No Azure IP address data available');
    return [];
  }
  
  let results = [...azureIpAddressList];
  
  // Filter by region if specified
  if (region) {
    const regionLower = region.toLowerCase();
    const normalizedRegion = getCachedNormalization(regionLower.replace(/([a-z])([A-Z])/g, '$1 $2'));
    results = results.filter(ip => {
      const ipRegion = ip.region;
      if (!ipRegion) return false;
      const ipRegionLower = ipRegion.toLowerCase();
      if (ipRegionLower === regionLower) return true;
      if (ipRegionLower.includes(regionLower)) return true;
      const normalizedIpRegion = getCachedNormalization(ipRegionLower.replace(/([a-z])([A-Z])/g, '$1 $2'));
      return normalizedIpRegion.includes(normalizedRegion);
    });
  }

  // Filter by service if specified
  if (service) {
    const serviceLower = service.toLowerCase();
    const normalizedSearch = getCachedNormalization(serviceLower);
    results = results.filter(ip => {
      if (ip.systemService) {
        const systemServiceLower = ip.systemService.toLowerCase();
        const normalizedSystem = getCachedNormalization(systemServiceLower);
        if (systemServiceLower === serviceLower || normalizedSystem === normalizedSearch) {
          return true;
        }
        if (normalizedSystem.includes(normalizedSearch) || normalizedSearch.includes(normalizedSystem)) {
          return true;
        }
      }
      const serviceTagIdLower = ip.serviceTagId.toLowerCase();
      const normalizedTagId = getCachedNormalization(serviceTagIdLower);
      return normalizedTagId.includes(normalizedSearch) || normalizedSearch.includes(normalizedTagId);
    });
  }
  
  console.log(`Found ${results.length} IP ranges matching filters: ${JSON.stringify({ region, service })}`);
  return results;
}

/**
 * Get file metadata information
 */
export async function getFileMetadata(): Promise<AzureFileMetadata[]> {
  try {
    const metadataPath = path.join(DATA_DIR, 'file-metadata.json');
    const fileContent = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(fileContent) as AzureFileMetadata[];
  } catch (error) {
    console.error('Error loading file metadata:', error);
    return [];
  }
}

/**
 * Get Azure cloud version information
 */
export async function getAzureCloudVersions(): Promise<AzureCloudVersions> {
  const now = Date.now();
  
  // Return from memory cache if valid
  if (azureVersionsCache && now < versionsCacheExpiry) {
    console.log('Returning cached version data');
    return azureVersionsCache;
  }

  const versions: AzureCloudVersions = {};
  const clouds = Object.values(AzureCloudName);
  
  // Process files in parallel
  const versionPromises = clouds.map(async (cloud) => {
    try {
      const filePath = path.join(DATA_DIR, `${cloud}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent) as AzureServiceTagsRoot;
      return { cloud, version: data.changeNumber };
    } catch (error) {
      console.error(`Error loading version for cloud ${cloud}:`, error);
      return { cloud, version: null };
    }
  });
  
  const results = await Promise.all(versionPromises);
  
  // Build versions object
  for (const { cloud, version } of results) {
    if (version !== null) {
      versions[cloud as keyof AzureCloudVersions] = version.toString();
    }
  }
  
  // Cache the versions
  azureVersionsCache = versions;
  versionsCacheExpiry = now + CACHE_TTL;

  console.log('Loaded Azure cloud versions:', versions);
  return versions;
}

export async function getAzureIpAddressList(ipOrDomain: string): Promise<AzureIpAddress[] | null> {
  // Handle CIDR notation specially (e.g., "10.0.0.0/24")
  if (ipOrDomain.includes('/')) {
    try {
      console.log(`Looking up IP CIDR range: ${ipOrDomain}`);
      const cidr = new IPCIDR(ipOrDomain);
      
      const azureIpAddressList = await getAzureIpAddressListFromCache();
      if (!azureIpAddressList) return null;
      
      // For CIDR, we need to check if any Azure IP ranges overlap with the given CIDR
      const result: AzureIpAddress[] = [];
      
      for (const azureIpAddress of azureIpAddressList) {
        try {
          const azureCidr = new IPCIDR(azureIpAddress.ipAddressPrefix);
          
          // Check for any overlap between the two CIDR blocks
          if (cidr.contains(azureCidr.start()) || cidr.contains(azureCidr.end()) || 
              azureCidr.contains(cidr.start()) || azureCidr.contains(cidr.end())) {
            
            // Create copy with the search CIDR as reference
            const matchedAddress = { 
              ...azureIpAddress,
              ipAddress: ipOrDomain  // Store the input CIDR for display in the UI
            };
            result.push(matchedAddress);
          }
        } catch (error) {
          console.error(`Error checking CIDR overlap for ${azureIpAddress.ipAddressPrefix}:`, error);
        }
      }
      
      if (result.length > 0) {
        console.log(`Found ${result.length} matching Azure IP ranges for CIDR: ${ipOrDomain}`);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error(`Invalid CIDR notation: ${ipOrDomain}`, error);
      return null;
    }
  }
  
  // Handle Service.Region format (e.g., "Storage.WestEurope")
  if (ipOrDomain.includes('.') && /^[a-zA-Z]/.test(ipOrDomain)) {
    const parts = ipOrDomain.split('.');
    if (parts.length === 2 && tagRegex.test(parts[0]) && tagRegex.test(parts[1])) {
      console.log(`Looking up service tag with region: ${ipOrDomain}`);
      const [service, region] = parts;
      const serviceLower = service.toLowerCase();
      const regionLower = region.toLowerCase();

      const azureIpAddressList = await getAzureIpAddressListFromCache();
      if (!azureIpAddressList) return null;

      const result = azureIpAddressList.filter(ip => {
        const matchesService = ip.systemService &&
          ip.systemService.toLowerCase() === serviceLower;
        const matchesRegion = ip.region &&
          ip.region.toLowerCase().includes(regionLower);
        return matchesService && matchesRegion;
      });

      if (result.length > 0) {
        console.log(`Found ${result.length} IP ranges for service: ${service} in region: ${region}`);
        return result;
      }
    }
  }

  // Handle direct service tag lookups (like "Storage")
  if (tagRegex.test(ipOrDomain)) {
    console.log(`Looking up service tag: ${ipOrDomain}`);
    const azureIpAddressList = await getAzureIpAddressListFromCache();
    if (!azureIpAddressList) return null;
    
    // Convert input to lowercase for case-insensitive comparison - cached
    const searchLower = ipOrDomain.toLowerCase();
    const normalizedSearch = getCachedNormalization(searchLower);
    
    // Enhanced service tag lookup with improved case-insensitive matching
    const result = azureIpAddressList.filter(ip => {
      // Check systemService with multiple matching approaches
      if (ip.systemService) {
        const systemServiceLower = ip.systemService.toLowerCase();
        const normalizedSystem = getCachedNormalization(systemServiceLower);
        
        // Try exact match or normalized match
        if (systemServiceLower === searchLower || normalizedSystem === normalizedSearch) {
          return true;
        }
        
        // Try substring match
        if (normalizedSystem.includes(normalizedSearch) || normalizedSearch.includes(normalizedSystem)) {
          return true;
        }
      }
      
      // Check serviceTagId with similar approach - cached
      const serviceTagIdLower = ip.serviceTagId.toLowerCase();
      const normalizedTagId = getCachedNormalization(serviceTagIdLower);
      
      return normalizedTagId === normalizedSearch || 
             normalizedTagId.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedTagId);
    });
    
    if (result.length > 0) {
      console.log(`Found ${result.length} IP ranges for service: ${ipOrDomain}`);
      return result;
    }
  }

  // Try to parse as an IP address or resolve domain
  const ipAddress = await parseIpAddress(ipOrDomain);
  if (!ipAddress) {
    console.log(`Cannot parse ${ipOrDomain} to a valid IP address`);
    return null;
  }

  const azureIpAddressList = await getAzureIpAddressListFromCache();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    console.log('No Azure IP address data available');
    return null;
  }
  
  const result: AzureIpAddress[] = [];

  for (const azureIpAddress of azureIpAddressList) {
    try {
      const cidr = new IPCIDR(azureIpAddress.ipAddressPrefix);
      if (cidr.contains(ipAddress)) {
        const matchingAddress = { ...azureIpAddress, ipAddress };
        console.log(`Found match: ${JSON.stringify(matchingAddress)}`);
        result.push(matchingAddress);
      }
    } catch (error) {
      console.error(`Error checking IP network ${azureIpAddress.ipAddressPrefix}:`, error);
    }
  }

  if (result.length === 0) {
    console.log(`${ipAddress} is not a known Azure IP address`);
  }

  return result.length > 0 ? result : null;
}

async function parseIpAddress(ipOrDomain: string): Promise<string | null> {
  if (!ipOrDomain) {
    return null;
  }

  // Handle CIDR notation specially - for lookup purposes, we'll use the network address
  if (ipOrDomain.includes('/')) {
    try {
      // Use IPCIDR to get the proper network address
      const cidr = new IPCIDR(ipOrDomain);
      return cidr.start();
    } catch (cidrError) {
      console.error(`Invalid CIDR notation: ${ipOrDomain}`, cidrError);
      // Fall through to other methods below
    }
  }

  try {
    // Check if input is already an IP address (both IPv4 and IPv6)
    if (isIP(ipOrDomain)) {
      return ipOrDomain;
    }

    // Try to resolve domain name to IP address using DNS promises API
    try {
      // Try lookup first (uses getaddrinfo under the hood, respects host file)
      const addresses = await dns.lookup(ipOrDomain);
      return addresses.address;
    } catch (lookupError) {
      // Fallback to resolve4 which uses DNS protocol directly
      try {
        const addresses = await dns.resolve4(ipOrDomain);
        if (addresses && addresses.length > 0) {
          return addresses[0]; // Return the first IPv4 address
        }
        return null;
      } catch (resolveError) {
        console.error(`DNS resolution failed for ${ipOrDomain}`);
        return null;
      }
    }
  } catch (error) {
    console.error(`Error parsing ipOrDomain ${ipOrDomain}:`, error);
    return null;
  }
}

async function getAzureIpAddressListFromCache(): Promise<AzureIpAddress[]> {
  const now = Date.now();

  if (azureIpAddressCache && now < ipCacheExpiry) {
    console.log(`Returning cached data (${azureIpAddressCache.length} entries)`);
    return azureIpAddressCache;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        console.log('Loading Azure IP data from files...');
        const azureIpAddressList = await loadAzureIpAddressListFromFiles();
        azureIpAddressCache = azureIpAddressList;
        ipCacheExpiry = Date.now() + CACHE_TTL;
        console.log(`Loaded and cached ${azureIpAddressList.length} IP ranges`);
        return azureIpAddressList;
      } catch (error) {
        console.error('Error loading Azure IP address list:', error);
        return [];
      } finally {
        loadPromise = null;
      }
    })();
  }

  return loadPromise;
}

async function loadAzureIpAddressListFromFiles(): Promise<AzureIpAddress[]> {
  const azureIpAddressList: AzureIpAddress[] = [];
  
  // Get all cloud types
  const clouds = Object.values(AzureCloudName);
  
  // Process files in parallel for better performance
  const fileReadPromises = clouds.map(async (cloud) => {
    try {
      const filePath = path.join(DATA_DIR, `${cloud}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      console.log(`Loaded ${cloud} IP data from public/data directory`);
      const azureServiceTagsCollection = JSON.parse(fileContent) as AzureServiceTagsRoot;
      const cloudResults: AzureIpAddress[] = [];
      
      // Process service tags more efficiently
      for (const azureServiceTag of azureServiceTagsCollection.values) {
        const baseEntry = {
          serviceTagId: azureServiceTag.id,
          region: azureServiceTag.properties.region,
          regionId: azureServiceTag.properties.regionId,
          systemService: azureServiceTag.properties.systemService,
          networkFeatures: azureServiceTag.properties.networkFeatures?.join(' ') || ''
        };
        
        // Create entries for each address prefix
        for (const addressPrefix of azureServiceTag.properties.addressPrefixes) {
          cloudResults.push({
            ...baseEntry,
            ipAddressPrefix: addressPrefix
          });
        }
      }
      
      return cloudResults;
    } catch (error) {
      console.error(`Error loading data for cloud ${cloud}:`, error);
      return [];
    }
  });
  
  // Wait for all files to be processed
  const results = await Promise.all(fileReadPromises);
  
  // Flatten results
  for (const cloudResults of results) {
    azureIpAddressList.push(...cloudResults);
  }
  
  console.log(`Loaded ${azureIpAddressList.length} IP address ranges from ${clouds.length} cloud files`);
  return azureIpAddressList;
}

/**
 * Get all unique service tags from Azure data
 */
export async function getAllServiceTags(): Promise<string[]> {
  const azureIpAddressList = await getAzureIpAddressListFromCache();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    console.log('No Azure IP address data available');
    return [];
  }
  
  // Get unique service tags
  const serviceTagsSet = new Set<string>();
  
  azureIpAddressList.forEach(ip => {
    serviceTagsSet.add(ip.serviceTagId);
  });
  
  // Convert to array and sort
  const serviceTags = Array.from(serviceTagsSet).sort();
  
  console.log(`Found ${serviceTags.length} unique service tags`);
  return serviceTags;
}

/**
 * Get all IP ranges for a specific service tag
 */
export async function getServiceTagDetails(serviceTag: string): Promise<AzureIpAddress[]> {
  const azureIpAddressList = await getAzureIpAddressListFromCache();
  if (!azureIpAddressList || azureIpAddressList.length === 0) {
    console.log('No Azure IP address data available');
    return [];
  }
  
  // Filter by exact service tag match
  const result = azureIpAddressList.filter(ip => 
    ip.serviceTagId.toLowerCase() === serviceTag.toLowerCase()
  );
  
  console.log(`Found ${result.length} IP ranges for service tag: ${serviceTag}`);
  return result;
}
