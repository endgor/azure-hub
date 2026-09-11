import { cachedJson } from '@/lib/cachedJson';
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

export function loadServiceTagsIndex(): Promise<ServiceTagIndex[]> {
  return cachedJson<ServiceTagIndex[]>('/data/service-tags-index.json');
}
