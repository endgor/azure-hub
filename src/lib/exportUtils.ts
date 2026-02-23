import { AzureIpAddress, AzureCloudName } from '@/types/azure';
import type { Worksheet } from 'exceljs';
import { downloadFile, downloadExcel, downloadMarkdown } from './downloadUtils';
import { generateQueryFilename } from './filenameUtils';

/** Generic row type for CSV/Excel export */
export type ExportRow = Record<string, string | number | boolean | null | undefined>;

/** Specific export format for Azure IP address data */
export type ExportData = ExportRow & {
  'Cloud': string;
  'Service Tag': string;
  'IP Range': string;
  'Region': string;
  'System Service': string;
  'Network Features': string;
};

/** Maps cloud enum to display label for exports */
const CLOUD_EXPORT_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Government',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

/** Options for Excel export, including row background colors */
interface ExcelExportOptions {
  rowFills?: (string | null | undefined)[]; // Hex colors for row backgrounds
}

/** Transforms Azure IP data into export-ready format */
export function prepareDataForExport(results: AzureIpAddress[]): ExportData[] {
  return results.map((result) => ({
    'Cloud': result.cloud ? CLOUD_EXPORT_LABELS[result.cloud] : '',
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
 * Uses ExcelJS library with native cell styling support.
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

  // Dynamically import ExcelJS to reduce initial bundle size
  const ExcelJS = await import('exceljs');

  const headers = Object.keys(data[0] ?? {});
  const rows = data.map((row) => headers.map((header) => formatCellValue(row[header])));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(headers);
  for (const row of rows) {
    worksheet.addRow(row);
  }

  // Apply row fill colors if provided
  if (options?.rowFills && options.rowFills.length > 0) {
    applyRowFills(worksheet, options.rowFills);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcel(buffer as ArrayBuffer, filename);
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
 * ExcelJS is 1-based: row 1 = headers, data starts at row 2.
 */
function applyRowFills(
  worksheet: Worksheet,
  rowFills: (string | null | undefined)[]
): void {
  const colCount = worksheet.columnCount;

  for (let i = 0; i < rowFills.length; i++) {
    const fillColor = rowFills[i];
    if (fillColor) {
      const normalizedColor = normalizeExcelColor(fillColor);
      if (normalizedColor) {
        // Row i+2: +1 for 1-based indexing, +1 to skip header row
        const row = worksheet.getRow(i + 2);
        for (let col = 1; col <= colCount; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: normalizedColor }
          };
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
