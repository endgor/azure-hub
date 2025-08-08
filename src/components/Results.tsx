import { AzureIpAddress } from '@/types/azure';
import { useState, useMemo } from 'react';
import Tooltip from './Tooltip';
import ExportDropdown from './ExportDropdown';

// Network features descriptions
const networkFeaturesInfo = (
  <div className="space-y-3 normal-case">
    <p className="font-medium">These are Azure network features where this service tag can be used:</p>
    <p><strong>API</strong> - Application Programming Interface endpoints</p>
    <p><strong>NSG</strong> - Network security groups for controlling traffic</p>
    <p><strong>UDR</strong> - User defined routes for custom routing</p>
    <p><strong>FW</strong> - Azure Firewall service</p>
    <p><strong>VSE</strong> - Virtual service endpoints for secure Azure service access</p>
    <p className="text-xs mt-2 pt-2 border-t border-gray-600">Service tags appear as selectable options in dropdown menus when configuring network rules in Azure</p>
  </div>
);

interface ResultsProps {
  results: AzureIpAddress[];
  query: string;
  total?: number;
}

type SortField = 'serviceTagId' | 'ipAddressPrefix' | 'region' | 'systemService' | 'networkFeatures';
type SortDirection = 'asc' | 'desc';

export default function Results({ results, query, total }: ResultsProps) {
  const [sortField, setSortField] = useState<SortField>('serviceTagId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Show total available results
  const totalDisplay = total || results.length;
  
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
    <section className="bg-white rounded-lg shadow-md overflow-hidden mb-6" aria-label="Search Results">
      <header className="bg-blue-50 px-4 py-3 border-b border-blue-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-blue-800">
              Results for {query}
            </h2>
            <p className="text-sm text-blue-600">
              Found {totalDisplay} matching Azure IP {totalDisplay === 1 ? 'range' : 'ranges'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ExportDropdown results={sortedResults} query={query} />
          </div>
        </div>
      </header>
      
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200 table-fixed relative" aria-label="Azure IP Ranges">
          <thead className="bg-gray-50 relative">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[25%]"
                onClick={() => handleSort('serviceTagId')}
              >
                Service Tag {renderSortIndicator('serviceTagId')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[23%]"
                onClick={() => handleSort('ipAddressPrefix')}
              >
                IP Range {renderSortIndicator('ipAddressPrefix')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[13%]"
                onClick={() => handleSort('region')}
              >
                Region {renderSortIndicator('region')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[17%]"
                onClick={() => handleSort('systemService')}
              >
                System Service {renderSortIndicator('systemService')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[22%] relative"
                onClick={() => handleSort('networkFeatures')}
              >
                <div className="flex items-center gap-1">
                  <span>Network features {renderSortIndicator('networkFeatures')}</span>
                  <Tooltip content={networkFeaturesInfo}>
                    <span className="text-gray-400 hover:text-gray-600 cursor-help">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </Tooltip>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((result, index) => (
              <tr key={`${result.serviceTagId}-${result.ipAddressPrefix}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-blue-600 break-words">
                  {result.serviceTagId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
                  {result.ipAddressPrefix}
                  {result.ipAddress && result.ipAddress !== result.ipAddressPrefix && (
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 inline-block mt-1">
                      {result.ipAddressPrefix.includes('/') ? 'Contains IP' : 'Matches'}: {result.ipAddress}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
                  {result.region || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
                  {result.systemService || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
                  {result.networkFeatures || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
