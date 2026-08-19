/** Fixed column order for the packed price arrays in /data/vm-pricing/{currency}/{region}.json. */
export const VM_PRICE_FIELDS = [
  'lpayg',
  'lspot',
  'llow',
  'ldev',
  'lri1',
  'lri3',
  'lsp1',
  'lsp3',
  'wpayg',
  'wspot',
  'wlow',
  'wdev',
  'wsp1',
  'wsp3'
] as const;

export type VmPriceField = (typeof VM_PRICE_FIELDS)[number];

/** Packed hourly prices for one SKU; positions follow VM_PRICE_FIELDS, trailing nulls trimmed. */
export type PackedVmPrices = (number | null)[];

export type VmOperatingSystem = 'linux' | 'windows';

export type VmPriceMode =
  | 'payg'
  | 'spot'
  | 'lowPriority'
  | 'devTest'
  | 'reservation1Year'
  | 'reservation3Years'
  | 'savingsPlan1Year'
  | 'savingsPlan3Years';

/** ISO 4217 code; the set is whatever the Retail Prices API supports. */
export type VmCurrency = string;

export interface VmCurrencyRate {
  code: VmCurrency;
  /** Multiply a base-currency price by this to get the price Azure publishes in `code`. */
  rate: number;
}

export interface VmSkuSpec {
  /** ARM SKU name, e.g. Standard_D4s_v5 */
  sku: string;
  /** Size without the Standard_ prefix, e.g. D4s_v5 */
  size: string;
  /** ARM resource SKU family, e.g. standardDSv5Family */
  family: string;
  /** Human-readable series derived from the family, e.g. Dsv5 */
  series: string;
  /** Workload category, e.g. General purpose */
  category: string;
  vcpus: number | null;
  /** Physical cores when the SKU is constrained-core, otherwise null */
  vcpusAvailable: number | null;
  memoryGB: number | null;
  maxDataDisks: number | null;
  maxNetworkInterfaces: number | null;
  /** Local temp disk size in GB, 0 when the SKU has no temp disk */
  tempDiskGB: number | null;
  architecture: string | null;
  gpuCount: number | null;
  premiumIO: boolean;
  acceleratedNetworking: boolean;
  rdma: boolean;
  encryptionAtHost: boolean;
  ephemeralOSDisk: boolean;
  trustedLaunch: boolean;
  confidentialComputing: boolean;
  hibernation: boolean;
  /** Indexes into VmPricingIndex.regions where the SKU has a listed price */
  regions: number[];
  /**
   * Where the hardware specs came from. `arm` is Microsoft.Compute/skus, `derived` is a
   * constrained-core size resolved from its parent size, `unknown` means the SKU is priced
   * but not visible to the subscription that generated the catalogue.
   */
  specSource: 'arm' | 'derived' | 'unknown';
}

export interface VmRegionInfo {
  /** ARM region name, e.g. westeurope */
  name: string;
  /** Retail API location label, e.g. EU West */
  label: string;
  /** Friendly display name, e.g. West Europe */
  displayName: string;
  geography: string;
  cloud: 'public' | 'government' | 'edgeZone';
}

export interface VmPricingIndex {
  lastUpdated: string;
  /** Currency the stored prices are in; everything else is derived from a rate. */
  baseCurrency: VmCurrency;
  currencies: VmCurrencyRate[];
  regions: VmRegionInfo[];
  skuCount: number;
  priceFields: readonly VmPriceField[];
}

export interface VmRegionPrices {
  region: string;
  currency: VmCurrency;
  lastUpdated: string;
  prices: Record<string, PackedVmPrices>;
}

export interface VmSkuCatalog {
  lastUpdated: string;
  source: string;
  skus: VmSkuSpec[];
}

/** A resolved hourly price plus how it was obtained. */
export interface VmResolvedPrice {
  hourly: number;
  /** True when Azure publishes no meter for the combination and the rate was derived from another one. */
  estimated: boolean;
}
