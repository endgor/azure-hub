import * as fs from 'fs';
import * as path from 'path';
import { VM_PRICE_FIELDS, type VmPriceField, type PackedVmPrices } from '../src/types/vmPricing';
import { ARM_REGIONS, getArmRegionInfo } from '../src/config/azureArmRegions';

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'vm-pricing');
const RETAIL_API = 'https://prices.azure.com/api/retail/prices';
const API_VERSION = '2023-01-01-preview';
const PAGE_SIZE = 1000;
const USER_AGENT = 'azure-hub (+https://azurehub.org)';

/**
 * Azure quotes every currency as the USD price times one dated exchange rate — the API's
 * own error for an unknown code is "ExchangeRate <CODE>_<month> not found". Prices are
 * therefore stored once in USD and converted in the browser from the rates below.
 */
const BASE_CURRENCY = 'USD';

const SUPPORTED_CURRENCIES = [
  'AED', 'ARS', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK', 'DKK', 'EUR',
  'GBP', 'HKD', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PEN', 'PHP', 'PLN', 'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'USD',
  'VND', 'ZAR'
];

/** SKUs sampled per currency to derive its rate; several guards against one odd meter. */
const RATE_PROBE_SKUS = ['Standard_D4s_v5', 'Standard_E8s_v5', 'Standard_F4s_v2', 'Standard_B2s'];
const RATE_PROBE_REGION = 'westeurope';

/** Regions fetched in parallel. The Retail API is unauthenticated and throttles above this. */
const CONCURRENCY = 3;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The Retail API throttles a full sweep, so 429 gets a much longer backoff than a
 * transport error and honours Retry-After when the response carries one.
 */
async function fetchWithRetry(url: string, attempts = 7): Promise<RetailPriceResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** (attempt - 1);
        lastError = new Error(`${response.status} ${response.statusText}`);

        if (attempt === attempts) break;
        logDebug(`  throttled (${response.status}), waiting ${wait}ms before retry ${attempt}/${attempts - 1}`);
        await sleep(Math.min(wait, 120_000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return (await response.json()) as RetailPriceResponse;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = 1000 * 2 ** (attempt - 1);
      logDebug(`  retry ${attempt}/${attempts - 1} in ${delay}ms: ${String(error)}`);
      await sleep(delay);
    }
  }

  throw new Error(`Retail API request failed after ${attempts} attempts: ${String(lastError)}`);
}

