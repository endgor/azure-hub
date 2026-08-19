import { useCallback, useMemo, useState } from 'react';
import { resolvePrice, getSavingsFraction } from '@/lib/vmPricing/pricing';
import {
  EMPTY_VM_FILTERS,
  buildArchitectureFacets,
  buildCategoryFacets,
  buildFeatureFacets,
  buildMemoryPresetCounts,
  buildSeriesFacets,
  buildVcpuPresetCounts,
  countActiveFilters,
  getEffectiveVcpus,
  rowMatches,
  type VmFilterState,
  type VmPriceContext,
  type VmRow
} from '@/lib/vmPricing/filtering';
import type { VmOperatingSystem, VmPriceMode, VmRegionPrices, VmSkuSpec } from '@/types/vmPricing';

export {
  EMPTY_VM_FILTERS,
  VM_FEATURE_OPTIONS,
  VCPU_PRESETS,
  MEMORY_PRESETS
} from '@/lib/vmPricing/filtering';
export type { VmFilterState, VmFeature, VmRow, FacetOption, PresetCount, VmPriceUnit } from '@/lib/vmPricing/filtering';

export type VmSortKey = 'sku' | 'series' | 'vcpus' | 'memory' | 'price' | 'pricePerVcpu' | 'pricePerGB' | 'savings';
export type VmSortDirection = 'asc' | 'desc';

interface UseVmFiltersOptions {
  specs: VmSkuSpec[];
  regionPrices: VmRegionPrices | null;
  os: VmOperatingSystem;
  priceMode: VmPriceMode;
  regionIndex: number | null;
  /** Runtime used to turn a monthly budget filter into an hourly ceiling. */
  hoursPerMonth: number;
  /** Rate the displayed currency is derived at, so a budget filter is compared like for like. */
  currencyRate: number;
}

