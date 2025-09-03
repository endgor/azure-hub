import { useState, useRef, useEffect } from 'react';
import { AzureIpAddress } from '@/types/azure';

interface ExportDropdownProps {
  results: AzureIpAddress[];
  query: string;
  disabled?: boolean;
}

export default function ExportDropdown({ results, query, disabled = false }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (results.length === 0) return;
    
    // Dynamic import to reduce initial bundle size
    const { exportToCSV, exportToExcel, prepareDataForExport, generateFilename } = await import('@/lib/exportUtils');
    
    const exportData = prepareDataForExport(results);
    const filename = generateFilename(query, format);
    
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToExcel(exportData, filename);
    }
    
    setIsOpen(false);
  };

  if (disabled || results.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-full rounded-lg border border-google-gray-300 px-4 py-2 bg-white text-sm font-medium text-google-gray-700 hover:bg-google-gray-50 hover:shadow-google focus:outline-none focus:ring-2 focus:ring-google-blue-500 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-google-lg bg-white ring-1 ring-google-gray-200 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-4 py-2 text-xs text-google-gray-600 border-b border-google-gray-200">
              Export {results.length} record{results.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center w-full px-4 py-2 text-sm text-google-gray-700 hover:bg-google-blue-50 hover:text-google-blue-700 transition-colors"
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3 text-google-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export as CSV
              <span className="ml-auto text-xs text-google-gray-500">.csv</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="flex items-center w-full px-4 py-2 text-sm text-google-gray-700 hover:bg-google-blue-50 hover:text-google-blue-700 transition-colors"
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3 text-google-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as Excel
              <span className="ml-auto text-xs text-google-gray-500">.xlsx</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}