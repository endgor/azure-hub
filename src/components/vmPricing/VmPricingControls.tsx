import { useMemo } from 'react';
import Select, { type SelectOption } from '@/components/shared/Select';
import HoursPerMonthField from '@/components/vmPricing/HoursPerMonthField';
import { VM_PRICE_MODES, getCurrencyLabel } from '@/lib/vmPricing/pricing';
import type { VmCurrency, VmCurrencyRate, VmOperatingSystem, VmPriceMode, VmRegionInfo } from '@/types/vmPricing';

export type VmPriceDisplay = 'hourly' | 'monthly';

const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-800"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface VmPricingControlsProps {
  regions: VmRegionInfo[];
  region: string;
  onRegionChange: (region: string) => void;
  currency: VmCurrency;
  currencies: VmCurrencyRate[];
  onCurrencyChange: (currency: VmCurrency) => void;
  os: VmOperatingSystem;
  onOsChange: (os: VmOperatingSystem) => void;
  priceMode: VmPriceMode;
  onPriceModeChange: (mode: VmPriceMode) => void;
  display: VmPriceDisplay;
  onDisplayChange: (display: VmPriceDisplay) => void;
  hoursPerMonth: number;
  onHoursPerMonthChange: (hours: number) => void;
}

export default function VmPricingControls({
  regions,
  region,
  onRegionChange,
  currency,
  currencies,
  onCurrencyChange,
  os,
  onOsChange,
  priceMode,
  onPriceModeChange,
  display,
  onDisplayChange,
  hoursPerMonth,
  onHoursPerMonthChange
}: VmPricingControlsProps) {
  const regionOptions = useMemo<SelectOption[]>(
    () =>
      [...regions]
        .sort((a, b) => a.geography.localeCompare(b.geography) || a.displayName.localeCompare(b.displayName))
        .map((entry) => ({
          value: entry.name,
          label: entry.displayName,
          description: entry.name,
          group: entry.geography
        })),
    [regions]
  );

  const priceModeOptions = useMemo<SelectOption[]>(
    () => VM_PRICE_MODES.map((mode) => ({ value: mode.value, label: mode.label })),
    []
  );

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

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-4 p-4">
      <div className="min-w-[13rem] flex-1 space-y-1.5">
        <span id="vm-region-label" className={labelClass}>
          Region
        </span>
        <Select
          id="vm-region"
          ariaLabel="Region"
          value={region}
          onChange={onRegionChange}
          options={regionOptions}
          searchable
          searchPlaceholder={`Filter ${regions.length} regions...`}
        />
      </div>

      <div className="min-w-[12rem] flex-1 space-y-1.5">
        <span id="vm-price-mode-label" className={labelClass}>
          Pricing model
        </span>
        <Select
          id="vm-price-mode"
          ariaLabel="Pricing model"
          value={priceMode}
          onChange={(value) => onPriceModeChange(value as VmPriceMode)}
          options={priceModeOptions}
        />
      </div>

      <div className="space-y-1.5">
        <span className={labelClass}>Operating system</span>
        <Segmented
          ariaLabel="Operating system"
          value={os}
          onChange={onOsChange}
          options={[
            { value: 'linux', label: 'Linux' },
            { value: 'windows', label: 'Windows' }
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <span className={labelClass}>Show price</span>
        <Segmented
          ariaLabel="Price display"
          value={display}
          onChange={onDisplayChange}
          options={[
            { value: 'hourly', label: 'Hourly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
        />
      </div>

      {display === 'monthly' && (
        <HoursPerMonthField
          id="vm-hours-per-month"
          hoursPerMonth={hoursPerMonth}
          onChange={onHoursPerMonthChange}
          labelClass={labelClass}
        />
      )}

      <div className="min-w-[9rem] space-y-1.5">
        <span className={labelClass}>Currency</span>
        <Select
          ariaLabel="Currency"
          value={currency}
          onChange={onCurrencyChange}
          options={currencyOptions}
          searchable
          searchPlaceholder={`Filter ${currencies.length} currencies...`}
          widthClass="w-full"
        />
      </div>
    </div>
  );
}
