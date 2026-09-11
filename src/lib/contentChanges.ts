import { createHash } from 'crypto';
import type { PackedVmPrices } from '@/types/vmPricing';

export interface ContentChangeEntry {
  fingerprint: string;
  lastmod: string;
}

export interface ContentChangesManifest {
  lastRun: string;
  vmSkus: Record<string, ContentChangeEntry>;
  serviceTags: Record<string, ContentChangeEntry>;
}

export interface CurrentFingerprints {
  vmSkus: Record<string, string>;
  serviceTags: Record<string, string>;
}

export interface RegionPriceFile {
  region: string;
  prices: Record<string, PackedVmPrices>;
}

export interface ServiceTagCloudFile {
  cloud: string;
  values: Array<{ name: string; properties: { addressPrefixes: string[] } }>;
}

export function fingerprint(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

/** Regional variants ("Storage.WestEurope") are noindex and never tracked. */
export function isBaseServiceTag(id: string): boolean {
  return !id.includes('.');
}

export function fingerprintVmSku(regionPrices: Array<[string, PackedVmPrices]>): string {
  const sorted = [...regionPrices].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return fingerprint(sorted);
}

export function fingerprintServiceTag(entries: Array<{ cloud: string; prefixes: string[] }>): string {
  const keys = new Set<string>();
  for (const { cloud, prefixes } of entries) {
    for (const prefix of prefixes) keys.add(`${cloud}:${prefix}`);
  }
  return fingerprint([...keys].sort());
}

/** Same set as the sitemap and getDetailPageSkus: catalogued and priced in at least one region. */
export function buildVmSkuFingerprints(
  catalogSkus: string[],
  regions: RegionPriceFile[]
): Record<string, string> {
  const bySku = new Map<string, Array<[string, PackedVmPrices]>>();
  for (const { region, prices } of regions) {
    for (const [sku, packed] of Object.entries(prices)) {
      const list = bySku.get(sku);
      if (list) list.push([region, packed]);
      else bySku.set(sku, [[region, packed]]);
    }
  }

  const result: Record<string, string> = {};
  for (const sku of catalogSkus) {
    const regionPrices = bySku.get(sku);
    if (regionPrices) result[sku] = fingerprintVmSku(regionPrices);
  }
  return result;
}

export function buildServiceTagFingerprints(
  tagIds: string[],
  clouds: ServiceTagCloudFile[]
): Record<string, string> {
  const byTag = new Map<string, Array<{ cloud: string; prefixes: string[] }>>();
  for (const { cloud, values } of clouds) {
    for (const entry of values) {
      const list = byTag.get(entry.name);
      const item = { cloud, prefixes: entry.properties.addressPrefixes };
      if (list) list.push(item);
      else byTag.set(entry.name, [item]);
    }
  }

  const result: Record<string, string> = {};
  for (const id of new Set(tagIds)) {
    if (!isBaseServiceTag(id)) continue;
    result[id] = fingerprintServiceTag(byTag.get(id) ?? []);
  }
  return result;
}

function mergeSection(
  previous: Record<string, ContentChangeEntry> | undefined,
  current: Record<string, string>,
  today: string
): Record<string, ContentChangeEntry> {
  const merged: Record<string, ContentChangeEntry> = {};
  for (const key of Object.keys(current).sort()) {
    const fp = current[key];
    const old = previous?.[key];
    merged[key] = old && old.fingerprint === fp ? old : { fingerprint: fp, lastmod: today };
  }
  return merged;
}

export function mergeManifest(
  previous: ContentChangesManifest | null,
  current: CurrentFingerprints,
  today: string
): ContentChangesManifest {
  return {
    lastRun: today,
    vmSkus: mergeSection(previous?.vmSkus, current.vmSkus, today),
    serviceTags: mergeSection(previous?.serviceTags, current.serviceTags, today)
  };
}

function serializeSection(section: Record<string, ContentChangeEntry>): string {
  const lines = Object.keys(section)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${JSON.stringify(section[key])}`);
  return lines.length ? `{\n${lines.join(',\n')}\n}` : '{}';
}

/** One entry per line so a daily diff shows exactly which pages changed. */
export function serializeManifest(manifest: ContentChangesManifest): string {
  return (
    `{"lastRun":${JSON.stringify(manifest.lastRun)},\n` +
    `"vmSkus":${serializeSection(manifest.vmSkus)},\n` +
    `"serviceTags":${serializeSection(manifest.serviceTags)}}\n`
  );
}

export function countChanged(manifest: ContentChangesManifest): { vmSkus: number; serviceTags: number } {
  const count = (section: Record<string, ContentChangeEntry>) =>
    Object.values(section).filter((entry) => entry.lastmod === manifest.lastRun).length;
  return { vmSkus: count(manifest.vmSkus), serviceTags: count(manifest.serviceTags) };
}

/** Site paths whose content changed in the last run; segments match the sitemap exactly. */
export function getChangedPaths(manifest: ContentChangesManifest): string[] {
  const paths: string[] = [];
  for (const [sku, entry] of Object.entries(manifest.vmSkus)) {
    if (entry.lastmod === manifest.lastRun) paths.push(`/tools/vm-pricing/${encodeURIComponent(sku)}/`);
  }
  for (const [tag, entry] of Object.entries(manifest.serviceTags)) {
    if (entry.lastmod === manifest.lastRun && isBaseServiceTag(tag)) {
      paths.push(`/tools/service-tags/${encodeURIComponent(tag)}/`);
    }
  }
  return paths.sort();
}
