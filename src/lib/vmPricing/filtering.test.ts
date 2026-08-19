import { describe, it, expect } from 'vitest';
import {
  EMPTY_VM_FILTERS,
  VM_FEATURE_OPTIONS,
  buildArchitectureFacets,
  buildCategoryFacets,
  buildFeatureFacets,
  buildMemoryPresetCounts,
  buildSeriesFacets,
  buildVcpuPresetCounts,
  countActiveFilters,
  matchesSearch,
  rowMatches,
  toHourlyThreshold,
  type FacetOption,
  type PresetCount,
  type VmFilterState,
  type VmRow
} from './filtering';
import type { VmSkuSpec } from '@/types/vmPricing';

function spec(overrides: Partial<VmSkuSpec> & Pick<VmSkuSpec, 'sku'>): VmSkuSpec {
  return {
    size: overrides.sku.replace(/^Standard_/, ''),
    family: '',
    series: 'Dsv5',
    category: 'General purpose',
    vcpus: 4,
    vcpusAvailable: 4,
    memoryGB: 16,
    maxDataDisks: 8,
    maxNetworkInterfaces: 2,
    tempDiskGB: 0,
    architecture: 'x64',
    gpuCount: null,
    premiumIO: true,
    acceleratedNetworking: true,
    rdma: false,
    encryptionAtHost: true,
    ephemeralOSDisk: false,
    trustedLaunch: true,
    confidentialComputing: false,
    hibernation: false,
    regions: [0],
    specSource: 'arm',
    ...overrides
  };
}

function row(entry: VmSkuSpec, hourly: number | null = 0.5): VmRow {
  return { spec: entry, packed: undefined, hourly, estimated: false, savings: null, pricePerVcpu: null, pricePerGB: null };
}

const ROWS: VmRow[] = [
  row(spec({ sku: 'Standard_D4s_v5', series: 'Dsv5', vcpus: 4, vcpusAvailable: 4, memoryGB: 16 })),
  row(spec({ sku: 'Standard_D8s_v5', series: 'Dsv5', vcpus: 8, vcpusAvailable: 8, memoryGB: 32 })),
  row(
    spec({
      sku: 'Standard_E8s_v5',
      series: 'Esv5',
      category: 'Memory optimized',
      vcpus: 8,
      vcpusAvailable: 8,
      memoryGB: 64
    })
  ),
  row(spec({ sku: 'Standard_A4_v2', series: 'Av2', vcpus: 4, vcpusAvailable: 4, memoryGB: 8, tempDiskGB: 40 })),
  row(spec({ sku: 'Standard_D4pls_v5', series: 'Dplsv5', vcpus: 4, vcpusAvailable: 4, memoryGB: 16, architecture: 'Arm64' }))
];

const CATEGORIES = ['General purpose', 'Memory optimized'];
const SERIES = ['Av2', 'Dplsv5', 'Dsv5', 'Esv5'];
const ARCHITECTURES = ['Arm64', 'x64'];

function filters(overrides: Partial<VmFilterState> = {}): VmFilterState {
  return { ...EMPTY_VM_FILTERS, ...overrides };
}

function applied(state: VmFilterState): VmRow[] {
  return ROWS.filter((entry) => rowMatches(entry, state, null));
}

function count(facets: FacetOption[] | PresetCount[], value: string | number): number | undefined {
  return (facets as { value: string | number; count: number }[]).find((facet) => facet.value === value)?.count;
}

