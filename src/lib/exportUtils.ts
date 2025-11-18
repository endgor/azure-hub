import { AzureIpAddress } from '@/types/azure';
import type { WorkSheet } from 'xlsx';
import { downloadFile, downloadExcel, downloadMarkdown } from './downloadUtils';
import { generateQueryFilename } from './filenameUtils';

/** Generic row type for CSV/Excel export */
export type ExportRow = Record<string, string | number | boolean | null | undefined>;

/** Specific export format for Azure IP address data */
export type ExportData = ExportRow & {
  'Service Tag': string;
  'IP Range': string;
  'Region': string;
  'System Service': string;
  'Network Features': string;
};

/** Options for Excel export, including row background colors */
interface ExcelExportOptions {
  rowFills?: (string | null | undefined)[]; // Hex colors for row backgrounds
}

/** Transforms Azure IP data into export-ready format */
export function prepareDataForExport(results: AzureIpAddress[]): ExportData[] {
  return results.map((result) => ({
    'Service Tag': result.serviceTagId || '',
    'IP Range': result.ipAddressPrefix || '',
    'Region': result.region || '',
    'System Service': result.systemService || '',
    'Network Features': result.networkFeatures || ''
  }));
}

/**
 * Exports data to CSV format using PapaParse library.
 * Uses dynamic import to reduce initial bundle size.
 */
export async function exportToCSV<T extends ExportRow>(data: T[], filename: string = 'azure-ip-ranges.csv'): Promise<void> {
  const Papa = (await import('papaparse')).default;

  // Sanitize all string values in the data
  const sanitizedData = data.map(row => {
    const sanitizedRow: ExportRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        sanitizedRow[key] = sanitizeCellValue(value);
      } else {
        sanitizedRow[key] = value;
      }
    }
    return sanitizedRow as T;
  });

  const csv = Papa.unparse(sanitizedData);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exports data to Excel (.xlsx) format with optional row styling.
 * Now uses SheetJS (xlsx) library for simplified implementation.
 * Supports row background colors via cell styling.
 */
export async function exportToExcel<T extends ExportRow>(
  data: T[],
  filename: string = 'azure-ip-ranges.xlsx',
  sheetName: string = 'Azure IP Ranges',
  options?: ExcelExportOptions
): Promise<void> {
  if (data.length === 0) {
    downloadExcel(new Blob([]), filename);
    return;
  }

  // Dynamically import xlsx to reduce initial bundle size
  const xlsx = await import('xlsx');

  // Convert data to array of arrays format
  const headers = Object.keys(data[0] ?? {});
  const rows = data.map((row) => headers.map((header) => formatCellValue(row[header])));

  // Create worksheet with headers and data
  const wsData = [headers, ...rows];
  const worksheet = xlsx.utils.aoa_to_sheet(wsData);

  // Apply row fill colors if provided
  if (options?.rowFills && options.rowFills.length > 0) {
    applyRowFills(xlsx, worksheet, options.rowFills, rows.length);
  }

  // Create workbook and append worksheet
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadExcel(wbout, filename);
}

/**
 * Exports data to Markdown table format.
 * Creates a spec-compliant markdown table with headers and data rows.
 * Note: Column alignment padding is omitted as it's purely cosmetic - markdown renderers ignore it.
 * Markdown tables don't support styling like colors, so those are ignored.
 */
export function exportToMarkdown<T extends ExportRow>(
  data: T[],
  filename: string = 'azure-ip-ranges.md'
): void {
  if (data.length === 0) {
    downloadMarkdown('No data to export', filename);
    return;
  }

  // Get headers from first row
  const headers = Object.keys(data[0] ?? {});

  // Create header row
  const headerRow = '| ' + headers.join(' | ') + ' |';

  // Create separator row (minimal spec-compliant format)
  const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';

  // Create data rows
  const dataRows = data.map(row =>
    '| ' + headers.map(header => formatMarkdownValue(row[header])).join(' | ') + ' |'
  );

  // Combine all rows
  const markdown = [headerRow, separatorRow, ...dataRows].join('\n');

  downloadMarkdown(markdown, filename);
}

/**
 * Generates a descriptive filename with sanitized query and ISO date.
 * Example: "azure-ip-ranges_192_168_0_0_2024-01-15.xlsx"
 */
export function generateFilename(query: string, format: 'csv' | 'xlsx' | 'md'): string {
  return generateQueryFilename(query, format, 'azure-ip-ranges');
}

/**
 * Sanitizes CSV export values to ensure safe spreadsheet imports.
 */
function sanitizeCellValue(value: string): string {
  if (!value || value.length === 0) return value;

  const firstChar = value.charAt(0);
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

  // Prefix with single quote if value starts with a dangerous character
  if (dangerousChars.includes(firstChar)) {
    return "'" + value;
  }

  return value;
}

/**
 * Formats cell values for Excel export.
 * Preserves numbers as numeric type, converts booleans to TRUE/FALSE strings.
 */
function formatCellValue(value: ExportRow[keyof ExportRow]): string | number {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return sanitizeCellValue(String(value));
}

/**
 * Formats cell values for Markdown table export.
 * Escapes pipe characters and handles null/undefined values.
 */
function formatMarkdownValue(value: ExportRow[keyof ExportRow]): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  // Escape pipe characters to prevent breaking table structure
  return String(value).replace(/\|/g, '\\|');
}

/**
 * Applies background colors to worksheet rows.
 * Row 0 is headers, data rows start at index 1.
 */
function applyRowFills(
  xlsx: typeof import('xlsx'),
  worksheet: WorkSheet,
  rowFills: (string | null | undefined)[],
  dataRowCount: number
): void {
  if (!worksheet['!rows']) {
    worksheet['!rows'] = [];
  }

  // Apply fills to data rows (skip header row)
  for (let i = 0; i < Math.min(rowFills.length, dataRowCount); i++) {
    const fillColor = rowFills[i];
    if (fillColor) {
      const normalizedColor = normalizeExcelColor(fillColor);
      if (normalizedColor) {
        // Row index i+1 because row 0 is headers
        const rowIndex = i + 1;

        // Get all column keys for this row
        const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: rowIndex, c: col });
          const cell = worksheet[cellAddress];

          if (cell) {
            if (!cell.s) cell.s = {};
            if (!cell.s.fill) cell.s.fill = {};
            cell.s.fill = {
              patternType: 'solid',
              fgColor: { rgb: normalizedColor }
            };
          }
        }
      }
    }
  }
}

/**
 * Converts hex color to Excel ARGB format (FF + RGB).
 * Supports 3-char (#F00) and 6-char (#FF0000) hex codes.
 * Returns null for invalid colors.
 * Example: "#FF0000" -> "FFFF0000" (fully opaque red)
 */
function normalizeExcelColor(hex: string | null): string | null {
  if (!hex) return null;

  let value = hex.trim();
  if (!value) return null;

  value = value.startsWith('#') ? value.slice(1) : value;

  // Expand 3-char hex to 6-char (#F00 -> #FF0000)
  if (value.length === 3 && /^[0-9a-fA-F]+$/.test(value)) {
    value = value.split('').map(char => char + char).join('');
  }

  // Return ARGB format (Alpha = FF for fully opaque)
  return /^[0-9a-fA-F]{6}$/.test(value) ? `FF${value.toUpperCase()}` : null;
}
