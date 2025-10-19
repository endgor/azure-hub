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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500/40 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border border-slate-800/70 bg-slate-900/90 shadow-xl shadow-slate-950/40 backdrop-blur">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="border-b border-slate-800/60 px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
              Export {results.length} record{results.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/60 hover:text-sky-200"
              role="menuitem"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export as CSV
              <span className="ml-auto text-xs text-slate-500">.csv</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/60 hover:text-sky-200"
              role="menuitem"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as Excel
              <span className="ml-auto text-xs text-slate-500">.xlsx</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
