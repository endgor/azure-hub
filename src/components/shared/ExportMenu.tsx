import { useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import Button from '@/components/shared/Button';

export interface ExportOption {
  label: string;
  format: string;
  extension: string;
  onClick: () => void | Promise<void>;
}

interface ExportMenuProps {
  options: ExportOption[];
  itemCount: number;
  disabled?: boolean;
  isExporting?: boolean;
  /**
   * Shown beside a disabled button to explain how to enable it, e.g. on tables
   * where export acts on selected rows. Supplying it also keeps the button
   * rendered while disabled; without it the menu hides when there is nothing
   * to export.
   */
  disabledHint?: string;
}

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export default function ExportMenu({
  options,
  itemCount,
  disabled = false,
  isExporting = false,
  disabledHint
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => setIsOpen(false), isOpen);

  const handleOptionClick = async (option: ExportOption) => {
    setIsOpen(false);
    await option.onClick();
  };

  const isDisabled = disabled || itemCount === 0;

  // Without a hint there is nothing useful to show, so stay hidden as before.
  if (isDisabled && !disabledHint) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isDisabled && disabledHint && (
        <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
          {disabledHint}
        </span>
      )}

      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<DownloadIcon />}
          isLoading={isExporting}
          disabled={isDisabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={isDisabled ? disabledHint : undefined}
        >
          Export
        </Button>

        {isOpen && (
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
        )}
      </div>
    </div>
  );
}
