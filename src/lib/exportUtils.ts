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
  sheetName: string = 'Azure IP Ranges'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadFile(
    new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
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
