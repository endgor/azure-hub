import * as fs from 'fs';
import * as path from 'path';
import { VM_PRICE_FIELDS, type VmCurrency, type VmPriceField, type PackedVmPrices } from '../src/types/vmPricing';
import { ARM_REGIONS, getArmRegionInfo } from '../src/config/azureArmRegions';

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'vm-pricing');
const RETAIL_API = 'https://prices.azure.com/api/retail/prices';
const API_VERSION = '2023-01-01-preview';
const PAGE_SIZE = 1000;
const USER_AGENT = 'azure-hub (+https://azurehub.org)';

const CURRENCIES: VmCurrency[] = ['USD', 'EUR', 'SEK'];

/** Regions fetched in parallel. The Retail API is unauthenticated and throttles above this. */
const CONCURRENCY = 6;

const HOURS_PER_TERM: Record<string, number> = {
  '1 Year': 8760,
  '3 Years': 26280
};

const debugEnv = process.env.DEBUG_UPDATE_VM_PRICING ?? '';
const DEBUG_LOGS = debugEnv === '1' || debugEnv.toLowerCase() === 'true';

interface SavingsPlanPrice {
  term: string;
  retailPrice: number;
}

interface RetailPriceItem {
  armSkuName?: string;
  armRegionName?: string;
  location?: string;
  skuName: string;
  productName: string;
  meterName: string;
  retailPrice: number;
  unitOfMeasure: string;
  type: string;
  reservationTerm?: string;
  effectiveStartDate?: string;
  savingsPlan?: SavingsPlanPrice[];
}

interface RetailPriceResponse {
  Items: RetailPriceItem[];
  NextPageLink: string | null;
}

const FIELD_INDEX: Record<VmPriceField, number> = VM_PRICE_FIELDS.reduce(
  (acc, field, index) => {
    acc[field] = index;
    return acc;
  },
  {} as Record<VmPriceField, number>
);

function logDebug(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    console.debug(...args);
  }
}

async function fetchWithRetry(url: string, attempts = 4): Promise<RetailPriceResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return (await response.json()) as RetailPriceResponse;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = 1000 * 2 ** (attempt - 1);
      logDebug(`  retry ${attempt}/${attempts - 1} in ${delay}ms: ${String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Retail API request failed after ${attempts} attempts: ${String(lastError)}`);
}

function buildUrl(filter: string, currency: VmCurrency): string {
  const params = new URLSearchParams({
    'api-version': API_VERSION,
    currencyCode: currency,
    $filter: filter,
    $top: String(PAGE_SIZE)
  });
  return `${RETAIL_API}?${params.toString()}`;
}

/** The API's NextPageLink carries `$top=0`, which it then rejects — restore the page size. */
function normalizeNextPageLink(link: string): string {
  return link.replace(/([?&]\$top=)0(&|$)/, `$1${PAGE_SIZE}$2`);
}

async function fetchAllPages(filter: string, currency: VmCurrency): Promise<RetailPriceItem[]> {
  const items: RetailPriceItem[] = [];
  let url: string | null = buildUrl(filter, currency);

  while (url) {
    const page: RetailPriceResponse = await fetchWithRetry(url);
    items.push(...page.Items);
    url = page.NextPageLink ? normalizeNextPageLink(page.NextPageLink) : null;
  }

  return items;
}

/**
 * Reservation and constrained-core meters expose internal grouping SKUs such as
 * `Dsv5_Type1` or `Mmsv2MedMem-Type1` that are not deployable VM sizes.
 */
function isInternalGroupingSku(armSkuName: string): boolean {
  return /[ _-]Type ?\d+$/i.test(armSkuName);
}

function isWindows(item: RetailPriceItem): boolean {
  return item.productName.endsWith(' Windows');
}

function isSpot(item: RetailPriceItem): boolean {
  return item.skuName.includes('Spot');
}

function isLowPriority(item: RetailPriceItem): boolean {
  return item.skuName.includes('Low Priority');
}

