import type { PackedVmPrices, VmSkuSpec } from '@/types/vmPricing';

export type VmFeature =
  | 'gpu'
  | 'premiumIO'
  | 'acceleratedNetworking'
  | 'rdma'
  | 'tempDisk'
  | 'noTempDisk'
  | 'confidential'
  | 'trustedLaunch'
  | 'ephemeralOSDisk'
  | 'hibernation';

export const VM_FEATURE_OPTIONS: { value: VmFeature; label: string }[] = [
  { value: 'gpu', label: 'GPU' },
  { value: 'premiumIO', label: 'Premium SSD' },
  { value: 'acceleratedNetworking', label: 'Accelerated networking' },
  { value: 'rdma', label: 'RDMA' },
  { value: 'tempDisk', label: 'Has temp disk' },
  { value: 'noTempDisk', label: 'No temp disk' },
  { value: 'confidential', label: 'Confidential computing' },
  { value: 'trustedLaunch', label: 'Trusted launch' },
  { value: 'ephemeralOSDisk', label: 'Ephemeral OS disk' },
  { value: 'hibernation', label: 'Hibernation' }
];

export type VmPriceUnit = 'hourly' | 'monthly';

/** Azure's billing month, matching HOURS_PER_MONTH in pricing.ts. */
const HOURS_PER_MONTH = 730;

export const VCPU_PRESETS = [2, 4, 8, 16, 32, 64];
export const MEMORY_PRESETS = [8, 16, 32, 64, 128, 256];

export interface VmFilterState {
  search: string;
  categories: string[];
  series: string[];
  architectures: string[];
  features: VmFeature[];
  minVcpus: number | null;
  maxVcpus: number | null;
  minMemoryGB: number | null;
  maxMemoryGB: number | null;
  maxPrice: number | null;
  /** Unit the user typed maxPrice in; the value is converted at compare time. */
  maxPriceUnit: VmPriceUnit;
  pricedOnly: boolean;
}

export const EMPTY_VM_FILTERS: VmFilterState = {
  search: '',
  categories: [],
  series: [],
  architectures: [],
  features: [],
  minVcpus: null,
  maxVcpus: null,
  minMemoryGB: null,
  maxMemoryGB: null,
  maxPrice: null,
  maxPriceUnit: 'monthly',
  pricedOnly: true
};

export interface VmRow {
  spec: VmSkuSpec;
  packed: PackedVmPrices | undefined;
  hourly: number | null;
  estimated: boolean;
  savings: number | null;
  pricePerVcpu: number | null;
  pricePerGB: number | null;
}

/** One selectable value plus how many sizes would remain if it were applied. */
export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface PresetCount {
  value: number;
  count: number;
}

export function matchesFeature(spec: VmSkuSpec, feature: VmFeature): boolean {
  switch (feature) {
    case 'gpu':
      return (spec.gpuCount ?? 0) > 0;
    case 'premiumIO':
      return spec.premiumIO;
    case 'acceleratedNetworking':
      return spec.acceleratedNetworking;
    case 'rdma':
      return spec.rdma;
    case 'tempDisk':
      return (spec.tempDiskGB ?? 0) > 0;
    case 'noTempDisk':
      return (spec.tempDiskGB ?? 0) === 0;
    case 'confidential':
      return spec.confidentialComputing;
    case 'trustedLaunch':
      return spec.trustedLaunch;
    case 'ephemeralOSDisk':
      return spec.ephemeralOSDisk;
    case 'hibernation':
      return spec.hibernation;
    default:
      return true;
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, '');
}

export function matchesSearch(spec: VmSkuSpec, query: string): boolean {
  if (!query) return true;

  const needle = normalize(query);
  return (
    normalize(spec.sku).includes(needle) ||
    normalize(spec.size).includes(needle) ||
    normalize(spec.series).includes(needle) ||
    normalize(spec.category).includes(needle)
  );
}

export function getEffectiveVcpus(spec: VmSkuSpec): number | null {
  return spec.vcpusAvailable ?? spec.vcpus;
}

/**
 * A facet is left out of its own baseline so its options stay switchable. Only facets
 * with OR semantics qualify: `features` are ANDed together, so each additional one has
 * to narrow the set it is counted against.
 */
export type ExcludedFacet = 'categories' | 'series' | 'architectures' | 'vcpus' | 'memory' | 'price' | null;

