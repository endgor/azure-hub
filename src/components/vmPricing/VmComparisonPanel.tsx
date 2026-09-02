import { useMemo } from 'react';
import Tooltip from '@/components/Tooltip';
import { estimateNote } from './estimateNote';
import { formatHourly, formatMonthly, formatNumber, formatPercent, resolvePrice, VM_PRICE_MODES } from '@/lib/vmPricing/pricing';
import type { VmRow } from '@/hooks/vmPricing/useVmFilters';
import type { VmCurrency, VmOperatingSystem, VmPriceMode } from '@/types/vmPricing';
import type { VmPriceDisplay } from './VmPricingControls';
import { tableBody, tableClass, tableShell } from '@/components/shared/tableStyles';

interface VmComparisonPanelProps {
  rows: VmRow[];
  currency: VmCurrency;
  os: VmOperatingSystem;
  priceMode: VmPriceMode;
  display: VmPriceDisplay;
  hoursPerMonth: number;
  currencyRate: number;
  onRemove: (sku: string) => void;
  onClear: () => void;
  /** Drops the outer card and heading when the dialog already provides them. */
  embedded?: boolean;
}

type CellValue = string | number | null;

interface SpecRow {
  label: string;
  hint?: string;
  values: CellValue[];
  /** 'high' when a larger number is better, 'low' when smaller is better. */
  better?: 'high' | 'low';
  format?: (value: CellValue) => string;
}

function EstimateMarker({ mode }: { mode: VmPriceMode }) {
  return (
    <span className="ml-0.5 align-middle">
      <Tooltip content={estimateNote(mode)} widthClass="w-64">
        <span className="px-1 text-base leading-none text-amber-500 dark:text-amber-400">
          *<span className="sr-only">Estimated rate</span>
        </span>
      </Tooltip>
    </span>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Yes
    </span>
  ) : (
    <span className="text-slate-400 dark:text-slate-500">No</span>
  );
}

