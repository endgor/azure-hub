import { AzureIpAddress, AzureCloudName } from '@/types/azure';
import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Tooltip from './Tooltip';
import ExportMenu, { ExportOption } from './shared/ExportMenu';
import { buildUrlWithQuery } from '@/lib/queryUtils';
import { pluralize } from '@/lib/filenameUtils';
import { useClickOutside } from '@/hooks/useClickOutside';
import { getServiceTagPath } from '@/lib/serviceTagUrl';

interface PaginationButtonsProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  getPageUrl: (page: number) => string;
}

const PaginationButtons = memo(function PaginationButtons({
  currentPage,
  totalPages,
  onPageChange,
  getPageUrl
}: PaginationButtonsProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const maxVisible = 3;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 2) pages.push(-1);
    if (currentPage > 1 && currentPage < totalPages) {
      pages.push(currentPage);
    }
    if (currentPage < totalPages - 1) pages.push(-2);
    pages.push(totalPages);
  }

  return (
    <>
      {pages.map((page, index) => {
        if (page < 0) {
          return (
            <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">
              ...
            </span>
          );
        }

        const buttonClass = `rounded-lg px-3 py-1.5 text-xs transition ${
          currentPage === page
            ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-300'
            : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400'
        }`;

        return onPageChange ? (
          <button key={page} onClick={() => onPageChange(page)} className={buttonClass}>
            {page}
          </button>
        ) : (
          <Link key={page} href={getPageUrl(page)} className={buttonClass}>
            {page}
          </Link>
        );
      })}
    </>
  );
});

// Network features descriptions
const networkFeaturesInfo = (
  <div className="space-y-3 text-slate-600 dark:text-slate-300">
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
      These are Azure network features where this service tag can be used:
    </p>
    <p><strong>API</strong> - Application Programming Interface endpoints</p>
    <p><strong>NSG</strong> - Network security groups for controlling traffic</p>
    <p><strong>UDR</strong> - User defined routes for custom routing</p>
    <p><strong>FW</strong> - Azure Firewall service</p>
    <p><strong>VSE</strong> - Virtual service endpoints for secure Azure service access</p>
    <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      Service tags appear as selectable options when configuring network rules in Azure.
    </p>
  </div>
);

interface ResultsProps {
  results: AzureIpAddress[];
  query: string;
  total?: number;
  /** Hide the cloud filter dropdown (e.g., on service tag detail pages) */
  hideCloudFilter?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    isAll: boolean;
    onPageChange?: (page: number | 'all') => void;
    onPageSizeChange?: (size: number | 'all') => void;
    basePath?: string;
    query?: {
      ipOrDomain?: string;
      region?: string;
      service?: string;
    };
  };
}

type SortField = 'serviceTagId' | 'ipAddressPrefix' | 'region' | 'systemService' | 'networkFeatures' | 'cloud';
type SortDirection = 'asc' | 'desc';

/** Maps cloud enum to display label */
const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Gov',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

/** Maps cloud enum to badge styling */
const CLOUD_STYLES: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  [AzureCloudName.AzureUSGovernment]: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  [AzureCloudName.AzureChinaCloud]: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
};

/** Cloud filter options */
type CloudFilter = 'all' | AzureCloudName;

const CLOUD_FILTER_OPTIONS: { value: CloudFilter; label: string }[] = [
  { value: 'all', label: 'All Clouds' },
  { value: AzureCloudName.AzureCloud, label: 'Public' },
  { value: AzureCloudName.AzureUSGovernment, label: 'Government' },
  { value: AzureCloudName.AzureChinaCloud, label: 'China' }
];

