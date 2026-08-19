import fs from 'fs';
import path from 'path';
import type { PackedVmPrices, VmPricingIndex, VmSkuCatalog, VmSkuSpec } from '@/types/vmPricing';

/**
 * Build-time only. Reads the generated VM pricing files and transposes them into a
 * per-SKU view so a detail page can show one size across every region without shipping a
 * second copy of the data. Cached at module scope so the 69 region files are read once per
 * build worker rather than once per generated page. Referenced only from getStaticProps,
 * so Next.js strips this module and its fs usage from the client bundle.
 */

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'vm-pricing');

export interface VmRegionPrice {
  region: string;
  displayName: string;
  geography: string;
  cloud: string;
  prices: PackedVmPrices;
}

interface PricingData {
  index: VmPricingIndex;
  catalog: VmSkuCatalog;
  /** SKU name to its prices in every region that lists it */
  bySku: Map<string, VmRegionPrice[]>;
}

let cache: PricingData | null = null;

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function load(): PricingData {
  if (cache) return cache;

  const index = readJson<VmPricingIndex>(path.join(DATA_DIR, 'index.json'));
  const catalog = readJson<VmSkuCatalog>(path.join(DATA_DIR, 'skus.json'));
  const bySku = new Map<string, VmRegionPrice[]>();

  for (const region of index.regions) {
    const file = path.join(DATA_DIR, 'prices', `${region.name}.json`);
    if (!fs.existsSync(file)) continue;

    const { prices } = readJson<{ prices: Record<string, PackedVmPrices> }>(file);

    for (const [sku, packed] of Object.entries(prices)) {
      const entry: VmRegionPrice = {
        region: region.name,
        displayName: region.displayName,
        geography: region.geography,
        cloud: region.cloud,
        prices: packed
      };

      const existing = bySku.get(sku);
      if (existing) {
        existing.push(entry);
      } else {
        bySku.set(sku, [entry]);
      }
    }
  }

  cache = { index, catalog, bySku };
  return cache;
}

export function getPricingIndex(): VmPricingIndex {
  return load().index;
}

/** Every SKU that has both a catalogue entry and at least one price. */
export function getDetailPageSkus(): string[] {
  const { catalog, bySku } = load();
  return catalog.skus.filter((spec) => bySku.has(spec.sku)).map((spec) => spec.sku);
}

export function getSkuSpec(sku: string): VmSkuSpec | null {
  return load().catalog.skus.find((spec) => spec.sku === sku) ?? null;
}

export function getSkuRegionPrices(sku: string): VmRegionPrice[] {
  return load().bySku.get(sku) ?? [];
}

/** Other sizes in the same series, for cross-links on a detail page. */
export function getSeriesSiblings(sku: string, series: string, limit = 12): string[] {
  const { catalog, bySku } = load();

  return catalog.skus
    .filter((spec) => spec.series === series && spec.sku !== sku && bySku.has(spec.sku))
    .sort((a, b) => (a.vcpus ?? 0) - (b.vcpus ?? 0) || a.sku.localeCompare(b.sku))
    .slice(0, limit)
    .map((spec) => spec.sku);
}