export default function VmComparisonPanel({
  rows,
  currency,
  os,
  priceMode,
  display,
  hoursPerMonth,
  currencyRate,
  onRemove,
  onClear,
  embedded = false
}: VmComparisonPanelProps) {
  const formatPrice = (value: number | null): string =>
    display === 'hourly'
      ? formatHourly(value, currency, currencyRate)
      : formatMonthly(value, currency, hoursPerMonth, currencyRate);

  const specRows = useMemo<SpecRow[]>(() => {
    const specs = rows.map((row) => row.spec);

    return [
      {
        label: 'vCPUs',
        values: specs.map((spec) => spec.vcpusAvailable ?? spec.vcpus),
        better: 'high',
        format: (value) => formatNumber(value as number | null)
      },
      {
        label: 'Memory',
        hint: 'GiB',
        values: specs.map((spec) => spec.memoryGB),
        better: 'high',
        format: (value) => formatNumber(value as number | null)
      },
      {
        label: 'Temp disk',
        hint: 'GiB',
        values: specs.map((spec) => spec.tempDiskGB),
        better: 'high',
        format: (value) => (value ? formatNumber(value as number) : 'None')
      },
      {
        label: 'GPUs',
        values: specs.map((spec) => spec.gpuCount),
        better: 'high',
        format: (value) => (value ? formatNumber(value as number) : '—')
      },
      {
        label: 'Max data disks',
        values: specs.map((spec) => spec.maxDataDisks),
        better: 'high',
        format: (value) => formatNumber(value as number | null)
      },
      {
        label: 'Max NICs',
        values: specs.map((spec) => spec.maxNetworkInterfaces),
        better: 'high',
        format: (value) => formatNumber(value as number | null)
      },
      {
        label: 'Architecture',
        values: specs.map((spec) => spec.architecture),
        format: (value) => (value as string | null) ?? '—'
      },
      {
        label: 'Series',
        values: specs.map((spec) => spec.series)
      },
      {
        label: 'Workload type',
        values: specs.map((spec) => spec.category)
      },
      {
        label: 'Regions offered',
        values: specs.map((spec) => spec.regions.length),
        better: 'high',
        format: (value) => formatNumber(value as number | null)
      }
    ];
  }, [rows]);

  const bestIndexes = useMemo(() => {
    const map = new Map<string, Set<number>>();

    for (const specRow of specRows) {
      if (!specRow.better) continue;

      const numeric = specRow.values.map((value) => (typeof value === 'number' ? value : null));
      const present = numeric.filter((value): value is number => value !== null);
      if (present.length < 2) continue;

      const target = specRow.better === 'high' ? Math.max(...present) : Math.min(...present);
      if (present.every((value) => value === target)) continue;

      map.set(
        specRow.label,
        new Set(numeric.reduce<number[]>((acc, value, index) => (value === target ? [...acc, index] : acc), []))
      );
    }

    return map;
  }, [specRows]);

  const cheapestIndex = useMemo(() => {
    let best: number | null = null;
    rows.forEach((row, index) => {
      if (row.hourly === null) return;
      if (best === null || row.hourly < (rows[best].hourly ?? Infinity)) best = index;
    });
    return best;
  }, [rows]);

  const baseline = rows[0];

  const booleanRows = useMemo(
    () =>
      [
        { label: 'Premium SSD', get: (index: number) => rows[index].spec.premiumIO },
        { label: 'Accelerated networking', get: (index: number) => rows[index].spec.acceleratedNetworking },
        { label: 'RDMA', get: (index: number) => rows[index].spec.rdma },
        { label: 'Ephemeral OS disk', get: (index: number) => rows[index].spec.ephemeralOSDisk },
        { label: 'Encryption at host', get: (index: number) => rows[index].spec.encryptionAtHost },
        { label: 'Trusted launch', get: (index: number) => rows[index].spec.trustedLaunch },
        { label: 'Confidential computing', get: (index: number) => rows[index].spec.confidentialComputing },
        { label: 'Hibernation', get: (index: number) => rows[index].spec.hibernation }
      ] as const,
    [rows]
  );

  const priceModeRows = useMemo(
    () =>
      VM_PRICE_MODES.map((mode) => ({
        mode,
        prices: rows.map((row) => resolvePrice(row.packed, os, mode.value))
      })),
    [rows, os]
  );

  const headerCellClass =
    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const labelCellClass = 'px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400';

  return (
    <section
      className={
        embedded
          ? 'space-y-4'
          : 'space-y-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-500/30 dark:bg-sky-500/5'
      }
    >
      {!embedded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Comparing {rows.length} size{rows.length === 1 ? '' : 's'}
            </h2>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-sky-600 underline decoration-dotted underline-offset-2 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Clear comparison
            </button>
          </div>

          {rows.length === 1 && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tick a second size in the table to see a side-by-side difference.
            </p>
          )}
        </>
      )}

      <div className={tableShell}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th scope="col" className={headerCellClass}>
                Attribute
              </th>
              {rows.map((row, index) => (
                <th key={row.spec.sku} scope="col" className={`${headerCellClass} whitespace-nowrap`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold normal-case tracking-normal text-slate-900 dark:text-slate-100">
                      {row.spec.size}
                    </span>
                    {index === cheapestIndex && rows.length > 1 && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        cheapest
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(row.spec.sku)}
                      aria-label={`Remove ${row.spec.sku} from comparison`}
                      className="text-slate-400 transition hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tableBody}>
            <tr className="bg-slate-50/60 dark:bg-slate-800/30">
              <td className={labelCellClass}>
                {display === 'hourly' ? 'Price / hour' : `Price / month (${hoursPerMonth}h)`}
              </td>
              {rows.map((row, index) => {
                const delta =
                  index > 0 && baseline.hourly !== null && row.hourly !== null && baseline.hourly !== 0
                    ? row.hourly / baseline.hourly - 1
                    : null;

                return (
                  <td key={row.spec.sku} className="whitespace-nowrap px-3 py-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(row.hourly)}</span>
                    {row.estimated && <EstimateMarker mode={priceMode} />}
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`ml-2 text-xs ${
                          delta > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {delta > 0 ? '+' : '−'}
                        {formatPercent(Math.abs(delta))}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className={labelCellClass}>Per vCPU</td>
              {rows.map((row) => (
                <td key={row.spec.sku} className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                  {formatPrice(row.pricePerVcpu)}
                </td>
              ))}
            </tr>

            <tr>
              <td className={labelCellClass}>Per GiB RAM</td>
              {rows.map((row) => (
                <td key={row.spec.sku} className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                  {formatPrice(row.pricePerGB)}
                </td>
              ))}
            </tr>

            {specRows.map((specRow) => {
              const winners = bestIndexes.get(specRow.label);

              return (
                <tr key={specRow.label}>
                  <td className={labelCellClass}>
                    {specRow.label}
                    {specRow.hint && <span className="ml-1 font-normal">({specRow.hint})</span>}
                  </td>
                  {specRow.values.map((value, index) => (
                    <td
                      key={`${specRow.label}-${rows[index].spec.sku}`}
                      className={`whitespace-nowrap px-3 py-2 ${
                        winners?.has(index)
                          ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {specRow.format ? specRow.format(value) : (value ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}

            {booleanRows.map((booleanRow) => (
              <tr key={booleanRow.label}>
                <td className={labelCellClass}>{booleanRow.label}</td>
                {rows.map((row, index) => (
                  <td key={`${booleanRow.label}-${row.spec.sku}`} className="whitespace-nowrap px-3 py-2 text-xs">
                    <BooleanBadge value={booleanRow.get(index)} />
                  </td>
                ))}
              </tr>
            ))}

            <tr className="bg-slate-50/60 dark:bg-slate-800/30">
              <td className={`${labelCellClass} font-semibold`} colSpan={rows.length + 1}>
                All pricing models ({os === 'windows' ? 'Windows' : 'Linux'},{' '}
                {display === 'hourly' ? 'per hour' : `per ${hoursPerMonth}h month`})
              </td>
            </tr>

            {priceModeRows.map(({ mode, prices }) => (
              <tr key={mode.value} className={mode.value === priceMode ? 'bg-sky-50/60 dark:bg-sky-500/10' : undefined}>
                <td className={labelCellClass}>{mode.label}</td>
                {prices.map((price, index) => (
                  <td
                    key={`${mode.value}-${rows[index].spec.sku}`}
                    className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300"
                  >
                    {formatPrice(price?.hourly ?? null)}
                    {price?.estimated && <EstimateMarker mode={mode.value} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
