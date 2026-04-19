import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import SearchInput from '@/components/shared/SearchInput';
import ExportMenu from '@/components/shared/ExportMenu';
import type { ExportOption } from '@/components/shared/ExportMenu';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { exportToCSV, exportToExcel, exportToMarkdown, type ExportRow } from '@/lib/exportUtils';
import { getDateTimestamp } from '@/lib/filenameUtils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';

interface DnsZoneEntry {
  resourceType: string;
  armType: string;
  subresources: string[];
  dnsZoneNames: string[];
  publicDnsForwarders: string[];
  category: string;
  cloud: 'Commercial' | 'Government' | 'China';
}

interface DnsZonesData {
  lastUpdated: string;
  sourceUrl: string;
  entries: DnsZoneEntry[];
}

type CloudFilter = 'all' | 'Commercial' | 'Government' | 'China';
type CategoryFilter = 'all' | string;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`ml-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition ${
        copied
          ? 'text-emerald-500 dark:text-emerald-400'
          : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
      }`}
      title="Copy to clipboard"
      aria-label={`Copy ${text}`}
    >
      {copied ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function PrivateDnsZones() {
  const [data, setData] = useState<DnsZonesData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setDataError(null);
        const response = await fetch('/data/private-dns-zones.json');
        if (!response.ok) {
          throw new Error(`Failed to load DNS zones: ${response.status}`);
        }

        const payload = await response.json() as DnsZonesData;
        if (!cancelled) {
          setData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : 'Failed to load DNS zones data.');
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const entries = data?.entries || [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const entry of entries) {
      if (cloudFilter === 'all' || entry.cloud === cloudFilter) {
        cats.add(entry.category);
      }
    }
    return Array.from(cats).sort();
  }, [entries, cloudFilter]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !categories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categories, categoryFilter]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (cloudFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.cloud === cloudFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      filtered = filterAndSortByQuery(filtered, searchTerm, (entry) =>
        [entry.resourceType, entry.armType, ...entry.subresources, ...entry.dnsZoneNames].join(' ')
      );
    }

    return filtered;
  }, [entries, searchTerm, cloudFilter, categoryFilter]);

  useEffect(() => {
    setExpandedRow(null);
  }, [searchTerm, cloudFilter, categoryFilter]);

  const prepareExportData = useCallback((): ExportRow[] => {
    return filteredEntries.map((entry) => ({
      'Resource Type': entry.resourceType,
      'ARM Type': entry.armType,
      'Subresource': entry.subresources.join(', '),
      'DNS Zone Names': entry.dnsZoneNames.join(', '),
      'Public DNS Forwarders': entry.publicDnsForwarders.join(', '),
      'Category': entry.category,
      'Cloud': entry.cloud,
    }));
  }, [filteredEntries]);

  const exportOptions: ExportOption[] = useMemo(
    () => [
      {
        label: 'Export as CSV',
        format: 'csv',
        extension: '.csv',
        onClick: async () => {
          setIsExporting(true);
          try {
            await exportToCSV(prepareExportData(), `private-dns-zones_${getDateTimestamp()}.csv`);
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        label: 'Export as Excel',
        format: 'xlsx',
        extension: '.xlsx',
        onClick: async () => {
          setIsExporting(true);
          try {
            await exportToExcel(prepareExportData(), `private-dns-zones_${getDateTimestamp()}.xlsx`, 'DNS Zones');
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        label: 'Export as Markdown',
        format: 'md',
        extension: '.md',
        onClick: async () => {
          setIsExporting(true);
          try {
            exportToMarkdown(prepareExportData(), `private-dns-zones_${getDateTimestamp()}.md`);
          } finally {
            setIsExporting(false);
          }
        },
      },
    ],
    [prepareExportData]
  );

  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {};
    for (const entry of filteredEntries) {
      const key = entry.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries]);

  return (
    <Layout
      title="Azure Private Endpoint DNS Zones - Quick Reference"
      description="Look up which private DNS zones are needed for Azure Private Endpoints. Covers all Azure services across Commercial, Government, and China clouds."
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'Private DNS Zones', url: 'https://azurehub.org/tools/private-dns-zones/' },
      ]}
      toolSchema={{
        name: 'Azure Private DNS Zone Lookup',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' },
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">
            Networking
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            Private Endpoint DNS Zones
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Quick reference for which private DNS zones to configure when setting up Azure Private Endpoints.
            {' '}
            <Link
              href="/guides/networking/private-endpoint-dns-setup/"
              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline decoration-dotted underline-offset-2"
            >
              Read the setup guide
            </Link>
            {' '}for hybrid and cloud-only DNS configuration.
          </p>
        </div>

        {dataError ? (
          <ErrorBox title="DNS zone data unavailable">{dataError}</ErrorBox>
        ) : !data ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <LoadingSpinner label="Loading private DNS zone catalogue..." />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <SearchInput
                  placeholder="Search services or DNS zones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxWidth="sm"
                />
                <ExportMenu
                  options={exportOptions}
                  itemCount={filteredEntries.length}
                  itemLabel="zone"
                  isExporting={isExporting}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: 'all' as CloudFilter, label: 'All clouds' },
                    { value: 'Commercial' as CloudFilter, label: 'Public' },
                    { value: 'Government' as CloudFilter, label: 'Government' },
                    { value: 'China' as CloudFilter, label: 'China' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCloudFilter(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      cloudFilter === option.value
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {categories.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  All categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      categoryFilter === cat
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="text-sm text-slate-600 dark:text-slate-300">
              Showing{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredEntries.length}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{entries.length}</span> entries
              {searchTerm && (
                <span className="ml-2 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
                  Match: &ldquo;{searchTerm}&rdquo;
                </span>
              )}
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                Updated {data.lastUpdated}
              </span>
            </div>

            {filteredEntries.length > 0 ? (
              <div className="space-y-8">
                {groupedEntries.map(([category, categoryEntries]) => (
                  <div key={category} className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {category}
                      <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">({categoryEntries.length})</span>
                    </h2>
                    <div className="overflow-x-auto rounded-xl bg-white dark:bg-slate-900">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            <th className="px-4 py-3 font-medium">Service</th>
                            <th className="px-4 py-3 font-medium">Subresource</th>
                            <th className="px-4 py-3 font-medium">Private DNS Zone</th>
                            <th className="hidden px-4 py-3 font-medium lg:table-cell">Public Forwarders</th>
                            {cloudFilter === 'all' && <th className="px-4 py-3 font-medium">Cloud</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          {categoryEntries.map((entry, idx) => {
                            const globalIdx = filteredEntries.indexOf(entry);
                            const isExpanded = expandedRow === globalIdx;

                            return (
                              <tr
                                key={`${entry.armType}-${entry.subresources.join('-')}-${entry.cloud}-${idx}`}
                                className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50 lg:cursor-default"
                                onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900 dark:text-slate-100">
                                    {entry.resourceType}
                                  </div>
                                  <div className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                    {entry.armType}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {entry.subresources.map((sub) => (
                                      <code
                                        key={sub}
                                        className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      >
                                        {sub}
                                      </code>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    {entry.dnsZoneNames.map((zone) => (
                                      <div key={zone} className="flex items-center">
                                        <code className="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                                          {zone}
                                        </code>
                                        <CopyButton text={zone} />
                                      </div>
                                    ))}
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-2 lg:hidden">
                                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                        Public Forwarders
                                      </div>
                                      <div className="mt-1 flex flex-col gap-1">
                                        {entry.publicDnsForwarders.map((fwd) => (
                                          <code key={fwd} className="text-xs text-slate-500 dark:text-slate-400">
                                            {fwd}
                                          </code>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="hidden px-4 py-3 lg:table-cell">
                                  <div className="flex flex-col gap-1">
                                    {entry.publicDnsForwarders.map((fwd) => (
                                      <code key={fwd} className="text-xs text-slate-500 dark:text-slate-400">
                                        {fwd}
                                      </code>
                                    ))}
                                  </div>
                                </td>
                                {cloudFilter === 'all' && (
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                        entry.cloud === 'Commercial'
                                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                                          : entry.cloud === 'Government'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                      }`}
                                    >
                                      {entry.cloud === 'Commercial' ? 'Public' : entry.cloud}
                                    </span>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                <span>No DNS zones found matching &ldquo;{searchTerm}&rdquo;.</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="underline decoration-dotted text-amber-700 transition hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                No DNS zone entries available.
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
