import { promises as dns } from 'dns';
import path from 'path';
import fs from 'fs';
import IPCIDR from 'ip-cidr';
import { AzureIpAddress, AzureCloudName, AzureServiceTagsRoot } from '../types/azure';

// Directory paths
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// In-memory cache
let azureIpAddressCache: AzureIpAddress[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

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
      const normalizedRegion = region.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      const normalizedIpRegion = ip.region.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      
      return normalizedIpRegion.includes(normalizedRegion);
    });
  }
  
  // Filter by service if specified
  if (service) {
    results = results.filter(ip => {
      // Convert search term and target data to lowercase for case-insensitive comparison
      const serviceLower = service.toLowerCase();
      
      // Match by systemService first with exact or partial matching
      if (ip.systemService) {
        const systemServiceLower = ip.systemService.toLowerCase();
        
        // Try exact match first
        if (systemServiceLower === serviceLower) {
          return true;
        }
        
        // Try normalized forms (remove spaces, dashes)
        const normalizedSearch = serviceLower.replace(/[-\s]/g, '');
        const normalizedSystem = systemServiceLower.replace(/[-\s]/g, '');
        
        if (normalizedSystem === normalizedSearch) {
          return true;
        }
        
        // Try substring match last
        if (normalizedSystem.includes(normalizedSearch) || 
            normalizedSearch.includes(normalizedSystem)) {
          return true;
        }
      }
      
      // Then by serviceTagId with similar approach
      const serviceTagIdLower = ip.serviceTagId.toLowerCase();
      const normalizedSearch = serviceLower.replace(/[-\s]/g, '');
      const normalizedTagId = serviceTagIdLower.replace(/[-\s]/g, '');
      
      return normalizedTagId.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedTagId);
    });
  }
  
  console.log(`Found ${results.length} IP ranges matching filters: ${JSON.stringify({ region, service })}`);
  return results;
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
    if (parts.length === 2 && /^[a-zA-Z]/.test(parts[0]) && /^[a-zA-Z]/.test(parts[1])) {
      console.log(`Looking up service tag with region: ${ipOrDomain}`);
      const [service, region] = parts;
      
      const azureIpAddressList = await getAzureIpAddressListFromCache();
      if (!azureIpAddressList) return null;
      
      const result = azureIpAddressList.filter(ip => {
        const matchesService = ip.systemService && 
          ip.systemService.toLowerCase() === service.toLowerCase();
        const matchesRegion = ip.region && 
          ip.region.toLowerCase().includes(region.toLowerCase());
        return matchesService && matchesRegion;
      });
      
      if (result.length > 0) {
        console.log(`Found ${result.length} IP ranges for service: ${service} in region: ${region}`);
        return result;
      }
    }
  }
  
  // Handle direct service tag lookups (like "Storage")
  const serviceTagRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;
  if (serviceTagRegex.test(ipOrDomain)) {
    console.log(`Looking up service tag: ${ipOrDomain}`);
    const azureIpAddressList = await getAzureIpAddressListFromCache();
    if (!azureIpAddressList) return null;
    
    // Convert input to lowercase for case-insensitive comparison
    const searchLower = ipOrDomain.toLowerCase();
    const normalizedSearch = searchLower.replace(/[-\s]/g, '');
    
    // Enhanced service tag lookup with improved case-insensitive matching
    const result = azureIpAddressList.filter(ip => {
      // Check systemService with multiple matching approaches
      if (ip.systemService) {
        const systemServiceLower = ip.systemService.toLowerCase();
        const normalizedSystem = systemServiceLower.replace(/[-\s]/g, '');
        
        // Try exact match or normalized match
        if (systemServiceLower === searchLower || normalizedSystem === normalizedSearch) {
          return true;
        }
        
        // Try substring match
        if (normalizedSystem.includes(normalizedSearch) || normalizedSearch.includes(normalizedSystem)) {
          return true;
        }
      }
      
      // Check serviceTagId with similar approach
      const serviceTagIdLower = ip.serviceTagId.toLowerCase();
      const normalizedTagId = serviceTagIdLower.replace(/[-\s]/g, '');
      
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
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6})?::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ipOrDomain) || ipv6Regex.test(ipOrDomain)) {
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
  
  // Return from memory cache if valid
  if (azureIpAddressCache && now < cacheExpiry) {
    return azureIpAddressCache;
  }

  try {
    // Load from local files
    const azureIpAddressList = await loadAzureIpAddressListFromFiles();
    
    // Update memory cache
    azureIpAddressCache = azureIpAddressList;
    cacheExpiry = now + CACHE_TTL;
    
    return azureIpAddressList;
  } catch (error) {
    console.error('Error loading Azure IP address list:', error);
    return [];
  }
}

async function loadAzureIpAddressListFromFiles(): Promise<AzureIpAddress[]> {
  const azureIpAddressList: AzureIpAddress[] = [];
  
  // Get all cloud types
  const clouds = Object.values(AzureCloudName);
  
  for (const cloud of clouds) {
    try {
      let fileContent: string | null = null;
      let sourceLocation: string = '';
      
      // In server context, prefer reading from the data directory (absolute source of truth)
      const dataFilePath = path.join(DATA_DIR, `${cloud}.json`);
      if (fs.existsSync(dataFilePath)) {
        try {
          fileContent = fs.readFileSync(dataFilePath, 'utf8');
          sourceLocation = 'data directory';
        } catch (dataReadError) {
          console.error(`Error reading file from data directory: ${dataReadError}`);
          // Will try public directory next
        }
      }
      
      // If not found in data directory or in client context, try public directory
      if (!fileContent) {
        const publicFilePath = path.join(PUBLIC_DATA_DIR, `${cloud}.json`);
        if (fs.existsSync(publicFilePath)) {
          try {
            fileContent = fs.readFileSync(publicFilePath, 'utf8');
            sourceLocation = 'public directory';
          } catch (publicReadError) {
            console.error(`Error reading file from public directory: ${publicReadError}`);
          }
        } else {
          console.log(`File not found in public directory: ${publicFilePath}`);
        }
      }
      
      // If we still don't have file content, skip this cloud
      if (!fileContent) {
        console.log(`Could not find or read data file for ${cloud} in any location`);
        continue;
      }
      
      console.log(`Loaded ${cloud} IP data from ${sourceLocation}`);
      
      // Parse the file content
      const azureServiceTagsCollection = JSON.parse(fileContent) as AzureServiceTagsRoot;
      
      for (const azureServiceTag of azureServiceTagsCollection.values) {
        for (const addressPrefix of azureServiceTag.properties.addressPrefixes) {
          azureIpAddressList.push({
            serviceTagId: azureServiceTag.id,
            ipAddressPrefix: addressPrefix,
            region: azureServiceTag.properties.region,
            regionId: azureServiceTag.properties.regionId,
            systemService: azureServiceTag.properties.systemService,
            networkFeatures: azureServiceTag.properties.networkFeatures ? 
              azureServiceTag.properties.networkFeatures.join(' ') : ''
          });
        }
      }
    } catch (error) {
      console.error(`Error loading data for cloud ${cloud}:`, error);
    }
  }
  
  console.log(`Loaded ${azureIpAddressList.length} IP address ranges`);
  return azureIpAddressList;
}
