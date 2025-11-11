import type { ReactElement } from 'react';

export interface AzureImportModalProps {
  isAzureMenuOpen: boolean;
  useAzureReservations: boolean;
  azureMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleMenu: () => void;
  onToggleReservations: (checked: boolean) => void;
  onCloseMenu: () => void;
}

/**
 * Azure VNet import modal for configuring Azure-specific settings.
 * Currently only handles Azure reserved IPs toggle.
 */
export default function AzureImportModal({
  isAzureMenuOpen,
  useAzureReservations,
  azureMenuRef,
  onToggleMenu,
  onToggleReservations,
  onCloseMenu
}: AzureImportModalProps): ReactElement {
  return (
    <div className="relative" ref={azureMenuRef}>
      <button
        type="button"
        onClick={onToggleMenu}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sky-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-sky-400 ${
          isAzureMenuOpen
            ? 'border-sky-300 dark:border-sky-700'
            : 'border-slate-200 hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-600'
        }`}
        title="Azure Reserved IPs"
        aria-expanded={isAzureMenuOpen}
      >
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
          <path fill="currentColor" fillOpacity="0.92" d="M8 37L22.5 7H32L16 37H8z" />
          <path fill="currentColor" fillOpacity="0.66" d="M21.5 37H33l7-12-7-5.5L21.5 37z" />
        </svg>
      </button>

      {isAzureMenuOpen && (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useAzureReservations}
              onChange={(event) => onToggleReservations(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="whitespace-nowrap text-[10px] font-semibold tracking-[0.25em] text-slate-600 dark:text-slate-400">
              Use Azure Reserved IPs
            </span>
          </label>
          <button
            type="button"
            onClick={onCloseMenu}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
            aria-label="Collapse Azure Reserved IPs toggle"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
