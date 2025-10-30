import { AzureIpAddress } from '@/types/azure';
import { useState, useMemo, memo } from 'react';
import { useRouter } from 'next/router';
import Tooltip from './Tooltip';
import ExportDropdown from './ExportDropdown';

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
}

type SortField = 'serviceTagId' | 'ipAddressPrefix' | 'region' | 'systemService' | 'networkFeatures';
type SortDirection = 'asc' | 'desc';

const Results = memo(function Results({ results, query, total }: ResultsProps) {
  const [sortField, setSortField] = useState<SortField>('serviceTagId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const router = useRouter();
  
  // Show total available results
  const totalDisplay = total || results.length;
  
  // Handle service tag click
  const handleServiceTagClick = (serviceTagId: string) => {
    router.push(`/tools/service-tags/${encodeURIComponent(serviceTagId)}`);
  };
  
  // Handle column sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Sort the results - memoized to avoid unnecessary computations
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    return [...results].sort((a, b) => {
      const fieldA = a[sortField] || '';
      const fieldB = b[sortField] || '';
      
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortDirection]);
  
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
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 md:text-xl">Results for {query}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 md:text-sm">
            Found {totalDisplay} matching Azure IP {totalDisplay === 1 ? 'range' : 'ranges'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ExportDropdown results={sortedResults} query={query} />
        </div>
      </header>

      <div className="w-full overflow-x-auto">
        <table className="relative w-full min-w-[800px] table-auto divide-y divide-slate-200 dark:divide-slate-700" aria-label="Azure IP Ranges">
          <thead className="bg-slate-100 dark:bg-slate-900/60">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th
                className="w-[20%] px-5 py-4 font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-800"
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
                  {result.ipAddressPrefix}
                  {result.ipAddress && result.ipAddress !== result.ipAddressPrefix && (
                    <span className="mt-2 inline-block rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
                      {result.ipAddressPrefix.includes('/') ? 'Contains IP' : 'Matches'}: {result.ipAddress}
                    </span>
                  )}
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
