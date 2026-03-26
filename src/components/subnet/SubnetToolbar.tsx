import { type ReactElement, useState, useMemo, useCallback } from 'react';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
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
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'md') => {
    if (renderRows.length === 0 || isExporting) return;
    onToggleColorMode();
    setIsExporting(true);
    try {
      const [{ prepareSubnetExportData, generateSubnetExportFilename }, { exportToCSV, exportToExcel, exportToMarkdown }] = await Promise.all([
        import('@/lib/subnetExportUtils'),
        import('@/lib/exportUtils')
      ]);
      const exportData = prepareSubnetExportData(renderRows, useAzureReservations, rowComments);
      if (exportData.length === 0) return;
      const filename = generateSubnetExportFilename(baseNetwork, basePrefix, useAzureReservations, format);
      const rowFills = renderRows.map((row: any) => rowColors[row.id] ?? null);
      if (format === 'csv') {
        await exportToCSV(exportData, filename);
      } else if (format === 'xlsx') {
        await exportToExcel(exportData, filename, 'Subnet Plan', { rowFills });
      } else {
        exportToMarkdown(exportData, filename);
      }
    } catch {
      // Export failed silently
    } finally {
      setIsExporting(false);
    }
  }, [renderRows, isExporting, useAzureReservations, rowComments, rowColors, baseNetwork, basePrefix, onToggleColorMode]);

  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'Comma separated', format: 'csv', extension: '.csv', onClick: () => handleExport('csv') },
    { label: 'Excel spreadsheet', format: 'xlsx', extension: '.xlsx', onClick: () => handleExport('xlsx') },
    { label: 'Markdown table', format: 'md', extension: '.md', onClick: () => handleExport('md') },
  ], [handleExport]);

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

        <ExportMenu
          options={exportOptions}
          itemCount={renderRows.length}
          itemLabel="subnet"
          isExporting={isExporting}
        />
      </div>

      {/* Share Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            shareStatus === 'copied'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : shareStatus === 'error'
                ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
          }`}
          disabled={isGeneratingShare}
          aria-label={
            shareStatus === 'copied'
              ? 'Link copied'
              : shareStatus === 'error'
                ? 'Copy failed'
                : 'Copy shareable link'
          }
        >
          {shareStatus === 'copied' ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : shareStatus === 'error' ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
