import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface FilterPopoverProps {
  label: string;
  /** Number of active selections, rendered as a badge on the trigger */
  activeCount?: number;
  /** Replaces the label when set, e.g. "8–16 vCPU" */
  summary?: string;
  onClear?: () => void;
  /** Width utility for the panel */
  panelWidthClass?: string;
  /** Aligns the panel to the right edge of the trigger */
  align?: 'left' | 'right';
  children: ReactNode;
}

export default function FilterPopover({
  label,
  activeCount = 0,
  summary,
  onClear,
  panelWidthClass = 'w-72',
  align = 'left',
  children
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  useClickOutside(containerRef as React.RefObject<HTMLElement>, close, isOpen);

  const isActive = activeCount > 0 || Boolean(summary);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
          isActive
            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400/60 dark:bg-sky-500/10 dark:text-sky-300'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
        }`}
      >
        <span>{summary ?? label}</span>
        {activeCount > 0 && !summary && (
          <span className="rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white dark:bg-sky-400 dark:text-slate-900">
            {activeCount}
          </span>
        )}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute z-30 mt-1 ${panelWidthClass} rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            {onClear && isActive && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-sky-600 underline decoration-dotted underline-offset-2 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                Clear
              </button>
            )}
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
