import { useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface ExportOption {
  label: string;
  format: string;
  extension: string;
  onClick: () => void | Promise<void>;
}

interface ExportMenuProps {
  options: ExportOption[];
  itemCount: number;
  itemLabel: string;
  disabled?: boolean;
  isExporting?: boolean;
}

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Export"
      >
        {isExporting ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {options.map((option) => (
              <button
                key={option.format}
                onClick={() => handleOptionClick(option)}
                className="flex w-full items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                role="menuitem"
              >
                <span className="w-8 shrink-0 text-right text-slate-400">{option.extension.replace('.', '').toUpperCase()}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
