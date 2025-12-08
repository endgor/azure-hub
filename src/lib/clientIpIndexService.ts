import { CACHE_TTL_MS } from '@/config/constants';
import { AzureCloudName } from '@/types/azure';

/**
 * Lightweight service for loading IP data indexes.
 * These indexes contain only metadata (names, counts) without full IP lists.
 * Perfect for dropdowns, autocomplete, and pages that don't need actual IP addresses.
 */

export interface ServiceTagIndex {
  id: string;
  systemService: string;
  region: string;
  prefixCount: number;
  cloud: AzureCloudName;
}

interface RegionIndex {
  region: string;
  serviceCount: number;
  prefixCount: number;
  cloud: AzureCloudName;
}

// In-memory caches
let serviceTagsIndexCache: ServiceTagIndex[] | null = null;
let regionsIndexCache: RegionIndex[] | null = null;
let serviceTagsCacheExpiry = 0;
let regionsCacheExpiry = 0;

/**
 * Loads lightweight service tags index (~400 KB vs 3.9 MB full data).
 * Contains service tag names, regions, and prefix counts but NOT actual IP addresses.
 * Use this for pages that only need to list service tags.
 */
export async function loadServiceTagsIndex(): Promise<ServiceTagIndex[]> {
  const now = Date.now();

  if (serviceTagsIndexCache && serviceTagsCacheExpiry > now) {
    return serviceTagsIndexCache;
  }

  try {
    const response = await fetch('/data/service-tags-index.json');
    if (!response.ok) {
      throw new Error(`Failed to load service tags index: ${response.statusText}`);
    }

    const data = await response.json();
    serviceTagsIndexCache = data;
    serviceTagsCacheExpiry = now + CACHE_TTL_MS;

    return data;
  } catch (error) {
    throw new Error(`Failed to load service tags index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Loads lightweight regions index (~6 KB).
 * Contains region names with service counts and prefix counts but NOT actual IP addresses.
 * Use this for pages that only need to list regions.
 */
export async function loadRegionsIndex(): Promise<RegionIndex[]> {
  const now = Date.now();

  if (regionsIndexCache && regionsCacheExpiry > now) {
    return regionsIndexCache;
  }

  try {
    const response = await fetch('/data/regions-index.json');
    if (!response.ok) {
      throw new Error(`Failed to load regions index: ${response.statusText}`);
    }

    const data = await response.json();
    regionsIndexCache = data;
    regionsCacheExpiry = now + CACHE_TTL_MS;

    return data;
  } catch (error) {
    throw new Error(`Failed to load regions index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets list of all service tag IDs from lightweight index.
 * This is 10x faster and uses 90% less bandwidth than loading full data.
 */
export async function getAllServiceTagIds(): Promise<string[]> {
  const index = await loadServiceTagsIndex();
  return index.map(tag => tag.id).sort();
}

/**
 * Gets full service tag index with cloud information.
 * Use this when you need to display which cloud each service tag belongs to.
 */
export async function getAllServiceTagsWithCloud(): Promise<ServiceTagIndex[]> {
  return loadServiceTagsIndex();
}

/**
 * Gets list of all regions from lightweight index.
 */
export async function getAllRegions(): Promise<string[]> {
  const index = await loadRegionsIndex();
  return index.map(region => region.region).sort();
}

/**
 * Gets metadata for a specific service tag without loading full IP addresses.
 */
export async function getServiceTagMetadata(serviceTagId: string): Promise<ServiceTagIndex | null> {
  const index = await loadServiceTagsIndex();
  return index.find(tag => tag.id.toLowerCase() === serviceTagId.toLowerCase()) || null;
}

/**
 * Search service tags by query (lightweight, metadata only).
 * For actual IP address lookup, use the full clientIpService.
 */
export async function searchServiceTags(query: string): Promise<ServiceTagIndex[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const index = await loadServiceTagsIndex();
  const queryLower = query.toLowerCase();

  return index.filter(tag => {
    return (
      tag.id.toLowerCase().includes(queryLower) ||
      tag.systemService.toLowerCase().includes(queryLower) ||
      tag.region.toLowerCase().includes(queryLower)
    );
  });
}