function buildUrl(filter: string, currency: string): string {
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

async function fetchAllPages(filter: string, currency: string): Promise<RetailPriceItem[]> {
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

/**
 * `serviceName eq 'Virtual Machines'` also returns classic Cloud Services and Dedicated
 * Host meters, which reuse the VM SKU name at host-level prices. Neither ends in
 * " Windows", so left in they land in the Linux slot and inflate it.
 */
function isNonVmProduct(productName: string): boolean {
  return /cloud ?services|dedicated ?host/i.test(productName);
}

function isSpot(item: RetailPriceItem): boolean {
  return item.skuName.includes('Spot');
}

function isLowPriority(item: RetailPriceItem): boolean {
  return item.skuName.includes('Low Priority');
}

interface SlotValue {
  value: number;
  /** Azure returns superseded prices alongside current ones, so the date decides. */
  effective: string;
}

function packRegionPrices(items: RetailPriceItem[], duplicateConflicts: string[]): Record<string, PackedVmPrices> {
  const slots = new Map<string, (SlotValue | null)[]>();

  const put = (sku: string, field: VmPriceField, value: number, effective: string): void => {
    // Azure publishes 0.0 for meters that exist but have no released price yet
    // (unreleased M_v4 / E_v6 / darm sizes). A free VM is not a real rate.
    if (!(value > 0)) return;

    let row = slots.get(sku);
    if (!row) {
      row = new Array<SlotValue | null>(VM_PRICE_FIELDS.length).fill(null);
      slots.set(sku, row);
    }

    const index = FIELD_INDEX[field];
    const existing = row[index];

    if (!existing) {
      row[index] = { value, effective };
      return;
    }

    if (effective > existing.effective) {
      row[index] = { value, effective };
      return;
    }

    if (effective < existing.effective) return;

    // Same effective date: one of the pair is a 0.01-style placeholder, so keep the real rate.
    if (Math.max(existing.value, value) / Math.min(existing.value, value) > 1.5) {
      duplicateConflicts.push(`${sku} ${field}: ${existing.value} vs ${value} (both ${effective})`);
    }
    if (value > existing.value) row[index] = { value, effective };
  };

  for (const item of items) {
    // A few meters carry trailing whitespace in armSkuName.
    const sku = item.armSkuName?.trim();
    if (!sku || isInternalGroupingSku(sku)) continue;
    if (item.unitOfMeasure !== '1 Hour') continue;
    if (isNonVmProduct(item.productName)) continue;

    const os = isWindows(item) ? 'w' : 'l';
    const spot = isSpot(item);
    const low = isLowPriority(item);
    const effective = item.effectiveStartDate ?? '';

    if (item.type === 'Consumption') {
      if (spot) {
        put(sku, `${os}spot` as VmPriceField, item.retailPrice, effective);
      } else if (low) {
        put(sku, `${os}low` as VmPriceField, item.retailPrice, effective);
      } else {
        put(sku, `${os}payg` as VmPriceField, item.retailPrice, effective);
        for (const plan of item.savingsPlan ?? []) {
          const term = plan.term === '1 Year' ? 'sp1' : plan.term === '3 Years' ? 'sp3' : null;
          if (term) put(sku, `${os}${term}` as VmPriceField, round(plan.retailPrice), effective);
        }
      }
      continue;
    }

    if (item.type === 'DevTestConsumption' && !spot && !low) {
      put(sku, `${os}dev` as VmPriceField, item.retailPrice, effective);
      continue;
    }

    // Reservations are billed as a single upfront amount for the whole term and are
    // sold per instance regardless of OS, so they are stored on the Linux slots only.
    if (item.type === 'Reservation' && !spot && !low) {
      const hours = HOURS_PER_TERM[item.reservationTerm ?? ''];
      if (!hours) continue;
      put(sku, hours === 8760 ? 'lri1' : 'lri3', round(item.retailPrice / hours), effective);
    }
  }

  const packed: Record<string, PackedVmPrices> = {};
  for (const [sku, row] of slots) {
    const values: PackedVmPrices = row.map((slot) => (slot ? slot.value : null));
    while (values.length > 0 && values[values.length - 1] === null) {
      values.pop();
    }
    if (values.length > 0) packed[sku] = values;
  }

  return packed;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

interface CurrencyRate {
  code: string;
  /** Multiply a USD price by this to get the price Azure publishes in `code`. */
  rate: number;
}

/** Keys a price point so the same meter can be matched across two currency responses. */
function meterKey(item: RetailPriceItem): string {
  return [item.armSkuName?.trim(), item.armRegionName, item.meterName, item.productName, item.type, item.reservationTerm]
    .join('|');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Derives each currency's rate by pricing the same meters in USD and in that currency.
 * The median guards against a single meter whose local price has not been refreshed.
 */
async function discoverExchangeRates(): Promise<CurrencyRate[]> {
  console.info(`Deriving exchange rates for ${SUPPORTED_CURRENCIES.length} currencies...`);

  const skuFilter = RATE_PROBE_SKUS.map((sku) => `armSkuName eq '${sku}'`).join(' or ');
  const filter = `serviceName eq 'Virtual Machines' and armRegionName eq '${RATE_PROBE_REGION}' and (${skuFilter})`;

  const baseItems = await fetchAllPages(filter, BASE_CURRENCY);
  const baseByKey = new Map<string, number>();
  for (const item of baseItems) {
    if (item.retailPrice > 0) baseByKey.set(meterKey(item), item.retailPrice);
  }

  if (baseByKey.size < 10) {
    throw new Error(`Only ${baseByKey.size} base price points for rate discovery — expected at least 10.`);
  }

  const rates: CurrencyRate[] = [];

  for (const code of SUPPORTED_CURRENCIES) {
    if (code === BASE_CURRENCY) {
      rates.push({ code, rate: 1 });
      continue;
    }

    try {
      await sleep(250);
      const items = await fetchAllPages(filter, code);
      const ratios: number[] = [];

      for (const item of items) {
        const base = baseByKey.get(meterKey(item));
        if (base && item.retailPrice > 0) ratios.push(item.retailPrice / base);
      }

      if (ratios.length < 10) {
        console.warn(`  ${code}: only ${ratios.length} comparable price points, skipping`);
        continue;
      }

      const rate = median(ratios);
      const outliers = ratios.filter((ratio) => Math.abs(ratio / rate - 1) > 0.001).length;
      rates.push({ code, rate: Number(rate.toPrecision(10)) });
      logDebug(`  ${code}: ${rate} (${ratios.length} points, ${outliers} off-rate)`);
    } catch (error) {
      console.warn(`  ${code}: rate lookup failed, skipping — ${error instanceof Error ? error.message : error}`);
    }
  }

  console.info(`  Derived ${rates.length} rates`);
  if (rates.length < 20) {
    throw new Error(`Only derived ${rates.length} exchange rates — expected at least 20.`);
  }

  return rates;
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

  const rates = await discoverExchangeRates();

  const regionNames = Array.from(regionLabels.keys()).sort();
  const lastUpdated = new Date().toISOString().slice(0, 10);
  const allSkus = new Set<string>();
  const duplicateConflicts: string[] = [];
  const incompleteRegions: string[] = [];

  console.info(`\nFetching ${BASE_CURRENCY} prices for ${regionNames.length} regions (${CONCURRENCY} at a time)...`);
  let completed = 0;

  const queue = [...regionNames];
  const worker = async (): Promise<void> => {
    for (;;) {
      const region = queue.shift();
      if (!region) return;

      // Paging a whole region (16k+ rows) intermittently drops a page, so the sweep is
      // split by priceType and any gap is filled by merging another pass.
      const items: RetailPriceItem[] = [];
      let prices: Record<string, PackedVmPrices> = {};
      let missing = 0;

      for (let pass = 1; pass <= 3; pass++) {
        for (const priceType of ['Consumption', 'Reservation', 'DevTestConsumption']) {
          items.push(
            ...(await fetchAllPages(
              `serviceName eq 'Virtual Machines' and armRegionName eq '${region}' and priceType eq '${priceType}'`,
              BASE_CURRENCY
            ))
          );
        }

        // A spot rate with no pay-as-you-go rate cannot exist, so it marks a lost row.
        prices = packRegionPrices(items, pass === 1 ? duplicateConflicts : []);
        missing = Object.values(prices).filter((row) => row[FIELD_INDEX.lspot] && !row[FIELD_INDEX.lpayg]).length;
        if (missing === 0) break;

        logDebug(`  ${region}: ${missing} incomplete SKUs after pass ${pass}, refetching`);
      }

      if (missing > 0) {
        incompleteRegions.push(`${region} (${missing})`);
      }

      for (const sku of Object.keys(prices)) {
        allSkus.add(sku);
      }

      writeJson(path.join(DATA_DIR, 'prices', `${region}.json`), {
        region,
        currency: BASE_CURRENCY,
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

  const index = {
    lastUpdated,
    baseCurrency: BASE_CURRENCY,
    currencies: rates,
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

  if (incompleteRegions.length > 0) {
    console.warn(
      `\nWARNING: ${incompleteRegions.length} region(s) have SKUs with a spot rate but no pay-as-you-go rate,`
    );
    console.warn('  which means the Retail API dropped rows while paging. Re-run to refresh them:');
    console.warn(`    ${incompleteRegions.join(', ')}`);
  }

  if (duplicateConflicts.length > 0) {
    console.warn(`\nWARNING: ${duplicateConflicts.length} slots had two meters disagreeing by more than 50%.`);
    console.warn('  Azure lists a real rate alongside a placeholder; the higher value was kept. Examples:');
    for (const conflict of duplicateConflicts.slice(0, 5)) {
      console.warn(`    ${conflict}`);
    }
  }

  console.info(
    `\nWrote ${regionNames.length} regions in ${BASE_CURRENCY}, ${rates.length} currency rates, ${allSkus.size} distinct SKUs`
  );
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
