import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { AzureIpAddress } from '@/types/azure';
import { AzureCloudName } from '@/types/azure';
import { getServiceTagPath } from '@/lib/serviceTagUrl';
import { prepareDataForExport, exportToCSV, exportToExcel, exportToMarkdown, generateFilename } from '@/lib/exportUtils';

interface IpLookupResultsProps {
  results: AzureIpAddress[];
  query: string;
}

const CLOUD_LABELS: Record<string, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Government',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

function findPrimaryResult(results: AzureIpAddress[]): { primary: AzureIpAddress; additional: AzureIpAddress[] } {
  if (results.length === 0) {
    return { primary: results[0], additional: [] };
  }

  // Score each result: prefer results with a region and a more specific (longer prefix) CIDR
  const scored = results.map((r, idx) => {
    let score = 0;
    // Has a region — more specific
    if (r.region && r.region !== '') score += 100;
    // Has a system service name — more specific
    if (r.systemService && r.systemService !== '') score += 50;
    // Longer prefix = more specific network
    const prefixMatch = r.ipAddressPrefix.match(/\/(\d+)$/);
    if (prefixMatch) score += parseInt(prefixMatch[1], 10);
    return { result: r, score, idx };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  const primary = scored[0].result;
  const additional = scored.slice(1).map(s => s.result);

  return { primary, additional };
}

export default function IpLookupResults({ results, query }: IpLookupResultsProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const { primary, additional } = findPrimaryResult(results);

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'md') => {
    const data = prepareDataForExport(results);
    const filename = generateFilename(query, format);
    if (format === 'csv') await exportToCSV(data, filename);
    else if (format === 'xlsx') await exportToExcel(data, filename);
    else exportToMarkdown(data, filename);
    setExportOpen(false);
  }, [results, query]);

  const handleCopy = useCallback(async () => {
    const lines = results.map(r =>
      `${r.serviceTagId}\t${r.ipAddressPrefix}\t${r.region || '-'}\t${r.systemService || '-'}\t${r.networkFeatures || '-'}\t${CLOUD_LABELS[r.cloud || ''] || r.cloud || '-'}`
    );
    const header = 'Service Tag\tIP Range\tRegion\tSystem Service\tNetwork Features\tCloud';
    await navigator.clipboard.writeText([header, ...lines].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [results]);

  if (!primary) return null;

  return (
    <div className="space-y-6">
      {/* Primary Result Card */}
      <div className="rounded-xl bg-white p-6 dark:bg-slate-900">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Primary Result
            </span>
            {additional.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                +{additional.length} more below
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Export results"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <button onClick={() => handleExport('csv')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                      <span className="text-slate-400">CSV</span> Comma separated
                    </button>
                    <button onClick={() => handleExport('xlsx')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                      <span className="text-slate-400">XLSX</span> Excel spreadsheet
                    </button>
                    <button onClick={() => handleExport('md')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                      <span className="text-slate-400">MD</span> Markdown table
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={copied ? 'Copied!' : 'Copy results'}
            >
              {copied ? (
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* IP Address */}
        <h2 className="mb-5 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100">
          {primary.resolvedIp || primary.ipAddress || query}
        </h2>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">CIDR Range</p>
            <p className="mt-0.5 font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{primary.ipAddressPrefix}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Service Tag</p>
            <p className="mt-0.5 text-sm font-medium">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-500" />
              <Link href={getServiceTagPath(primary.serviceTagId)} className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                {primary.serviceTagId}
              </Link>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Region</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{primary.region || '-'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Cloud</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{CLOUD_LABELS[primary.cloud || ''] || primary.cloud || '-'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Network Features</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{primary.networkFeatures || '-'}</p>
          </div>
        </div>

        {/* DNS resolution info */}
        {primary.resolvedFrom && primary.resolvedIp && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Resolved from <span className="font-mono">{primary.resolvedFrom}</span> → <span className="font-mono">{primary.resolvedIp}</span>
          </p>
        )}
      </div>

      {/* Additional Matches */}
      {additional.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {additional.length} Additional {additional.length === 1 ? 'Match' : 'Matches'}
          </h3>
          <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Service Tag</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">IP Range</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Region</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {additional.map((r, i) => (
                  <tr key={`${r.serviceTagId}-${r.ipAddressPrefix}-${i}`}>
                    <td className="px-5 py-3">
                      <Link href={getServiceTagPath(r.serviceTagId)} className="text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                        {r.serviceTagId}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">{r.ipAddressPrefix}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{r.region || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{r.networkFeatures || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
