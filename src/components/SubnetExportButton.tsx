import { useEffect, useRef, useState } from 'react';
import type { LeafSubnet } from '@/lib/subnetCalculator';

interface SubnetExportButtonProps {
  leaves: LeafSubnet[];
  useAzureReservations: boolean;
  baseNetwork: number;
  basePrefix: number;
  rowColors: Record<string, string>;
  disabled?: boolean;
}

export default function SubnetExportButton({
  leaves,
  useAzureReservations,
  baseNetwork,
  basePrefix,
  rowColors,
  disabled = false
}: SubnetExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
    if (disabled || isExporting || leaves.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      const [{ prepareSubnetExportData, generateSubnetExportFilename }, { exportToCSV, exportToExcel }] = await Promise.all([
        import('@/lib/subnetExportUtils'),
        import('@/lib/exportUtils')
      ]);

      const exportData = prepareSubnetExportData(leaves, useAzureReservations);
      if (exportData.length === 0) {
        return;
      }

      const filename = generateSubnetExportFilename(baseNetwork, basePrefix, useAzureReservations, format);
      const rowFills = leaves.map((leaf) => rowColors[leaf.id] ?? null);

      if (format === 'csv') {
        exportToCSV(exportData, filename);
      } else {
        exportToExcel(exportData, filename, 'Subnet Plan', { rowFills });
      }
    } catch (error) {
      console.error('Failed to export subnet plan', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  if (disabled || leaves.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[0_6px_18px_-15px_rgba(15,23,42,0.55)] transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={isExporting}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className="h-4 w-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="border-b border-slate-200 px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
              Export {leaves.length} subnet{leaves.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
              role="menuitem"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export as CSV
              <span className="ml-auto text-xs text-slate-400">.csv</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
              role="menuitem"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as Excel
              <span className="ml-auto text-xs text-slate-400">.xlsx</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
