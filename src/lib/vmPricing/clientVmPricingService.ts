import { CACHE_TTL_MS } from '@/config/constants';
import type { VmCurrency, VmPricingIndex, VmRegionPrices, VmSkuCatalog, VmSkuSpec } from '@/types/vmPricing';

const BASE_PATH = '/data/vm-pricing';

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

let indexCache: CacheEntry<VmPricingIndex> | null = null;
let catalogCache: CacheEntry<VmSkuCatalog> | null = null;
const regionCache = new Map<string, CacheEntry<VmRegionPrices>>();

const inflight = new Map<string, Promise<unknown>>();

/** Collapses concurrent requests for the same file into one fetch. */
function dedupe<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = load().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function loadPricingIndex(): Promise<VmPricingIndex> {
  const now = Date.now();
  if (indexCache && indexCache.expiry > now) return indexCache.value;

  return dedupe(`${BASE_PATH}/index.json`, async () => {
    const value = await fetchJson<VmPricingIndex>(`${BASE_PATH}/index.json`, 'VM pricing index');
    indexCache = { value, expiry: Date.now() + CACHE_TTL_MS };
    return value;
  });
}

export async function loadSkuCatalog(): Promise<VmSkuCatalog> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiry > now) return catalogCache.value;

  return dedupe(`${BASE_PATH}/skus.json`, async () => {
    const value = await fetchJson<VmSkuCatalog>(`${BASE_PATH}/skus.json`, 'VM SKU catalogue');
    catalogCache = { value, expiry: Date.now() + CACHE_TTL_MS };
    return value;
  });
}

export async function loadRegionPrices(region: string, currency: VmCurrency): Promise<VmRegionPrices> {
  const key = `${currency.toLowerCase()}/${region}`;
  const now = Date.now();

  const cached = regionCache.get(key);
  if (cached && cached.expiry > now) return cached.value;

  return dedupe(key, async () => {
    const value = await fetchJson<VmRegionPrices>(`${BASE_PATH}/${key}.json`, `prices for ${region}`);
    regionCache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
    return value;
  });
}

/** Loads several regions at once for cross-region comparison. */
export async function loadRegionPricesBatch(
  regions: string[],
  currency: VmCurrency
): Promise<Map<string, VmRegionPrices>> {
  const results = await Promise.all(
    regions.map(async (region) => {
      try {
        return [region, await loadRegionPrices(region, currency)] as const;
      } catch {
        return null;
      }
    })
  );

  return new Map(results.filter((entry): entry is readonly [string, VmRegionPrices] => entry !== null));
}

export function buildSkuLookup(catalog: VmSkuCatalog): Map<string, VmSkuSpec> {
  return new Map(catalog.skus.map((sku) => [sku.sku, sku]));
}