function packRegionPrices(items: RetailPriceItem[]): Record<string, PackedVmPrices> {
  const packed: Record<string, PackedVmPrices> = {};

  const put = (sku: string, field: VmPriceField, value: number): void => {
    // Azure publishes 0.0 for meters that exist but have no released price yet
    // (unreleased M_v4 / E_v6 / darm sizes). A free VM is not a real rate.
    if (!(value > 0)) return;

    let row = packed[sku];
    if (!row) {
      row = new Array<number | null>(VM_PRICE_FIELDS.length).fill(null);
      packed[sku] = row;
    }
    const index = FIELD_INDEX[field];
    // Keep the lowest rate when Azure lists more than one meter for the same slot.
    if (row[index] === null || value < (row[index] as number)) {
      row[index] = value;
    }
  };

  for (const item of items) {
    // A few meters carry trailing whitespace in armSkuName.
    const sku = item.armSkuName?.trim();
    if (!sku || isInternalGroupingSku(sku)) continue;
    if (item.unitOfMeasure !== '1 Hour') continue;

    const os = isWindows(item) ? 'w' : 'l';
    const spot = isSpot(item);
    const low = isLowPriority(item);

    if (item.type === 'Consumption') {
      if (spot) {
        put(sku, `${os}spot` as VmPriceField, item.retailPrice);
      } else if (low) {
        put(sku, `${os}low` as VmPriceField, item.retailPrice);
      } else {
        put(sku, `${os}payg` as VmPriceField, item.retailPrice);
        for (const plan of item.savingsPlan ?? []) {
          const term = plan.term === '1 Year' ? 'sp1' : plan.term === '3 Years' ? 'sp3' : null;
          if (term) put(sku, `${os}${term}` as VmPriceField, round(plan.retailPrice));
        }
      }
      continue;
    }

    if (item.type === 'DevTestConsumption' && !spot && !low) {
      put(sku, `${os}dev` as VmPriceField, item.retailPrice);
      continue;
    }

    // Reservations are billed as a single upfront amount for the whole term and are
    // sold per instance regardless of OS, so they are stored on the Linux slots only.
    if (item.type === 'Reservation' && !spot && !low) {
      const hours = HOURS_PER_TERM[item.reservationTerm ?? ''];
      if (!hours) continue;
      put(sku, hours === 8760 ? 'lri1' : 'lri3', round(item.retailPrice / hours));
    }
  }

  for (const row of Object.values(packed)) {
    while (row.length > 0 && row[row.length - 1] === null) {
      row.pop();
    }
  }

  return packed;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

async function discoverRegions(): Promise<Map<string, string>> {
  console.info('Discovering regions with Virtual Machines pricing...');

  const probeSkus = ['Standard_D2s_v5', 'Standard_D2s_v3', 'Standard_B2s', 'Standard_D2s_v6', 'Standard_F2s_v2'];
  const regions = new Map<string, string>();

  for (const sku of probeSkus) {
    const items = await fetchAllPages(
      `serviceName eq 'Virtual Machines' and armSkuName eq '${sku}' and priceType eq 'Consumption'`,
      'USD'
    );
    for (const item of items) {
      if (item.armRegionName && !regions.has(item.armRegionName)) {
        regions.set(item.armRegionName, item.location ?? item.armRegionName);
      }
    }
  }

  console.info(`  Found ${regions.size} regions`);
  return regions;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
}

async function updateVmPricing(): Promise<void> {
  const regionLabels = await discoverRegions();
  if (regionLabels.size < 40) {
    throw new Error(`Only discovered ${regionLabels.size} regions — expected at least 40. The Retail API may have changed.`);
  }

  const regionNames = Array.from(regionLabels.keys()).sort();
  const lastUpdated = new Date().toISOString().slice(0, 10);
  const allSkus = new Set<string>();

  for (const currency of CURRENCIES) {
    console.info(`\nFetching ${currency} prices for ${regionNames.length} regions (${CONCURRENCY} at a time)...`);
    let completed = 0;

    const queue = [...regionNames];
    const worker = async (): Promise<void> => {
      for (;;) {
        const region = queue.shift();
        if (!region) return;

        const items = await fetchAllPages(
          `serviceName eq 'Virtual Machines' and armRegionName eq '${region}'`,
          currency
        );
        const prices = packRegionPrices(items);

        for (const sku of Object.keys(prices)) {
          allSkus.add(sku);
        }

        writeJson(path.join(DATA_DIR, currency.toLowerCase(), `${region}.json`), {
          region,
          currency,
          lastUpdated,
          prices
        });

        completed++;
        console.info(
          `  [${String(completed).padStart(2)}/${regionNames.length}] ${region.padEnd(20)} ${String(Object.keys(prices).length).padStart(5)} SKUs from ${items.length} meters`
        );
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  const index = {
    lastUpdated,
    currencies: CURRENCIES,
    regions: regionNames.map((name) => {
      const info = getArmRegionInfo(name);
      return {
        name,
        label: regionLabels.get(name) ?? name,
        displayName: info.displayName,
        geography: info.geography,
        cloud: info.cloud
      };
    }),
    skuCount: allSkus.size,
    priceFields: VM_PRICE_FIELDS
  };

  writeJson(path.join(DATA_DIR, 'index.json'), index);

  const unmapped = regionNames.filter((name) => !(name in ARM_REGIONS));
  if (unmapped.length > 0) {
    console.warn(`\nWARNING: ${unmapped.length} region(s) missing from ARM_REGIONS in src/config/azureArmRegions.ts:`);
    console.warn(`  ${unmapped.join(', ')}`);
  }

  console.info(`\nWrote ${regionNames.length} regions x ${CURRENCIES.length} currencies, ${allSkus.size} distinct SKUs`);
  console.info(`Output: ${DATA_DIR}`);
  console.info('VM pricing update complete.');
}

if (require.main === module) {
  updateVmPricing().catch((error) => {
    console.error('Error updating VM pricing data:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { updateVmPricing };
