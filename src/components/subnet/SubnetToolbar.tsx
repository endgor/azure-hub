import type { ReactElement } from 'react';
import SubnetExportButton from '@/components/SubnetExportButton';
import ColorPicker from './ColorPicker';
import AzureImportModal from './AzureImportModal';
import type { ShareStatus } from '@/hooks/subnet/useSubnetShare';

export interface SubnetToolbarProps {
  // Color mode
  isColorModeActive: boolean;
  selectedColorId: string;
  onToggleColorMode: () => void;
  onSelectColor: (colorId: string) => void;

  // Azure settings
  isAzureMenuOpen: boolean;
  useAzureReservations: boolean;
  azureMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleAzureMenu: () => void;
  onToggleReservations: (checked: boolean) => void;
  onCloseAzureMenu: () => void;

  // Export
  renderRows: any[];
  baseNetwork: number;
  basePrefix: number;
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;

  // Share
  shareStatus: ShareStatus;
  isGeneratingShare: boolean;
  onShare: () => void;
}

/**
 * Toolbar for subnet calculator with color picker, Azure settings, export, and share buttons.
 */
export default function SubnetToolbar({
  isColorModeActive,
  selectedColorId,
  onToggleColorMode,
  onSelectColor,
  isAzureMenuOpen,
  useAzureReservations,
  azureMenuRef,
  onToggleAzureMenu,
  onToggleReservations,
  onCloseAzureMenu,
  renderRows,
  baseNetwork,
  basePrefix,
  rowColors,
  rowComments,
  shareStatus,
  isGeneratingShare,
  onShare
}: SubnetToolbarProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <ColorPicker
          isColorModeActive={isColorModeActive}
          selectedColorId={selectedColorId}
          onToggleColorMode={onToggleColorMode}
          onSelectColor={onSelectColor}
        />
      </div>

      {/* Azure Settings and Export */}
      <div className="flex items-center gap-2">
        <AzureImportModal
          isAzureMenuOpen={isAzureMenuOpen}
          useAzureReservations={useAzureReservations}
          azureMenuRef={azureMenuRef}
          onToggleMenu={onToggleAzureMenu}
          onToggleReservations={onToggleReservations}
          onCloseMenu={onCloseAzureMenu}
        />

        <SubnetExportButton
          rows={renderRows}
          useAzureReservations={useAzureReservations}
          baseNetwork={baseNetwork}
          basePrefix={basePrefix}
          rowColors={rowColors}
          rowComments={rowComments}
          variant="icon"
          onTrigger={onToggleColorMode}
        />
      </div>

      {/* Share Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 ${
            shareStatus === 'copied'
              ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
              : shareStatus === 'error'
                ? 'border-rose-300 text-rose-500 dark:border-rose-700 dark:text-rose-400'
                : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-600 dark:hover:text-sky-400'
          }`}
          disabled={isGeneratingShare}
          title={
            shareStatus === 'copied'
              ? 'Link copied'
              : shareStatus === 'error'
                ? 'Copy failed'
                : 'Copy shareable link'
          }
        >
          {shareStatus === 'copied' ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : shareStatus === 'error' ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 7.5l3-3a3 3 0 114.243 4.243l-3 3M10.5 16.5l-3 3a3 3 0 11-4.243-4.243l3-3M8.25 15.75l7.5-7.5"
              />
            </svg>
          )}
        </button>
        {shareStatus === 'copied' && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            Link copied!
          </span>
        )}
        {shareStatus === 'error' && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400">
            Copy failed
          </span>
        )}
      </div>
    </div>
  );
}
