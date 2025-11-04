import { useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface ExportOption {
  label: string;
  format: string;
  extension: string;
  onClick: () => void | Promise<void>;
}

interface ExportMenuProps {
  /**
   * Array of export options to display
   */
  options: ExportOption[];

  /**
   * Number of items being exported
   */
  itemCount: number;

  /**
   * Label for items (e.g., "role", "record", "result")
   */
  itemLabel: string;

  /**
   * Whether the export button is disabled
   */
  disabled?: boolean;

  /**
   * Whether export is currently in progress
   */
  isExporting?: boolean;
}

/**
 * Generic export dropdown menu component
 * Provides a consistent UI for exporting data in multiple formats
 *
 * @example
 * ```tsx
 * <ExportMenu
 *   options={[
 *     { label: 'CSV', format: 'csv', extension: '.csv', onClick: handleCsvExport },
 *     { label: 'Excel', format: 'excel', extension: '.xlsx', onClick: handleExcelExport },
 *     { label: 'JSON', format: 'json', extension: '.json', onClick: handleJsonExport }
 *   ]}
 *   itemCount={roles.length}
 *   itemLabel="role"
 *   isExporting={isExporting}
 * />
 * ```
 */
export default function ExportMenu({
  options,
  itemCount,
  itemLabel,
  disabled = false,
  isExporting = false
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => setIsOpen(false), isOpen);

  const handleOptionClick = async (option: ExportOption) => {
    setIsOpen(false);
    await option.onClick();
  };

  if (disabled || itemCount === 0) {
    return null;
  }

  const pluralLabel = itemCount === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isExporting ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="border-b border-slate-200 px-4 py-2 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Export {itemCount} {pluralLabel}
            </div>
            {options.map((option) => (
              <button
                key={option.format}
                onClick={() => handleOptionClick(option)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                role="menuitem"
              >
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {option.format === 'csv' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  )}
                </svg>
                Export as {option.label}
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{option.extension}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