/** Converts a user-entered ceiling into the hourly rate rows are stored in. */
export function toHourlyThreshold(value: number, unit: VmPriceUnit): number {
  return unit === 'monthly' ? value / HOURS_PER_MONTH : value;
}

export function rowMatches(row: VmRow, filters: VmFilterState, exclude: ExcludedFacet): boolean {
  const { spec } = row;
  const vcpus = getEffectiveVcpus(spec);

  if (filters.pricedOnly && row.hourly === null) return false;
  if (!matchesSearch(spec, filters.search.trim())) return false;
  if (filters.features.some((feature) => !matchesFeature(spec, feature))) return false;

  if (exclude !== 'categories' && filters.categories.length > 0 && !filters.categories.includes(spec.category)) {
    return false;
  }

  if (exclude !== 'series' && filters.series.length > 0 && !filters.series.includes(spec.series)) {
    return false;
  }

  if (
    exclude !== 'architectures' &&
    filters.architectures.length > 0 &&
    (!spec.architecture || !filters.architectures.includes(spec.architecture))
  ) {
    return false;
  }

  if (exclude !== 'vcpus') {
    if (filters.minVcpus !== null && (vcpus === null || vcpus < filters.minVcpus)) return false;
    if (filters.maxVcpus !== null && (vcpus === null || vcpus > filters.maxVcpus)) return false;
  }

  if (exclude !== 'memory') {
    if (filters.minMemoryGB !== null && (spec.memoryGB === null || spec.memoryGB < filters.minMemoryGB)) return false;
    if (filters.maxMemoryGB !== null && (spec.memoryGB === null || spec.memoryGB > filters.maxMemoryGB)) return false;
  }

  if (exclude !== 'price' && filters.maxPrice !== null) {
    if (row.hourly === null) return false;
    if (row.hourly > toHourlyThreshold(filters.maxPrice, filters.maxPriceUnit)) return false;
  }

  return true;
}

function countBy<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value === null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Keeps every value present in the region so a selected-but-empty option stays visible. */
function toFacetOptions(values: string[], counts: Map<string, number>): FacetOption[] {
  return values.map((value) => ({ value, label: value, count: counts.get(value) ?? 0 }));
}

export function buildCategoryFacets(rows: VmRow[], filters: VmFilterState, values: string[]): FacetOption[] {
  const base = rows.filter((row) => rowMatches(row, filters, 'categories'));
  return toFacetOptions(values, countBy(base, (row) => row.spec.category));
}

export function buildSeriesFacets(rows: VmRow[], filters: VmFilterState, values: string[]): FacetOption[] {
  const base = rows.filter((row) => rowMatches(row, filters, 'series'));
  return toFacetOptions(values, countBy(base, (row) => row.spec.series));
}

export function buildArchitectureFacets(rows: VmRow[], filters: VmFilterState, values: string[]): FacetOption[] {
  const base = rows.filter((row) => rowMatches(row, filters, 'architectures'));
  return toFacetOptions(values, countBy(base, (row) => row.spec.architecture));
}

/** Capabilities are ANDed, so each is counted against the fully filtered set. */
export function buildFeatureFacets(filteredRows: VmRow[]): FacetOption[] {
  return VM_FEATURE_OPTIONS.map((feature) => ({
    value: feature.value,
    label: feature.label,
    count: filteredRows.filter((row) => matchesFeature(row.spec, feature.value)).length
  }));
}

export function buildVcpuPresetCounts(rows: VmRow[], filters: VmFilterState): PresetCount[] {
  const base = rows.filter((row) => rowMatches(row, filters, 'vcpus'));
  return VCPU_PRESETS.map((preset) => ({
    value: preset,
    count: base.filter((row) => getEffectiveVcpus(row.spec) === preset).length
  }));
}

export function buildMemoryPresetCounts(rows: VmRow[], filters: VmFilterState): PresetCount[] {
  const base = rows.filter((row) => rowMatches(row, filters, 'memory'));
  return MEMORY_PRESETS.map((preset) => ({
    value: preset,
    count: base.filter((row) => row.spec.memoryGB === preset).length
  }));
}

export function countActiveFilters(filters: VmFilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  count += filters.categories.length;
  count += filters.series.length;
  count += filters.architectures.length;
  count += filters.features.length;
  if (filters.minVcpus !== null) count++;
  if (filters.maxVcpus !== null) count++;
  if (filters.minMemoryGB !== null) count++;
  if (filters.maxMemoryGB !== null) count++;
  if (filters.maxPrice !== null) count++;
  return count;
}
