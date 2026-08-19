import { useEffect, useMemo, useRef, useState } from 'react';
import SearchInput from '@/components/shared/SearchInput';
import FilterPopover from '@/components/shared/FilterPopover';
import Select, { type SelectOption } from '@/components/shared/Select';
import {
  VM_FEATURE_OPTIONS,
  type VmFilterState,
  type VmFeature,
  type FacetOption,
  type PresetCount,
  type VmPriceUnit
} from '@/hooks/vmPricing/useVmFilters';
import { getCurrencyLabel, getCurrencySymbol } from '@/lib/vmPricing/pricing';
import type { VmCurrency, VmCurrencyRate } from '@/types/vmPricing';

const numberInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

function presetChipClass(active: boolean, disabled: boolean): string {
  if (active) return 'rounded-lg px-2 py-1 text-xs font-medium transition bg-slate-900 text-white dark:bg-white dark:text-slate-900';
  if (disabled)
    return 'rounded-lg px-2 py-1 text-xs font-medium cursor-not-allowed bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600';
  return 'rounded-lg px-2 py-1 text-xs font-medium transition bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Renders "8", "8+", "≤ 16" or "8–32" depending on which bounds are set. */
function rangeSummary(min: number | null, max: number | null, unit: string): string | undefined {
  if (min === null && max === null) return undefined;
  if (min !== null && max !== null) return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
  if (min !== null) return `${min}+ ${unit}`;
  return `≤ ${max} ${unit}`;
}

interface RangeEditorProps {
  presetCounts: PresetCount[];
  min: number | null;
  max: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  idPrefix: string;
}

function RangeEditor({ presetCounts, min, max, onMinChange, onMaxChange, idPrefix }: RangeEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {presetCounts.map((preset) => {
          const active = min === preset.value && max === preset.value;
          const disabled = preset.count === 0 && !active;
          return (
            <button
              key={preset.value}
              type="button"
              disabled={disabled}
              title={disabled ? 'No sizes match the other filters' : `${preset.count} sizes`}
              onClick={() => {
                onMinChange(active ? null : preset.value);
                onMaxChange(active ? null : preset.value);
              }}
              className={presetChipClass(active, disabled)}
            >
              {preset.value}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <label className="flex-1 space-y-1">
          <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Min</span>
          <input
            id={`${idPrefix}-min`}
            type="number"
            min={0}
            value={min ?? ''}
            onChange={(event) => onMinChange(parseNumber(event.target.value))}
            className={numberInputClass}
          />
        </label>
        <label className="flex-1 space-y-1">
          <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Max</span>
          <input
            id={`${idPrefix}-max`}
            type="number"
            min={0}
            value={max ?? ''}
            onChange={(event) => onMaxChange(parseNumber(event.target.value))}
            className={numberInputClass}
          />
        </label>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">A preset selects that exact count.</p>
    </div>
  );
}

interface CheckboxListProps {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

function CheckboxList({ options, selected, onToggle, searchable, searchPlaceholder }: CheckboxListProps) {
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // The list only mounts when its popover opens, so focus the filter box straight away.
  useEffect(() => {
    if (searchable) searchRef.current?.focus();
  }, [searchable]);

  const chosen = useMemo(() => new Set(selected), [selected]);

  /** Unreachable options are hidden unless they are selected, so the list only offers real choices. */
  const reachable = useMemo(
    () => options.filter((option) => option.count > 0 || chosen.has(option.value)),
    [options, chosen]
  );

  const hiddenCount = options.length - reachable.length;
  const pool = showEmpty ? options : reachable;

  const visible = useMemo(() => {
    if (!searchable || !query.trim()) return pool;
    const needle = query.toLowerCase().replace(/[_\s-]/g, '');
    return pool.filter((option) => option.label.toLowerCase().replace(/[_\s-]/g, '').includes(needle));
  }, [pool, query, searchable]);

  return (
    <div className="space-y-2">
      {searchable && (
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={numberInputClass}
        />
      )}

      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {visible.length === 0 && (
          <p className="px-1 py-3 text-center text-xs text-slate-500 dark:text-slate-400">No matches</p>
        )}
        {visible.map((option) => {
          const isChosen = chosen.has(option.value);
          const isEmpty = option.count === 0;

          return (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs transition ${
                isEmpty && !isChosen
                  ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'cursor-pointer text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="checkbox"
                checked={isChosen}
                disabled={isEmpty && !isChosen}
                onChange={() => onToggle(option.value)}
                className="h-3.5 w-3.5 shrink-0 rounded border-slate-400 text-sky-600 focus:ring-sky-500/30 disabled:opacity-50 dark:border-slate-500"
              />
              <span className="flex-1 truncate">{option.label}</span>
              <span
                className={`shrink-0 text-[10px] tabular-nums ${
                  isEmpty ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {option.count.toLocaleString()}
              </span>
            </label>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowEmpty((current) => !current)}
          className="w-full text-left text-[11px] text-sky-600 underline decoration-dotted underline-offset-2 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {showEmpty ? 'Hide' : 'Show'} {hiddenCount} with no matches
        </button>
      )}
    </div>
  );
}

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface VmFilterPanelProps {
  filters: VmFilterState;
  updateFilter: <K extends keyof VmFilterState>(key: K, value: VmFilterState[K]) => void;
  toggleListValue: <K extends 'categories' | 'series' | 'architectures' | 'features'>(
    key: K,
    value: VmFilterState[K][number]
  ) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  categoryFacets: FacetOption[];
  seriesFacets: FacetOption[];
  architectureFacets: FacetOption[];
  featureFacets: FacetOption[];
  vcpuPresetCounts: PresetCount[];
  memoryPresetCounts: PresetCount[];
  resultCount: number;
  totalCount: number;
  /** Sizes the `pricedOnly` gate is hiding, so the gap in "N of M" can be explained. */
  unpricedCount: number;
  currency: VmCurrency;
  currencies: VmCurrencyRate[];
  onCurrencyChange: (currency: VmCurrency) => void;
  hoursPerMonth: number;
}

export default function VmFilterPanel({
  filters,
  updateFilter,
  toggleListValue,
  resetFilters,
  activeFilterCount,
  categoryFacets,
  seriesFacets,
  architectureFacets,
  featureFacets,
  vcpuPresetCounts,
  memoryPresetCounts,
  resultCount,
  totalCount,
  unpricedCount,
  currency,
  currencies,
  onCurrencyChange,
  hoursPerMonth
}: VmFilterPanelProps) {
  const currencyOptions = useMemo<SelectOption[]>(
    () =>
      [...currencies]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((entry) => ({
          value: entry.code,
          label: entry.code,
          description: getCurrencyLabel(entry.code)
        })),
    [currencies]
  );

  const capabilityOptions = useMemo<FacetOption[]>(
    () => [
      ...featureFacets.map((feature) => ({ ...feature, value: `feature:${feature.value}` })),
      ...architectureFacets.map((architecture) => ({ ...architecture, value: `arch:${architecture.value}` }))
    ],
    [architectureFacets, featureFacets]
  );

  const selectedCapabilities = useMemo(
    () => [
      ...filters.features.map((feature) => `feature:${feature}`),
      ...filters.architectures.map((architecture) => `arch:${architecture}`)
    ],
    [filters.architectures, filters.features]
  );

  const toggleCapability = (value: string) => {
    const [kind, raw] = value.split(':');
    if (kind === 'feature') {
      toggleListValue('features', raw as VmFeature);
    } else {
      toggleListValue('architectures', raw);
    }
  };

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];

    const vcpu = rangeSummary(filters.minVcpus, filters.maxVcpus, 'vCPU');
    if (vcpu) {
      chips.push({
        key: 'vcpu',
        label: vcpu,
        onRemove: () => {
          updateFilter('minVcpus', null);
          updateFilter('maxVcpus', null);
        }
      });
    }

    const memory = rangeSummary(filters.minMemoryGB, filters.maxMemoryGB, 'GiB');
    if (memory) {
      chips.push({
        key: 'memory',
        label: memory,
        onRemove: () => {
          updateFilter('minMemoryGB', null);
          updateFilter('maxMemoryGB', null);
        }
      });
    }

    for (const category of filters.categories) {
      chips.push({ key: `cat-${category}`, label: category, onRemove: () => toggleListValue('categories', category) });
    }

    for (const feature of filters.features) {
      const label = VM_FEATURE_OPTIONS.find((option) => option.value === feature)?.label ?? feature;
      chips.push({ key: `feat-${feature}`, label, onRemove: () => toggleListValue('features', feature) });
    }

    for (const architecture of filters.architectures) {
      chips.push({
        key: `arch-${architecture}`,
        label: architecture,
        onRemove: () => toggleListValue('architectures', architecture)
      });
    }

    for (const series of filters.series) {
      chips.push({ key: `series-${series}`, label: series, onRemove: () => toggleListValue('series', series) });
    }

    if (filters.maxPrice !== null) {
      chips.push({
        key: 'maxPrice',
        label: `≤ ${getCurrencySymbol(currency)}${filters.maxPrice}/${filters.maxPriceUnit === 'monthly' ? 'mo' : 'hr'}`,
        onRemove: () => updateFilter('maxPrice', null)
      });
    }

    if (!filters.pricedOnly) {
      chips.push({
        key: 'pricedOnly',
        label: 'Including unpriced sizes',
        onRemove: () => updateFilter('pricedOnly', true)
      });
    }

    return chips;
  }, [currency, filters, toggleListValue, updateFilter]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search a VM size, e.g. D4s_v5 or Easv6..."
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          maxWidth="xl"
          containerClassName="flex-1 min-w-[16rem]"
        />

        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
            {resultCount.toLocaleString()} of {totalCount.toLocaleString()} sizes
            {unpricedCount > 0 && (
              <span className="hidden sm:inline">
                {' '}
                · {unpricedCount.toLocaleString()} unpriced hidden
              </span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="whitespace-nowrap text-xs font-medium text-sky-600 underline decoration-dotted underline-offset-2 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPopover
          label="vCPUs"
          summary={rangeSummary(filters.minVcpus, filters.maxVcpus, 'vCPU')}
          onClear={() => {
            updateFilter('minVcpus', null);
            updateFilter('maxVcpus', null);
          }}
        >
          <RangeEditor
            idPrefix="vm-vcpu"
            presetCounts={vcpuPresetCounts}
            min={filters.minVcpus}
            max={filters.maxVcpus}
            onMinChange={(value) => updateFilter('minVcpus', value)}
            onMaxChange={(value) => updateFilter('maxVcpus', value)}
          />
        </FilterPopover>

        <FilterPopover
          label="Memory"
          summary={rangeSummary(filters.minMemoryGB, filters.maxMemoryGB, 'GiB')}
          onClear={() => {
            updateFilter('minMemoryGB', null);
            updateFilter('maxMemoryGB', null);
          }}
        >
          <RangeEditor
            idPrefix="vm-memory"
            presetCounts={memoryPresetCounts}
            min={filters.minMemoryGB}
            max={filters.maxMemoryGB}
            onMinChange={(value) => updateFilter('minMemoryGB', value)}
            onMaxChange={(value) => updateFilter('maxMemoryGB', value)}
          />
        </FilterPopover>

        <FilterPopover
          label="Workload type"
          activeCount={filters.categories.length}
          onClear={() => updateFilter('categories', [])}
        >
          <CheckboxList
            options={categoryFacets}
            selected={filters.categories}
            onToggle={(value) => toggleListValue('categories', value)}
          />
        </FilterPopover>

        <FilterPopover
          label="Capabilities"
          activeCount={selectedCapabilities.length}
          onClear={() => {
            updateFilter('features', []);
            updateFilter('architectures', []);
          }}
        >
          <CheckboxList options={capabilityOptions} selected={selectedCapabilities} onToggle={toggleCapability} />
        </FilterPopover>

        <FilterPopover label="Series" activeCount={filters.series.length} onClear={() => updateFilter('series', [])}>
          <CheckboxList
            options={seriesFacets}
            selected={filters.series}
            onToggle={(value) => toggleListValue('series', value)}
            searchable
            searchPlaceholder="Filter series..."
          />
        </FilterPopover>

        <FilterPopover
          label="Price"
          activeCount={filters.maxPrice !== null ? 1 : 0}
          onClear={() => updateFilter('maxPrice', null)}
          panelWidthClass="w-72"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Budget per
              </span>
              <div
                role="group"
                aria-label="Budget period"
                className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-800"
              >
                {(
                  [
                    { value: 'monthly' as VmPriceUnit, label: 'Month' },
                    { value: 'hourly' as VmPriceUnit, label: 'Hour' }
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFilter('maxPriceUnit', option.value)}
                    aria-pressed={filters.maxPriceUnit === option.value}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      filters.maxPriceUnit === option.value
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Max {filters.maxPriceUnit === 'monthly' ? `monthly cost over ${hoursPerMonth}h` : 'hourly cost'} (
                {currency})
              </span>
              <input
                type="number"
                min={0}
                step={filters.maxPriceUnit === 'monthly' ? '10' : '0.01'}
                placeholder={filters.maxPriceUnit === 'monthly' ? 'e.g. 500' : 'e.g. 0.50'}
                value={filters.maxPrice ?? ''}
                onChange={(event) => updateFilter('maxPrice', parseNumber(event.target.value))}
                className={numberInputClass}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={filters.pricedOnly}
                onChange={(event) => updateFilter('pricedOnly', event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-400 text-sky-600 focus:ring-sky-500/30 dark:border-slate-500"
              />
              <span>Hide sizes with no price for the selected options</span>
            </label>
          </div>
        </FilterPopover>

        {/* Currency sits beside Price because the budget above is entered in it. The divider
            keeps it from reading as a filter — it never counts toward Reset all. */}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Currency</span>
          <Select
            ariaLabel="Currency"
            value={currency}
            onChange={onCurrencyChange}
            options={currencyOptions}
            searchable
            searchPlaceholder={`Filter ${currencies.length} currencies...`}
            widthClass="w-24"
            panelWidthClass="w-64"
            compact
          />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 py-1 pl-2 pr-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="rounded p-0.5 text-sky-500 transition hover:bg-sky-100 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-200"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