describe('rowMatches', () => {
  it('keeps everything when no filter is set', () => {
    expect(applied(filters())).toHaveLength(5);
  });

  it('applies vCPU and memory bounds', () => {
    expect(applied(filters({ minVcpus: 8 }))).toHaveLength(2);
    expect(applied(filters({ maxVcpus: 4 }))).toHaveLength(3);
    expect(applied(filters({ minMemoryGB: 32 }))).toHaveLength(2);
    expect(applied(filters({ minVcpus: 8, maxMemoryGB: 32 }))).toHaveLength(1);
  });

  it('ORs within the series facet but ANDs across facets', () => {
    expect(applied(filters({ series: ['Dsv5', 'Esv5'] }))).toHaveLength(3);
    expect(applied(filters({ series: ['Dsv5', 'Esv5'], categories: ['Memory optimized'] }))).toHaveLength(1);
  });

  it('ANDs capability filters together', () => {
    expect(applied(filters({ features: ['tempDisk'] }))).toHaveLength(1);
    expect(applied(filters({ features: ['tempDisk', 'noTempDisk'] }))).toHaveLength(0);
  });

  it('drops unpriced rows only when pricedOnly is set', () => {
    const unpriced = [row(spec({ sku: 'Standard_X1' }), null)];
    expect(unpriced.filter((entry) => rowMatches(entry, filters({ pricedOnly: true }), null))).toHaveLength(0);
    expect(unpriced.filter((entry) => rowMatches(entry, filters({ pricedOnly: false }), null))).toHaveLength(1);
  });

  it('ignores the excluded facet', () => {
    const state = filters({ minVcpus: 8 });
    expect(ROWS.filter((entry) => rowMatches(entry, state, 'vcpus'))).toHaveLength(5);
    expect(ROWS.filter((entry) => rowMatches(entry, state, 'memory'))).toHaveLength(2);
  });
});

describe('matchesSearch', () => {
  it('ignores separators and case', () => {
    const target = spec({ sku: 'Standard_D4s_v5' });
    expect(matchesSearch(target, 'd4sv5')).toBe(true);
    expect(matchesSearch(target, 'D4S_V5')).toBe(true);
    expect(matchesSearch(target, 'dsv5')).toBe(true);
    expect(matchesSearch(target, 'e8s')).toBe(false);
  });

  it('matches on workload category too', () => {
    expect(matchesSearch(spec({ sku: 'Standard_D4s_v5' }), 'general')).toBe(true);
  });
});

describe('facet counts', () => {
  it('counts every option when nothing is filtered', () => {
    const state = filters();
    expect(count(buildCategoryFacets(ROWS, state, CATEGORIES), 'General purpose')).toBe(4);
    expect(count(buildCategoryFacets(ROWS, state, CATEGORIES), 'Memory optimized')).toBe(1);
    expect(count(buildSeriesFacets(ROWS, state, SERIES), 'Dsv5')).toBe(2);
  });

  it('zeroes options that another facet has ruled out', () => {
    const state = filters({ minVcpus: 8 });
    const facets = buildSeriesFacets(ROWS, state, SERIES);

    expect(count(facets, 'Dsv5')).toBe(1);
    expect(count(facets, 'Esv5')).toBe(1);
    expect(count(facets, 'Av2')).toBe(0);
    expect(count(facets, 'Dplsv5')).toBe(0);
  });

  it('keeps sibling options in the same facet selectable', () => {
    const state = filters({ series: ['Dsv5'] });
    const facets = buildSeriesFacets(ROWS, state, SERIES);

    // Selecting Dsv5 must not zero out its siblings, or the facet could never be changed.
    expect(count(facets, 'Esv5')).toBe(1);
    expect(count(facets, 'Av2')).toBe(1);
  });

  it('narrows a different facet from the one selected', () => {
    const state = filters({ series: ['Esv5'] });
    const facets = buildCategoryFacets(ROWS, state, CATEGORIES);

    expect(count(facets, 'Memory optimized')).toBe(1);
    expect(count(facets, 'General purpose')).toBe(0);
  });

  it('counts ANDed capabilities against the filtered set', () => {
    const state = filters({ features: ['tempDisk'] });
    const facets = buildFeatureFacets(applied(state));

    expect(count(facets, 'tempDisk')).toBe(1);
    expect(count(facets, 'noTempDisk')).toBe(0);
  });

  it('covers every capability option', () => {
    expect(buildFeatureFacets(ROWS)).toHaveLength(VM_FEATURE_OPTIONS.length);
  });

  it('counts architectures and zeroes unreachable ones', () => {
    expect(count(buildArchitectureFacets(ROWS, filters(), ARCHITECTURES), 'Arm64')).toBe(1);
    expect(count(buildArchitectureFacets(ROWS, filters(), ARCHITECTURES), 'x64')).toBe(4);
    expect(count(buildArchitectureFacets(ROWS, filters({ minMemoryGB: 32 }), ARCHITECTURES), 'Arm64')).toBe(0);
  });

  it('reports zero for a contradictory combination', () => {
    const state = filters({ minVcpus: 8, series: ['Av2'] });
    expect(applied(state)).toHaveLength(0);
    expect(count(buildSeriesFacets(ROWS, state, SERIES), 'Av2')).toBe(0);
  });

  it('counts presets against the other facets', () => {
    const state = filters({ minMemoryGB: 32 });
    expect(count(buildVcpuPresetCounts(ROWS, state), 8)).toBe(2);
    expect(count(buildVcpuPresetCounts(ROWS, state), 4)).toBe(0);
  });

  it('ignores its own range when counting presets', () => {
    const state = filters({ minVcpus: 8, maxVcpus: 8 });
    expect(count(buildVcpuPresetCounts(ROWS, state), 4)).toBe(3);
    expect(count(buildVcpuPresetCounts(ROWS, state), 8)).toBe(2);
  });

  it('counts memory presets', () => {
    expect(count(buildMemoryPresetCounts(ROWS, filters()), 16)).toBe(2);
    expect(count(buildMemoryPresetCounts(ROWS, filters()), 64)).toBe(1);
    expect(count(buildMemoryPresetCounts(ROWS, filters({ minVcpus: 8 })), 16)).toBe(0);
  });
});

