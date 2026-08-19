import { useMemo } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import { formatHourly, formatMonthly, formatNumber, formatPercent } from '@/lib/vmPricing/pricing';
import type { VmRow, VmSortDirection, VmSortKey } from '@/hooks/vmPricing/useVmFilters';
import type { VmCurrency, VmPriceMode } from '@/types/vmPricing';
import type { VmPriceDisplay } from './VmPricingControls';

interface Column {
  key: VmSortKey | null;
  label: string;
  align: 'left' | 'right';
  hint?: string;
}

interface VmPricingTableProps {
  rows: VmRow[];
  currency: VmCurrency;
  priceMode: VmPriceMode;
  display: VmPriceDisplay;
  hoursPerMonth: number;
  currencyRate: number;
  sortKey: VmSortKey;
  sortDirection: VmSortDirection;
  onSort: (key: VmSortKey) => void;
  selectedSkus: string[];
  onToggleSelect: (sku: string) => void;
  visibleCount: number;
  onShowMore: () => void;
}

const ESTIMATE_NOTE = (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Estimated rate</p>
    <p>
      Azure sells reservations per instance without an OS licence, so it publishes no Windows reserved price. This is
      the Linux commitment rate plus the Windows pay-as-you-go surcharge.
    </p>
  </div>
);

const SPECS_UNAVAILABLE_NOTE = (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Specifications unavailable</p>
    <p>
      Azure publishes a price for this size but does not list it in the resource SKU catalogue, so vCPU and memory are
      unknown. Usually a retired, promotional or preview size.
    </p>
  </div>
);

function SortIndicator({ active, direction }: { active: boolean; direction: VmSortDirection }) {
  if (!active) {
    return (
      <svg className="h-3 w-3 opacity-30" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 2l3 3H3zM6 10L3 7h6z" />
      </svg>
    );
  }

  return (
    <svg className="h-3 w-3 text-sky-600 dark:text-sky-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      {direction === 'asc' ? <path d="M6 3l4 5H2z" /> : <path d="M6 9L2 4h8z" />}
    </svg>
  );
}

export default function VmPricingTable({
  rows,
  currency,
  priceMode,
  display,
  hoursPerMonth,
  currencyRate,
  sortKey,
  sortDirection,
  onSort,
  selectedSkus,
  onToggleSelect,
  visibleCount,
  onShowMore
}: VmPricingTableProps) {
  const columns = useMemo<Column[]>(
    () => [
      { key: 'sku', label: 'Size', align: 'left' },
      { key: 'series', label: 'Series', align: 'left' },
      { key: 'vcpus', label: 'vCPU', align: 'right' },
      { key: 'memory', label: 'RAM', align: 'right', hint: 'GiB' },
      { key: null, label: 'Temp disk', align: 'right', hint: 'GiB' },
      { key: null, label: 'GPU', align: 'right' },
      {
        key: 'price',
        label: display === 'hourly' ? 'Price / hour' : 'Price / month',
        align: 'right',
        hint: display === 'monthly' ? `${hoursPerMonth}h` : undefined
      },
      { key: 'savings', label: 'vs PAYG', align: 'right' },
      { key: 'pricePerVcpu', label: 'Per vCPU', align: 'right' },
      { key: 'pricePerGB', label: 'Per GiB', align: 'right' }
    ],
    [display, hoursPerMonth]
  );

  const visibleRows = rows.slice(0, visibleCount);
  const selected = new Set(selectedSkus);
  const showSavings = priceMode !== 'payg';

  const formatPrice = (value: number | null): string =>
    display === 'hourly'
      ? formatHourly(value, currency, currencyRate)
      : formatMonthly(value, currency, hoursPerMonth, currencyRate);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
        No VM sizes match the current filters. Try widening the vCPU or memory range, or clearing the capability filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <span className="sr-only">Compare</span>
              </th>
              {columns.map((column) => {
                if (column.label === 'vs PAYG' && !showSavings) return null;

                return (
                  <th
                    key={column.label}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    aria-sort={
                      column.key && sortKey === column.key
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.key ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key as VmSortKey)}
                        className={`inline-flex items-center gap-1.5 transition hover:text-slate-900 dark:hover:text-slate-100 ${
                          column.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <SortIndicator active={sortKey === column.key} direction={sortDirection} />
                        <span>
                          {column.label}
                          {column.hint && <span className="ml-1 font-normal normal-case">({column.hint})</span>}
                        </span>
                      </button>
                    ) : (
                      <span>
                        {column.label}
                        {column.hint && <span className="ml-1 font-normal normal-case">({column.hint})</span>}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {visibleRows.map((row) => {
              const { spec } = row;
              const vcpus = spec.vcpusAvailable ?? spec.vcpus;
              const isSelected = selected.has(spec.sku);

              return (
                <tr
                  key={spec.sku}
                  className={`transition ${
                    isSelected ? 'bg-sky-50 dark:bg-sky-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(spec.sku)}
                      aria-label={`Compare ${spec.sku}`}
                      className="h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-sky-500/30 dark:border-slate-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/tools/vm-pricing/${spec.sku}/`}
                      className="font-medium text-sky-700 underline decoration-transparent transition hover:decoration-current dark:text-sky-300"
                    >
                      {spec.size}
                    </Link>
                    {spec.vcpusAvailable !== null && spec.vcpus !== null && spec.vcpusAvailable < spec.vcpus && (
                      <span className="ml-1.5 align-middle">
                        <Tooltip
                          widthClass="w-64"
                          content={
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Constrained cores
                              </p>
                              <p>
                                Runs on {spec.vcpus}-vCPU hardware with only {spec.vcpusAvailable} active, keeping the
                                full memory and disk throughput while cutting per-core licence costs.
                              </p>
                            </div>
                          }
                        >
                          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                            constrained
                          </span>
                        </Tooltip>
                      </span>
                    )}
                    {spec.specSource === 'unknown' && (
                      <span className="ml-1.5 align-middle">
                        <Tooltip content={SPECS_UNAVAILABLE_NOTE} widthClass="w-64">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            specs n/a
                          </span>
                        </Tooltip>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{spec.series}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {formatNumber(vcpus)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {formatNumber(spec.memoryGB)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {spec.tempDiskGB ? formatNumber(spec.tempDiskGB) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {spec.gpuCount ? formatNumber(spec.gpuCount) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center justify-end gap-0.5">
                      {formatPrice(row.hourly)}
                      {row.estimated && (
                        <Tooltip content={ESTIMATE_NOTE} widthClass="w-64">
                          <span className="px-1 text-base leading-none text-amber-500 dark:text-amber-400">
                            *<span className="sr-only">Estimated rate</span>
                          </span>
                        </Tooltip>
                      )}
                    </span>
                  </td>
                  {showSavings && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {row.savings === null ? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      ) : (
                        <span
                          className={
                            row.savings > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {row.savings > 0 ? `−${formatPercent(row.savings)}` : formatPercent(row.savings)}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                    {formatPrice(row.pricePerVcpu)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                    {formatPrice(row.pricePerGB)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleCount < rows.length && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={onShowMore}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Show more
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {visibleCount.toLocaleString()} of {rows.length.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