export function useVmFilters({
  specs,
  regionPrices,
  os,
  priceMode,
  regionIndex,
  hoursPerMonth,
  currencyRate
}: UseVmFiltersOptions) {
  const [filters, setFilters] = useState<VmFilterState>(EMPTY_VM_FILTERS);
  const [sortKey, setSortKey] = useState<VmSortKey>('price');
  const [sortDirection, setSortDirection] = useState<VmSortDirection>('asc');

  const updateFilter = useCallback(<K extends keyof VmFilterState>(key: K, value: VmFilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleListValue = useCallback(
    <K extends 'categories' | 'series' | 'architectures' | 'features'>(key: K, value: VmFilterState[K][number]) => {
      setFilters((current) => {
        const list = current[key] as VmFilterState[K][number][];
        const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
        return { ...current, [key]: next };
      });
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(EMPTY_VM_FILTERS), []);

  const priceContext = useMemo<VmPriceContext>(
    () => ({ hoursPerMonth, currencyRate }),
    [hoursPerMonth, currencyRate]
  );

  /** SKUs offered in the selected region, before the user's filters. */
  const regionalSpecs = useMemo(() => {
    if (regionIndex === null) return specs;
    return specs.filter((spec) => spec.regions.includes(regionIndex));
  }, [specs, regionIndex]);

  const rows = useMemo<VmRow[]>(() => {
    const prices = regionPrices?.prices;

    return regionalSpecs.map((spec) => {
      const packed = prices?.[spec.sku];
      const resolved = resolvePrice(packed, os, priceMode);
      const hourly = resolved?.hourly ?? null;
      const vcpus = getEffectiveVcpus(spec);

      return {
        spec,
        packed,
        hourly,
        estimated: resolved?.estimated ?? false,
        savings: getSavingsFraction(packed, os, priceMode),
        pricePerVcpu: hourly !== null && vcpus ? hourly / vcpus : null,
        pricePerGB: hourly !== null && spec.memoryGB ? hourly / spec.memoryGB : null
      };
    });
  }, [regionalSpecs, regionPrices, os, priceMode]);

  const availableCategories = useMemo(
    () => Array.from(new Set(regionalSpecs.map((spec) => spec.category))).sort(),
    [regionalSpecs]
  );

  const availableSeries = useMemo(
    () => Array.from(new Set(regionalSpecs.map((spec) => spec.series))).sort(),
    [regionalSpecs]
  );

  const availableArchitectures = useMemo(
    () =>
      Array.from(
        new Set(regionalSpecs.map((spec) => spec.architecture).filter((value): value is string => !!value))
      ).sort(),
    [regionalSpecs]
  );

  const filteredRows = useMemo(() => {
    const result = rows.filter((row) => rowMatches(row, filters, null, priceContext));
    const direction = sortDirection === 'asc' ? 1 : -1;

    const compareNullableNumbers = (a: number | null, b: number | null): number => {
      // Unpriced or unknown values always sort last, whichever direction is active.
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return (a - b) * direction;
    };

    return result.sort((a, b) => {
      switch (sortKey) {
        case 'sku':
          return a.spec.sku.localeCompare(b.spec.sku) * direction;
        case 'series':
          return (a.spec.series.localeCompare(b.spec.series) || a.spec.sku.localeCompare(b.spec.sku)) * direction;
        case 'vcpus':
          return compareNullableNumbers(getEffectiveVcpus(a.spec), getEffectiveVcpus(b.spec));
        case 'memory':
          return compareNullableNumbers(a.spec.memoryGB, b.spec.memoryGB);
        case 'pricePerVcpu':
          return compareNullableNumbers(a.pricePerVcpu, b.pricePerVcpu);
        case 'pricePerGB':
          return compareNullableNumbers(a.pricePerGB, b.pricePerGB);
        case 'savings':
          return compareNullableNumbers(a.savings, b.savings);
        case 'price':
        default:
          return compareNullableNumbers(a.hourly, b.hourly);
      }
    });
  }, [rows, filters, sortKey, sortDirection, priceContext]);

  const categoryFacets = useMemo(
    () => buildCategoryFacets(rows, filters, availableCategories, priceContext),
    [rows, filters, availableCategories, priceContext]
  );

  const seriesFacets = useMemo(
    () => buildSeriesFacets(rows, filters, availableSeries, priceContext),
    [rows, filters, availableSeries, priceContext]
  );

  const architectureFacets = useMemo(
    () => buildArchitectureFacets(rows, filters, availableArchitectures, priceContext),
    [rows, filters, availableArchitectures, priceContext]
  );

  const featureFacets = useMemo(() => buildFeatureFacets(filteredRows), [filteredRows]);

  const vcpuPresetCounts = useMemo(
    () => buildVcpuPresetCounts(rows, filters, priceContext),
    [rows, filters, priceContext]
  );

  const memoryPresetCounts = useMemo(
    () => buildMemoryPresetCounts(rows, filters, priceContext),
    [rows, filters, priceContext]
  );

  const toggleSort = useCallback((key: VmSortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }
      setSortDirection('asc');
      return key;
    });
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  /** How many sizes the pricedOnly gate is hiding, measured against every other filter. */
  const unpricedCount = useMemo(() => {
    if (!filters.pricedOnly) return 0;

    const withoutGate = { ...filters, pricedOnly: false };
    return rows.filter((row) => row.hourly === null && rowMatches(row, withoutGate, null, priceContext)).length;
  }, [rows, filters, priceContext]);

  return {
    filters,
    updateFilter,
    toggleListValue,
    resetFilters,
    activeFilterCount,
    rows,
    filteredRows,
    unpricedCount,
    availableCategories,
    availableSeries,
    availableArchitectures,
    categoryFacets,
    seriesFacets,
    architectureFacets,
    featureFacets,
    vcpuPresetCounts,
    memoryPresetCounts,
    sortKey,
    sortDirection,
    toggleSort
  };
}