const Results = memo(function Results({ results, query, total, hideCloudFilter, pagination }: ResultsProps) {
  const [sortField, setSortField] = useState<SortField>('serviceTagId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all');
  const [isCloudFilterOpen, setIsCloudFilterOpen] = useState(false);
  const cloudFilterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useClickOutside(cloudFilterRef as React.RefObject<HTMLElement>, () => setIsCloudFilterOpen(false), isCloudFilterOpen);

  // Show total available results
  const totalDisplay = total || results.length;

  const pageSizeOptions = [10, 20, 50, 100, 200, 'all'] as const;

  // Helper to build URL for pagination (for URL-based navigation)
  const getPageUrl = useCallback((page: number) => {
    if (!pagination?.basePath) return '#';
    return buildUrlWithQuery(pagination.basePath, {
      ipOrDomain: pagination.query?.ipOrDomain,
      region: pagination.query?.region,
      service: pagination.query?.service,
      page
    });
  }, [pagination?.basePath, pagination?.query]);

  const getAllUrl = useCallback(() => {
    if (!pagination?.basePath) return '#';
    return buildUrlWithQuery(pagination.basePath, {
      ipOrDomain: pagination.query?.ipOrDomain,
      region: pagination.query?.region,
      service: pagination.query?.service,
      pageSize: 'all'
    });
  }, [pagination?.basePath, pagination?.query]);

  // Handle service tag click - memoized to prevent re-renders
  const handleServiceTagClick = useCallback((serviceTagId: string) => {
    router.push(getServiceTagPath(serviceTagId));
  }, [router]);
  
  // Handle column sort - memoized to prevent re-renders
  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(field === sortField && sortDirection === 'asc' ? 'desc' : 'asc');
  }, [sortField, sortDirection]);
  
  // Filter and sort the results - memoized to avoid unnecessary computations
  const filteredAndSortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    // First filter by cloud
    let filtered = results;
    if (cloudFilter !== 'all') {
      filtered = results.filter(r => r.cloud === cloudFilter);
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      const fieldA = a[sortField] || '';
      const fieldB = b[sortField] || '';
      const comparison = fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, sortField, sortDirection, cloudFilter]);

  // For display purposes
  const sortedResults = filteredAndSortedResults;

  // Export options configuration
  const exportOptions = useMemo<ExportOption[]>(() => [
    {
      label: 'CSV',
      format: 'csv',
      extension: '.csv',
      onClick: async () => {
        const { exportToCSV, prepareDataForExport, generateFilename } = await import('@/lib/exportUtils');
        const exportData = prepareDataForExport(sortedResults);
        const filename = generateFilename(query, 'csv');
        await exportToCSV(exportData, filename);
      }
    },
    {
      label: 'Excel',
      format: 'xlsx',
      extension: '.xlsx',
      onClick: async () => {
        const { exportToExcel, prepareDataForExport, generateFilename } = await import('@/lib/exportUtils');
        const exportData = prepareDataForExport(sortedResults);
        const filename = generateFilename(query, 'xlsx');
        await exportToExcel(exportData, filename);
      }
    },
    {
      label: 'Markdown',
      format: 'md',
      extension: '.md',
      onClick: async () => {
        const { exportToMarkdown, prepareDataForExport, generateFilename } = await import('@/lib/exportUtils');
        const exportData = prepareDataForExport(sortedResults);
        const filename = generateFilename(query, 'md');
        exportToMarkdown(exportData, filename);
      }
    }
  ], [sortedResults, query]);

  // Early return after hooks
  if (!results || results.length === 0) return null;
  
  // Helper to render the sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (field !== sortField) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };
  
  return (
    <section
      className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      aria-label="Search Results"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-6 md:py-5 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 md:text-xl">Results for {query}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 md:text-sm">
              {cloudFilter === 'all' ? (
                <>Found {totalDisplay} matching Azure IP {pluralize(totalDisplay, 'range')}</>
              ) : (
                <>Showing {sortedResults.length} of {totalDisplay} {pluralize(totalDisplay, 'range')} ({CLOUD_FILTER_OPTIONS.find(o => o.value === cloudFilter)?.label})</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!hideCloudFilter && (
              <div className="relative inline-block text-left" ref={cloudFilterRef}>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500"
                  onClick={() => setIsCloudFilterOpen(!isCloudFilterOpen)}
                  aria-expanded={isCloudFilterOpen}
                  aria-haspopup="true"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  {CLOUD_FILTER_OPTIONS.find(o => o.value === cloudFilter)?.label}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCloudFilterOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>

                {isCloudFilterOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {CLOUD_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setCloudFilter(option.value);
                            setIsCloudFilterOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                            cloudFilter === option.value
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400'
                              : 'text-slate-700 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-sky-900/20 dark:hover:text-sky-400'
                          }`}
                          role="menuitem"
                        >
                          {cloudFilter === option.value && (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span className={cloudFilter === option.value ? '' : 'ml-7'}>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <ExportMenu
              options={exportOptions}
              itemCount={sortedResults.length}
              itemLabel="record"
            />
          </div>
        </div>

        {/* Integrated pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 md:gap-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Showing{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {pagination.isAll ? 1 : (pagination.currentPage - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {pagination.isAll ? pagination.totalItems : Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.totalItems}</span>
              </div>
              {pagination.onPageSizeChange && (
                <div className="flex items-center gap-2">
                  <label htmlFor="pageSize-header" className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Items
                  </label>
                  <select
                    id="pageSize-header"
                    value={pagination.isAll ? 'all' : pagination.pageSize}
                    onChange={(e) => {
                      const value = e.target.value;
                      pagination.onPageSizeChange?.(value === 'all' ? 'all' : parseInt(value, 10));
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'all' ? 'All' : option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Mobile: Arrow navigation */}
            <div className="flex items-center gap-1 md:hidden">
              {!pagination.isAll && pagination.currentPage > 1 && (
                pagination.onPageChange ? (
                  <button
                    onClick={() => pagination.onPageChange?.(pagination.currentPage - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    ←
                  </button>
                ) : (
                  <Link
                    href={getPageUrl(pagination.currentPage - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    ←
                  </Link>
                )
              )}

              {!pagination.isAll && pagination.currentPage < pagination.totalPages && (
                pagination.onPageChange ? (
                  <button
                    onClick={() => pagination.onPageChange?.(pagination.currentPage + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    →
                  </button>
                ) : (
                  <Link
                    href={getPageUrl(pagination.currentPage + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    →
                  </Link>
                )
              )}
            </div>

            {/* Desktop: Full pagination controls */}
            <div className="hidden md:flex md:items-center md:gap-1">
              {!pagination.isAll && pagination.currentPage > 1 && (
                pagination.onPageChange ? (
                  <button
                    onClick={() => pagination.onPageChange?.(pagination.currentPage - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400"
                  >
                    Previous
                  </button>
                ) : (
                  <Link
                    href={getPageUrl(pagination.currentPage - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400"
                  >
                    Previous
                  </Link>
                )
              )}

              {!pagination.isAll && (
                <PaginationButtons
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.onPageChange}
                  getPageUrl={getPageUrl}
                />
              )}

              {pagination.onPageChange ? (
                <button
                  onClick={() => pagination.onPageChange?.('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    pagination.isAll
                      ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-300'
                      : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400'
                  }`}
                >
                  All
                </button>
              ) : (
                <Link
                  href={getAllUrl()}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    pagination.isAll
                      ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-300'
                      : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400'
                  }`}
                >
                  All
                </Link>
              )}

              {!pagination.isAll && pagination.currentPage < pagination.totalPages && (
                pagination.onPageChange ? (
                  <button
                    onClick={() => pagination.onPageChange?.(pagination.currentPage + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400"
                  >
                    Next
                  </button>
                ) : (
                  <Link
                    href={getPageUrl(pagination.currentPage + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400"
                  >
                    Next
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <div className="w-full overflow-x-auto">
        <table className="relative w-full min-w-[800px] table-auto divide-y divide-slate-200 dark:divide-slate-700" aria-label="Azure IP Ranges">
          <thead className="bg-slate-100 dark:bg-slate-900/60">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th
                className="w-[8%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('cloud')}
              >
                Cloud {renderSortIndicator('cloud')}
              </th>
              <th
                className="w-[18%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('serviceTagId')}
              >
                Service Tag {renderSortIndicator('serviceTagId')}
              </th>
              <th
                className="w-[20%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('ipAddressPrefix')}
              >
                IP Range {renderSortIndicator('ipAddressPrefix')}
              </th>
              <th
                className="w-[15%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('region')}
              >
                Region {renderSortIndicator('region')}
              </th>
              <th
                className="w-[20%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('systemService')}
              >
                System Service {renderSortIndicator('systemService')}
              </th>
              <th
                className="relative w-[25%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => handleSort('networkFeatures')}
              >
                <div className="flex items-center gap-2">
                  <span>Network features {renderSortIndicator('networkFeatures')}</span>
                  <Tooltip content={networkFeaturesInfo}>
                    <span className="cursor-help text-slate-400 transition hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 17h.01M12 10a2 2 0 00-2 2v1a1 1 0 002 0v-.5c0-.28.22-.5.5-.5.83 0 1.5-.67 1.5-1.5A2.5 2.5 0 0010 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </span>
                  </Tooltip>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedResults.map((result, index) => (
              <tr
                key={`${result.serviceTagId}-${result.ipAddressPrefix}-${index}`}
                className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900/70'}
              >
                <td className="px-5 py-4 text-sm">
                  {result.cloud && (
                    <span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${CLOUD_STYLES[result.cloud]}`}>
                      {CLOUD_LABELS[result.cloud]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <button
                    onClick={() => handleServiceTagClick(result.serviceTagId)}
                    className="rounded-md border border-transparent px-2 py-1 text-left text-sky-600 transition hover:border-sky-200 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-300 dark:hover:border-sky-800 dark:hover:bg-sky-900/20 dark:hover:text-sky-200"
                    title={`View details for ${result.serviceTagId}`}
                  >
                    {result.serviceTagId}
                  </button>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-slate-900 dark:text-slate-100">
                  <div className="space-y-2">
                    <div>{result.ipAddressPrefix}</div>
                    {result.resolvedFrom && result.resolvedIp && (
                      <div className="space-y-1">
                        <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                          DNS: {result.resolvedFrom} → {result.resolvedIp}
                        </span>
                      </div>
                    )}
                    {result.ipAddress && result.ipAddress !== result.ipAddressPrefix && !result.resolvedFrom && (
                      <span className="inline-block rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
                        {result.ipAddressPrefix.includes('/') ? 'Contains IP' : 'Matches'}: {result.ipAddress}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{result.region || '-'}</td>
                <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{result.systemService || '-'}</td>
                <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{result.networkFeatures || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export default Results;
