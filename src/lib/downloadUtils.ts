/**
 * Consolidated file download utilities
 * Provides consistent browser download triggers across all export functions
 */

/**
 * Triggers browser file download using Blob URL and hidden anchor element.
 * Automatically cleans up the Blob URL after download starts.
 *
 * @param data - File content as string or Blob
 * @param filename - Name for the downloaded file
 * @param mimeType - MIME type for the Blob (e.g., 'text/csv', 'application/json')
 *
 * @example
 * // Download JSON
 * downloadFile(jsonString, 'data.json', 'application/json');
 *
 * @example
 * // Download CSV
 * downloadFile(csvString, 'export.csv', 'text/csv;charset=utf-8;');
 *
 * @example
 * // Download Excel (Blob)
 * downloadFile(excelBlob, 'workbook.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 */
export function downloadFile(data: string | Blob, filename: string, mimeType: string): void {
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

/**
 * Convenience function for downloading JSON files.
 * Automatically sets the correct MIME type.
 *
 * @param content - JSON string content
 * @param filename - Name for the downloaded file
 */
export function downloadJSON(content: string, filename: string): void {
  downloadFile(content, filename, 'application/json');
}

/**
 * Convenience function for downloading CSV files.
 * Automatically sets the correct MIME type with UTF-8 encoding.
 *
 * @param content - CSV string content
 * @param filename - Name for the downloaded file
 */
export function downloadCSV(content: string, filename: string): void {
  downloadFile(content, filename, 'text/csv;charset=utf-8;');
}

/**
 * Convenience function for downloading Excel files.
 * Automatically sets the correct MIME type for .xlsx files.
 *
 * @param data - Excel file as Blob, ArrayBuffer, or Uint8Array
 * @param filename - Name for the downloaded file
 */
export function downloadExcel(data: Blob | ArrayBuffer | Uint8Array, filename: string): void {
  const excelBlob = data instanceof Blob
    ? data
    : new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(excelBlob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
