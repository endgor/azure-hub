import Link from 'next/link';
import { formatHourly, formatNumber } from '@/lib/vmPricing/pricing';
import { tableBody, tableClass, tableHeadCellCompact, tableHeadRow, tableShell } from '@/components/shared/tableStyles';

/** Trimmed row for the build-time default view; the full VmRow would bloat the page data. */
export interface VmStaticRow {
  sku: string;
  size: string;
  series: string;
  category: string;
  vcpus: number | null;
  memoryGB: number | null;
  tempDiskGB: number | null;
  gpuCount: number | null;
  architecture: string | null;
  hourly: number | null;
  estimated: boolean;
}

interface VmPricingStaticTableProps {
  rows: VmStaticRow[];
  caption: string;
  totalCount: number;
}

const headCell = `whitespace-nowrap ${tableHeadCellCompact}`;
const cell = 'whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300';

export default function VmPricingStaticTable({ rows, caption, totalCount }: VmPricingStaticTableProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {caption} — the {rows.length} cheapest of {totalCount.toLocaleString('en-US')} priced sizes. Change region,
        operating system or pricing model in the interactive table.
      </p>
      <div className={tableShell}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRow}>
              <th scope="col" className={headCell}>
                Size
              </th>
              <th scope="col" className={headCell}>
                Series
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                vCPU
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                RAM <span className="ml-1 font-normal normal-case">(GiB)</span>
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Temp disk <span className="ml-1 font-normal normal-case">(GiB)</span>
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                GPU
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Price / hour
              </th>
            </tr>
          </thead>
          <tbody className={tableBody}>
            {rows.map((row) => (
              <tr key={row.sku} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="whitespace-nowrap px-3 py-2">
                  <Link
                    href={`/tools/vm-pricing/${encodeURIComponent(row.sku)}/`}
                    className="font-medium text-sky-700 underline decoration-transparent transition hover:decoration-current dark:text-sky-300"
                  >
                    {row.size}
                  </Link>
                </td>
                <td className={cell}>{row.series}</td>
                <td className={`${cell} text-right`}>{formatNumber(row.vcpus)}</td>
                <td className={`${cell} text-right`}>{formatNumber(row.memoryGB)}</td>
                <td className={`${cell} text-right`}>{row.tempDiskGB ? formatNumber(row.tempDiskGB) : '—'}</td>
                <td className={`${cell} text-right`}>{row.gpuCount ? formatNumber(row.gpuCount) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                  {formatHourly(row.hourly, 'USD')}
                  {row.estimated && (
                    <span className="px-1 text-base leading-none text-amber-500 dark:text-amber-400">
                      *<span className="sr-only">Estimated rate</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
