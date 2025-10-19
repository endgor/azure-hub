import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AzureIpAddress } from '@/types/azure';

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export interface ExportData {
  'Service Tag': string;
  'IP Range': string;
  'Region': string;
  'System Service': string;
  'Network Features': string;
}

interface ExcelExportOptions {
  rowFills?: (string | null | undefined)[];
}

export function prepareDataForExport(results: AzureIpAddress[]): ExportData[] {
  return results.map((result) => ({
    'Service Tag': result.serviceTagId || '',
    'IP Range': result.ipAddressPrefix || '',
    'Region': result.region || '',
    'System Service': result.systemService || '',
    'Network Features': result.networkFeatures || ''
  }));
}

export function exportToCSV<T extends ExportRow>(data: T[], filename: string = 'azure-ip-ranges.csv'): void {
  const csv = Papa.unparse(data);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

export function exportToExcel<T extends ExportRow>(
  data: T[],
  filename: string = 'azure-ip-ranges.xlsx',
  sheetName: string = 'Azure IP Ranges',
  options?: ExcelExportOptions
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (options?.rowFills?.length && data.length > 0) {
    const headers = Object.keys(data[0] ?? {});

    options.rowFills.forEach((fill, rowIndex) => {
      if (!fill) {
        return;
      }
      const excelColor = normaliseExcelColor(fill);
      if (!excelColor) {
        return;
      }

      headers.forEach((_, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
        const cell = worksheet[cellAddress];
        const fillStyle = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: excelColor },
            bgColor: { rgb: excelColor }
          }
        };

        if (cell) {
          cell.s = {
            ...(cell.s || {}),
            ...fillStyle
          };
        } else {
          worksheet[cellAddress] = {
            t: 'z',
            s: fillStyle
          };
        }
      });
    });
  }

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  downloadFile(
    new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function normaliseExcelColor(hex: string): string | null {
  let value = hex.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith('#')) {
    value = value.slice(1);
  }
  if (value.length === 3 && /^[0-9a-fA-F]+$/.test(value)) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }
  return `FF${value.toUpperCase()}`;
}

function downloadFile(data: string | Blob, filename: string, mimeType: string): void {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

export function generateFilename(query: string, format: 'csv' | 'xlsx'): string {
  const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return `azure-ip-ranges_${sanitizedQuery}_${timestamp}.${format}`;
}
