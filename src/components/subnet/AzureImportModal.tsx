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
        className={`group flex h-8 w-8 items-center justify-center rounded-lg transition ${
          isAzureMenuOpen
            ? 'bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400'
            : 'text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400'
        }`}
        aria-label="Azure Reserved IPs"
        aria-expanded={isAzureMenuOpen}
      >
        <svg
          className={`h-4 w-4 transition group-hover:grayscale-0 group-hover:opacity-100 ${
            isAzureMenuOpen ? '' : 'grayscale opacity-60'
          }`}
          viewBox="0 0 96 96"
          aria-hidden
        >
          <defs>
            <linearGradient id="azure-a" x1="-1032" x2="-1059" y1="145" y2="65" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#114a8b" />
              <stop offset="1" stopColor="#0669bc" />
            </linearGradient>
            <linearGradient id="azure-b" x1="-1023" x2="-1029" y1="108" y2="105" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopOpacity=".3" />
              <stop offset=".07" stopOpacity=".2" />
              <stop offset=".32" stopOpacity=".1" />
              <stop offset=".62" stopOpacity=".05" />
              <stop offset="1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="azure-c" x1="-1027" x2="-997" y1="147" y2="68" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3ccbf4" />
              <stop offset="1" stopColor="#2892df" />
            </linearGradient>
          </defs>
          <path fill="url(#azure-a)" d="M33.3 6h28.5L32.2 93.7a4.5 4.5 0 01-4.3 3.1H5.7a4.5 4.5 0 01-4.3-6L29 9.1A4.5 4.5 0 0133.3 6z" />
          <path fill="#0078d4" d="M71.2 62.7H26a2.1 2.1 0 00-1.4 3.6l29.1 27.1a4.6 4.6 0 003.1 1.2h25.6z" />
          <path fill="url(#azure-b)" d="M33.3 6a4.5 4.5 0 00-4.3 3.1L1.4 90.8a4.5 4.5 0 004.3 6h22.8a4.8 4.8 0 003.7-3.1L37.7 77l19.7 18.4a4.6 4.6 0 002.9 1.4h25.6L74.7 64.6l-32.7.1L62 6z" />
          <path fill="url(#azure-c)" d="M66.6 9.1A4.5 4.5 0 0062.3 6H33.6a4.5 4.5 0 014.3 3.1l27.6 81.7a4.5 4.5 0 01-4.3 6h28.7a4.5 4.5 0 004.3-6z" />
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
