import { cachedJson } from '@/lib/cachedJson';
import type { VmPricingIndex, VmRegionPrices, VmSkuCatalog } from '@/types/vmPricing';

const BASE_PATH = '/data/vm-pricing';

export function loadPricingIndex(): Promise<VmPricingIndex> {
  return cachedJson<VmPricingIndex>(`${BASE_PATH}/index.json`);
}

export function loadSkuCatalog(): Promise<VmSkuCatalog> {
  return cachedJson<VmSkuCatalog>(`${BASE_PATH}/skus.json`);
}

/** Prices are stored once in the base currency; conversion happens at render time. */
export function loadRegionPrices(region: string): Promise<VmRegionPrices> {
  return cachedJson<VmRegionPrices>(`${BASE_PATH}/prices/${region}.json`);
}
