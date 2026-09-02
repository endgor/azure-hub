/**
 * Shared table style constants so every data table across the site reads the same:
 * no outer border, muted uppercase headers, hairline row dividers, hover highlight.
 *
 * Use the compact variants for dense tables with many columns.
 */

/** Scroll container that carries the table's surface */
export const tableShell = 'overflow-x-auto rounded-xl bg-white dark:bg-slate-900';

/** The <table> itself */
export const tableClass = 'min-w-full text-sm';

/** Header <tr> */
export const tableHeadRow =
  'border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400';

/** Header <th> */
export const tableHeadCell = 'px-4 py-3 font-medium';
export const tableHeadCellCompact = 'px-3 py-2.5 font-medium';

/** Header <th> that sorts on click */
export const tableHeadCellSortable = `${tableHeadCell} cursor-pointer select-none transition hover:text-slate-700 dark:hover:text-slate-200`;

/** <tbody> */
export const tableBody = 'divide-y divide-slate-50 dark:divide-slate-800/50';

/** Body <tr> */
export const tableRow = 'transition hover:bg-slate-50 dark:hover:bg-slate-800/50';

/** Body <td> */
export const tableCell = 'px-4 py-3';
export const tableCellCompact = 'px-3 py-2';

/** Neutral value chip (subresources, tokens, feature flags) */
export const cellChip =
  'inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300';

/** Chip for the row's key technical value (DNS zone, IP range) */
export const cellChipAccent =
  'inline-block rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300';

/** Primary label in a row */
export const cellPrimary = 'text-sm font-medium text-slate-900 dark:text-slate-100';

/** Secondary text in a row */
export const cellMuted = 'text-sm text-slate-600 dark:text-slate-300';

/** Monospaced sub-label under a primary label (ARM types, identifiers) */
export const cellMono = 'font-mono text-[11px] text-slate-400 dark:text-slate-500';