describe('max price', () => {
  it('converts a monthly budget to an hourly ceiling', () => {
    expect(toHourlyThreshold(730, 'monthly')).toBe(1);
    expect(toHourlyThreshold(1, 'hourly')).toBe(1);
  });

  it('filters on a monthly budget', () => {
    // Every row is priced at 0.5/hour, which is 365/month.
    expect(applied(filters({ maxPrice: 400, maxPriceUnit: 'monthly' }))).toHaveLength(5);
    expect(applied(filters({ maxPrice: 300, maxPriceUnit: 'monthly' }))).toHaveLength(0);
  });

  it('filters on an hourly budget', () => {
    expect(applied(filters({ maxPrice: 0.5, maxPriceUnit: 'hourly' }))).toHaveLength(5);
    expect(applied(filters({ maxPrice: 0.4, maxPriceUnit: 'hourly' }))).toHaveLength(0);
  });

  it('drops unpriced rows regardless of the pricedOnly setting', () => {
    const unpriced = [row(spec({ sku: 'Standard_X1' }), null)];
    const state = filters({ maxPrice: 1000, maxPriceUnit: 'monthly', pricedOnly: false });
    expect(unpriced.filter((entry) => rowMatches(entry, state, null))).toHaveLength(0);
  });

  it('is ignored when the price facet is excluded', () => {
    const state = filters({ maxPrice: 1, maxPriceUnit: 'monthly' });
    expect(ROWS.filter((entry) => rowMatches(entry, state, 'price'))).toHaveLength(5);
  });
});

describe('countActiveFilters', () => {
  it('counts each bound and each selection', () => {
    expect(countActiveFilters(filters())).toBe(0);
    expect(countActiveFilters(filters({ minVcpus: 2, maxVcpus: 8 }))).toBe(2);
    expect(countActiveFilters(filters({ series: ['Dsv5', 'Esv5'], features: ['gpu'] }))).toBe(3);
    expect(countActiveFilters(filters({ search: '  ' }))).toBe(0);
    expect(countActiveFilters(filters({ search: 'd4s' }))).toBe(1);
  });

  it('does not count pricedOnly, which is on by default', () => {
    expect(countActiveFilters(filters({ pricedOnly: false }))).toBe(0);
  });

  it('counts a max price once, not its unit', () => {
    expect(countActiveFilters(filters({ maxPrice: 500, maxPriceUnit: 'monthly' }))).toBe(1);
    expect(countActiveFilters(filters({ maxPriceUnit: 'hourly' }))).toBe(0);
  });
});
