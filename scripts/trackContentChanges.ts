/**
 * Maintain public/data/content-changes.json: a per-page fingerprint and lastmod for every
 * VM SKU and base service tag detail page, so sitemap lastmod and IndexNow submissions
 * reflect real content changes rather than the daily data refresh.
 *
 * Usage: ts-node scripts/trackContentChanges.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildServiceTagFingerprints,
  buildVmSkuFingerprints,
  countChanged,
  mergeManifest,
  serializeManifest,
  type ContentChangesManifest,
  type RegionPriceFile,
  type ServiceTagCloudFile
} from '../src/lib/contentChanges';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const VM_PRICING_DIR = path.join(DATA_DIR, 'vm-pricing');
const MANIFEST_PATH = path.join(DATA_DIR, 'content-changes.json');
const CLOUDS = ['AzureCloud', 'AzureChinaCloud', 'AzureUSGovernment'];

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function loadPrevious(): ContentChangesManifest | null {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try {
    return readJson<ContentChangesManifest>(MANIFEST_PATH);
  } catch (error) {
    console.warn(`Could not parse ${MANIFEST_PATH}, rebuilding from scratch:`, error);
    return null;
  }
}

function loadVmSkuFingerprints(): Record<string, string> {
  const catalog = readJson<{ skus: Array<{ sku: string }> }>(path.join(VM_PRICING_DIR, 'skus.json'));
  const index = readJson<{ regions: Array<{ name: string }> }>(path.join(VM_PRICING_DIR, 'index.json'));

  const regions: RegionPriceFile[] = [];
  for (const region of index.regions) {
    const file = path.join(VM_PRICING_DIR, 'prices', `${region.name}.json`);
    if (fs.existsSync(file)) regions.push(readJson<RegionPriceFile>(file));
  }

  return buildVmSkuFingerprints(catalog.skus.map((entry) => entry.sku), regions);
}

function loadServiceTagFingerprints(): Record<string, string> {
  const index = readJson<Array<{ id: string }>>(path.join(DATA_DIR, 'service-tags-index.json'));
  const clouds: ServiceTagCloudFile[] = [];
  for (const cloud of CLOUDS) {
    const file = path.join(DATA_DIR, `${cloud}.json`);
    if (!fs.existsSync(file)) continue;
    const { values } = readJson<Pick<ServiceTagCloudFile, 'values'>>(file);
    clouds.push({ cloud, values });
  }

  return buildServiceTagFingerprints(index.map((entry) => entry.id), clouds);
}

function main(): void {
  const today = new Date().toISOString().slice(0, 10);
  const manifest = mergeManifest(
    loadPrevious(),
    { vmSkus: loadVmSkuFingerprints(), serviceTags: loadServiceTagFingerprints() },
    today
  );

  fs.writeFileSync(MANIFEST_PATH, serializeManifest(manifest));

  const changed = countChanged(manifest);
  console.log(
    `Content changes: ${Object.keys(manifest.vmSkus).length} VM SKUs (${changed.vmSkus} changed), ` +
      `${Object.keys(manifest.serviceTags).length} service tags (${changed.serviceTags} changed) → ${MANIFEST_PATH}`
  );
}

main();
