import { CACHE_TTL_MS } from '@/config/constants';
import { AzureCloudName } from '@/types/azure';

/**
 * Lightweight service for loading the service tag index.
 * The index contains only metadata (names, counts) without full IP lists,
 * so listing pages avoid downloading the multi-megabyte cloud data files.
 */

export interface ServiceTagIndex {
  id: string;
  systemService: string;
  region: string;
  prefixCount: number;
  cloud: AzureCloudName;
}

let serviceTagsIndexCache: ServiceTagIndex[] | null = null;
let serviceTagsCacheExpiry = 0;

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
