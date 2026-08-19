import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseVmSize, getVmCategory, stripSkuTier } from '../src/lib/vmPricing/skuNaming';
import type { VmSkuSpec, VmSkuCatalog, VmPricingIndex } from '../src/types/vmPricing';

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'vm-pricing');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'skus.json');
const ARM_API_VERSION = '2021-07-01';

const debugEnv = process.env.DEBUG_UPDATE_VM_SPECS ?? '';
const DEBUG_LOGS = debugEnv === '1' || debugEnv.toLowerCase() === 'true';

interface ArmCapability {
  name: string;
  value: string;
}

interface ArmLocationInfo {
  location: string;
  zones?: string[];
}

interface ArmResourceSku {
  resourceType: string;
  name: string;
  tier?: string;
  size?: string;
  family?: string;
  locations?: string[];
  locationInfo?: ArmLocationInfo[];
  capabilities?: ArmCapability[];
}

interface ArmSkuResponse {
  value: ArmResourceSku[];
  nextLink?: string;
}

function logDebug(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    console.debug(...args);
  }
}

function az(args: string[]): string {
  return execFileSync('az', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}

function checkAzureCli(): void {
  try {
    execFileSync('az', ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error('Azure CLI is not installed or not in PATH. Install it from https://aka.ms/azure-cli');
  }

  try {
    execFileSync('az', ['account', 'show'], { stdio: 'ignore' });
  } catch {
    throw new Error('Not logged into Azure. Run "az login" first.');
  }
}

async function fetchArmPage(url: string, token: string): Promise<ArmSkuResponse> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ARM request failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`);
  }

  return (await response.json()) as ArmSkuResponse;
}

function capabilityMap(sku: ArmResourceSku): Map<string, string> {
  const map = new Map<string, string>();
  for (const capability of sku.capabilities ?? []) {
    map.set(capability.name, capability.value);
  }
  return map;
}

function asNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

function toSpec(sku: ArmResourceSku, regionIndexes: number[]): VmSkuSpec {
  const caps = capabilityMap(sku);
  const parsed = parseVmSize(sku.name);
  const tempDiskMB = asNumber(caps.get('MaxResourceVolumeMB'));
  const confidentialType = caps.get('ConfidentialComputingType');

  return {
    sku: sku.name,
    size: sku.size ?? stripSkuTier(sku.name),
    family: sku.family ?? '',
    series: parsed.series,
    category: getVmCategory(sku.name),
    vcpus: asNumber(caps.get('vCPUs')),
    vcpusAvailable: asNumber(caps.get('vCPUsAvailable')),
    memoryGB: asNumber(caps.get('MemoryGB')),
    maxDataDisks: asNumber(caps.get('MaxDataDiskCount')),
    maxNetworkInterfaces: asNumber(caps.get('MaxNetworkInterfaces')),
    tempDiskGB: tempDiskMB === null ? null : Math.round(tempDiskMB / 1024),
    architecture: caps.get('CpuArchitectureType') ?? null,
    gpuCount: asNumber(caps.get('GPUs')),
    premiumIO: asBoolean(caps.get('PremiumIO')),
    acceleratedNetworking: asBoolean(caps.get('AcceleratedNetworkingEnabled')),
    rdma: asBoolean(caps.get('RdmaEnabled')),
    encryptionAtHost: asBoolean(caps.get('EncryptionAtHostSupported')),
    ephemeralOSDisk: asBoolean(caps.get('EphemeralOSDiskSupported')),
    // Azure reports the negative capability, so absence means Trusted Launch is available.
    trustedLaunch: !asBoolean(caps.get('TrustedLaunchDisabled')),
    confidentialComputing: confidentialType !== undefined && confidentialType !== '',
    hibernation: asBoolean(caps.get('HibernationSupported')),
    regions: regionIndexes,
    specSource: 'arm'
  };
}

/** ARM only lists SKUs the subscription can see, so priced-but-invisible sizes need a stub. */
function toPlaceholderSpec(sku: string, regionIndexes: number[]): VmSkuSpec {
  const parsed = parseVmSize(sku);

  return {
    sku,
    size: stripSkuTier(sku),
    family: '',
    series: parsed.series,
    category: getVmCategory(sku),
    vcpus: null,
    vcpusAvailable: null,
    memoryGB: null,
    maxDataDisks: null,
    maxNetworkInterfaces: null,
    tempDiskGB: null,
    architecture: null,
    gpuCount: null,
    premiumIO: false,
    acceleratedNetworking: false,
    rdma: false,
    encryptionAtHost: false,
    ephemeralOSDisk: false,
    trustedLaunch: false,
    confidentialComputing: false,
    hibernation: false,
    regions: regionIndexes,
    specSource: 'unknown'
  };
}

/**
 * Constrained-core sizes such as Standard_E16-4as_v6 run the parent size's hardware with
 * fewer active vCPUs, so the parent's specs apply with vCPUsAvailable overridden.
 */
function deriveConstrainedSpec(sku: string, parent: VmSkuSpec, regionIndexes: number[]): VmSkuSpec | null {
  const parsed = parseVmSize(sku);
  if (parsed.constrainedCores === null) return null;

  return {
    ...parent,
    sku,
    size: stripSkuTier(sku),
    series: parsed.series,
    category: getVmCategory(sku),
    vcpus: parsed.cores,
    vcpusAvailable: parsed.constrainedCores,
    regions: regionIndexes,
    specSource: 'derived'
  };
}

/** Standard_E16-4as_v6 -> Standard_E16as_v6, Standard_M176ds-44_3_v3 -> Standard_M176ds_3_v3 */
function constrainedParentSku(sku: string): string | null {
  const parsed = parseVmSize(sku);
  if (parsed.constrainedCores === null) return null;

  return sku.replace(`-${parsed.constrainedCores}`, '');
}

function isUsableSkuName(sku: string): boolean {
  return /^(Standard|Basic)_[A-Za-z0-9]/.test(sku);
}

/** Region indexes where a SKU has a listed price, read back from the generated price files. */
function readPricedRegions(index: VmPricingIndex): Map<string, number[]> {
  const currency = index.currencies[0].toLowerCase();
  const pricedRegions = new Map<string, number[]>();

  index.regions.forEach((region, position) => {
    const file = path.join(DATA_DIR, currency, `${region.name}.json`);
    if (!fs.existsSync(file)) return;

    const prices = (JSON.parse(fs.readFileSync(file, 'utf8')) as { prices: Record<string, unknown> }).prices;
    for (const sku of Object.keys(prices)) {
      const existing = pricedRegions.get(sku);
      if (existing) {
        existing.push(position);
      } else {
        pricedRegions.set(sku, [position]);
      }
    }
  });

  return pricedRegions;
}

function readPricingIndex(): VmPricingIndex {
  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error(
      `Missing ${INDEX_FILE}. Run "npm run update-vm-pricing" first — the SKU catalogue indexes regions against it.`
    );
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) as VmPricingIndex;
}

async function updateVmSpecs(): Promise<void> {
  checkAzureCli();

  const index = readPricingIndex();
  console.info(`Indexing SKU availability against ${index.regions.length} priced regions`);

  const pricedRegions = readPricedRegions(index);
  console.info(`Found ${pricedRegions.size} priced SKUs across the generated price files`);

  const subscriptionId = az(['account', 'show', '--query', 'id', '-o', 'tsv']);
  const tenantId = az(['account', 'show', '--query', 'tenantId', '-o', 'tsv']);
  const token = az(['account', 'get-access-token', '--query', 'accessToken', '-o', 'tsv']);
  console.info(`Using subscription ${subscriptionId} (tenant ${tenantId})`);

  const specs = new Map<string, ArmResourceSku>();
  let pages = 0;

  for (const region of index.regions) {
    const filter = encodeURIComponent(`location eq '${region.name}'`);
    let url: string | undefined =
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/skus` +
      `?api-version=${ARM_API_VERSION}&$filter=${filter}`;

    let regionSkuCount = 0;

    while (url) {
      const page: ArmSkuResponse = await fetchArmPage(url, token);
      pages++;

      for (const sku of page.value) {
        if (sku.resourceType !== 'virtualMachines') continue;

        if (!specs.has(sku.name)) {
          specs.set(sku.name, sku);
        }

        regionSkuCount++;
      }

      url = page.nextLink;
    }

    logDebug(`  ${region.name.padEnd(20)} ${String(regionSkuCount).padStart(5)} SKUs`);
  }

  console.info(`Fetched ${pages} pages, ${specs.size} distinct VM SKUs`);

  if (specs.size < 500) {
    throw new Error(`Only found ${specs.size} VM SKUs — expected at least 500. Check subscription visibility.`);
  }

  const armSpecs = new Map<string, VmSkuSpec>();
  for (const [name, sku] of specs) {
    armSpecs.set(name, toSpec(sku, pricedRegions.get(name) ?? []));
  }

  // The catalogue covers every priced SKU, not just the ones this subscription can see.
  const catalogue = new Map<string, VmSkuSpec>();
  let derivedCount = 0;
  let unknownCount = 0;
  const skipped: string[] = [];

  for (const [sku, regions] of pricedRegions) {
    if (!isUsableSkuName(sku)) {
      skipped.push(sku);
      continue;
    }

    const armSpec = armSpecs.get(sku);
    if (armSpec) {
      catalogue.set(sku, armSpec);
      continue;
    }

    const parentName = constrainedParentSku(sku);
    const parent = parentName ? armSpecs.get(parentName) : null;
    const derived = parent ? deriveConstrainedSpec(sku, parent, regions) : null;

    if (derived) {
      catalogue.set(sku, derived);
      derivedCount++;
    } else {
      catalogue.set(sku, toPlaceholderSpec(sku, regions));
      unknownCount++;
    }
  }

  // Keep visible-but-unpriced SKUs so the catalogue stays a superset of what ARM reports.
  for (const [sku, spec] of armSpecs) {
    if (!catalogue.has(sku)) catalogue.set(sku, spec);
  }

  const catalog: VmSkuCatalog = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'Microsoft.Compute/skus + Azure Retail Prices API',
    skus: Array.from(catalogue.values()).sort((a, b) => a.sku.localeCompare(b.sku))
  };

  console.info(
    `Catalogue: ${catalog.skus.length} SKUs — ${armSpecs.size} from ARM, ${derivedCount} derived from parent sizes, ${unknownCount} priced without specs`
  );
  if (skipped.length > 0) {
    console.info(`Skipped ${skipped.length} non-SKU price rows: ${skipped.join(', ')}`);
  }
  if (unknownCount > catalog.skus.length * 0.1) {
    console.warn(
      `WARNING: ${unknownCount} SKUs have no specs (>10%). The subscription may not see enough SKUs — check region visibility and quota.`
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog), 'utf8');

  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(0);
  console.info(`Wrote ${catalog.skus.length} SKU specs to ${OUTPUT_FILE} (${sizeKB} KB)`);
  console.info('VM SKU spec update complete.');
}

if (require.main === module) {
  updateVmSpecs().catch((error) => {
    console.error('Error updating VM SKU specs:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { updateVmSpecs };
