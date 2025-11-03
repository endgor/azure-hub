import { AzureIpAddress } from '@/types/azure';

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
  const csv = Papa.unparse(data);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exports data to Excel (.xlsx) format with optional row styling.
 * Creates a valid Office Open XML workbook from scratch without external Excel libraries.
 * Uses JSZip to package XML files into .xlsx format (which is a ZIP archive).
 */
export async function exportToExcel<T extends ExportRow>(
  data: T[],
  filename: string = 'azure-ip-ranges.xlsx',
  sheetName: string = 'Azure IP Ranges',
  options?: ExcelExportOptions
): Promise<void> {
  if (data.length === 0) {
    downloadFile(new Blob([], { type: EXCEL_MIME_TYPE }), filename, EXCEL_MIME_TYPE);
    return;
  }

  const headers = Object.keys(data[0] ?? {});
  const rows = data.map((row) => headers.map((header) => formatCellValue(row[header])));
  const rowFills = normaliseRowFills(options?.rowFills ?? [], rows.length);

  const buffer = await createWorkbookBuffer(headers, rows, sheetName, rowFills);
  downloadFile(new Blob([buffer], { type: EXCEL_MIME_TYPE }), filename, EXCEL_MIME_TYPE);
}

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Triggers browser file download using Blob URL and hidden anchor element.
 * Automatically cleans up the Blob URL after download starts.
 */
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

/**
 * Generates a descriptive filename with sanitized query and ISO date.
 * Example: "azure-ip-ranges_192_168_0_0_2024-01-15.xlsx"
 */
export function generateFilename(query: string, format: 'csv' | 'xlsx'): string {
  const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `azure-ip-ranges_${sanitizedQuery}_${timestamp}.${format}`;
}

/**
 * Formats cell values for Excel export.
 * Preserves numbers as numeric type, converts booleans to TRUE/FALSE strings.
 */
function formatCellValue(value: ExportRow[keyof ExportRow]): string | number {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/**
 * Normalizes row fill colors array to match row count.
 * Pads with null if too short, truncates if too long.
 */
function normaliseRowFills(rowFills: (string | null | undefined)[], rowCount: number): (string | null)[] {
  const result: (string | null)[] = [];
  for (let index = 0; index < rowCount; index += 1) {
    const fill = rowFills[index];
    result.push(normaliseExcelColor(fill ?? null));
  }
  return result;
}

/**
 * Converts hex color to Excel ARGB format (FF + RGB).
 * Supports 3-char (#F00) and 6-char (#FF0000) hex codes.
 * Returns null for invalid colors.
 * Example: "#FF0000" -> "FFFF0000" (fully opaque red)
 */
function normaliseExcelColor(hex: string | null): string | null {
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

/**
 * Builds data row XML strings with cell styling applied.
 * Row numbers start at 2 (row 1 is header).
 */
function buildDataRows(
  rows: Array<Array<string | number>>,
  rowFills: (string | null)[],
  colorStyles: Map<string, number>
): string[] {
  return rows.map((cells, index) => {
    const styleId = colorStyles.get(rowFills[index] ?? '') ?? 0;
    const cellPayloads = cells.map((cell) => {
      if (typeof cell === 'number' && Number.isFinite(cell)) {
        return { type: 'number' as const, value: String(cell) };
      }
      return { type: 'string' as const, value: String(cell ?? '') };
    });
    return buildRowXml(index + 2, cellPayloads, styleId); // +2 because row 1 is header
  });
}

/**
 * Populates ZIP archive with all required Excel XML files.
 * Excel .xlsx format is a ZIP containing XML files following Office Open XML spec.
 *
 * Required structure:
 * - [Content_Types].xml: MIME types for all parts
 * - _rels/.rels: Relationships between parts
 * - docProps/app.xml & core.xml: Document metadata
 * - xl/workbook.xml: Workbook definition
 * - xl/styles.xml: Cell formatting and styles
 * - xl/worksheets/sheet1.xml: Worksheet data
 * - xl/_rels/workbook.xml.rels: Workbook relationships
 */
function populateZipStructure(
  zip: any,
  sheetXml: string,
  stylesXml: string,
  escapedSheetName: string,
  timestamp: string
): void {
  zip.file('[Content_Types].xml', buildContentTypesXml());
  zip.folder('_rels')?.file('.rels', buildRootRelsXml());
  zip.folder('docProps')?.file('app.xml', buildAppXml(escapedSheetName));
  zip.folder('docProps')?.file('core.xml', buildCoreXml(timestamp, escapedSheetName));

  const xlFolder = zip.folder('xl');
  xlFolder?.file('workbook.xml', buildWorkbookXml(escapedSheetName));
  xlFolder?.file('styles.xml', stylesXml);
  xlFolder?.folder('worksheets')?.file('sheet1.xml', sheetXml);
  xlFolder?.folder('_rels')?.file('workbook.xml.rels', buildWorkbookRelsXml());
}

/**
 * Creates a complete Excel workbook buffer from data and styling.
 * Main orchestration function that:
 * 1. Generates all required XML content
 * 2. Packages XML files into ZIP archive
 * 3. Returns compressed binary buffer ready for download
 *
 * Uses dynamic imports for JSZip to reduce initial bundle size.
 */
async function createWorkbookBuffer(
  headers: string[],
  rows: Array<Array<string | number>>,
  sheetName: string,
  rowFills: (string | null)[]
): Promise<Uint8Array> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const now = new Date().toISOString();
  const escapedSheetName = escapeXml(sheetName);

  // Build header row (row 1)
  const headerRow = buildRowXml(1, headers.map((text) => ({ type: 'string', value: text })), 0);

  // Build data rows with styling (rows 2+)
  const colorStyles = buildColorStyleMap(rowFills);
  const dataRows = buildDataRows(rows, rowFills, colorStyles);

  // Generate worksheet XML
  const dimension = buildDimension(headers.length, rows.length + 1);
  const sheetXml = buildWorksheetXml(dimension, headerRow, dataRows.join(''));
  const stylesXml = buildStylesXml(colorStyles);

  // Package all XML files into ZIP
  populateZipStructure(zip, sheetXml, stylesXml, escapedSheetName, now);

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildAppXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Azure IP Lookup</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant>
        <vt:lpstr>Worksheets</vt:lpstr>
      </vt:variant>
      <vt:variant>
        <vt:i4>1</vt:i4>
      </vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>${sheetName}</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company></Company>
</Properties>`;
}

function buildCoreXml(timestamp: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${title}</dc:title>
  <dc:subject>Subnet Export</dc:subject>
  <dc:creator>Azure IP Lookup</dc:creator>
  <cp:lastModifiedBy>Azure IP Lookup</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function buildWorkbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${sheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function buildWorkbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

/**
 * Generates Excel styles XML with custom cell background colors.
 * Creates fill definitions for each unique row color and maps them to style IDs.
 * Style ID 0 is reserved for default (no fill).
 */
function buildStylesXml(colorStyles: Map<string, number>): string {
  const fills: string[] = [
    '<fill><patternFill patternType="none"/></fill>', // Default fill
    '<fill><patternFill patternType="gray125"/></fill>' // Gray pattern (Excel standard)
  ];
  const cellXfs: string[] = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' // Default style
  ];

  // Add custom color fills
  const colors = Array.from(colorStyles.entries()).filter(([key]) => key);
  colors.forEach(([color, styleIndex]) => {
    const fillId = 1 + styleIndex; // Offset by 1 (0 is default)
    fills.push(
      `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/><bgColor indexed="64"/></patternFill></fill>`
    );
    cellXfs.push(
      `<xf numFmtId="0" fontId="0" fillId="${fillId}" borderId="0" xfId="0" applyFill="1"/>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
      <scheme val="minor"/>
    </font>
  </fonts>
  <fills count="${fills.length}">${fills.join('')}</fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="${cellXfs.length}">${cellXfs.join('')}</cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function buildWorksheetXml(dimension: string, headerRow: string, dataRows: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetData>
    ${headerRow}
    ${dataRows}
  </sheetData>
</worksheet>`;
}

/**
 * Calculates Excel worksheet dimension range (e.g., "A1:Z100").
 * Used in worksheet XML to define the used range.
 */
function buildDimension(columnCount: number, rowCount: number): string {
  const lastColumn = columnCount > 0 ? columnLetter(columnCount - 1) : 'A';
  const lastRow = Math.max(rowCount, 1);
  return `A1:${lastColumn}${lastRow}`;
}

/**
 * Generates Excel row XML with cells.
 * Handles both numeric cells (<v> tag) and string cells (inlineStr with <t> tag).
 * Applies style ID for row background colors.
 */
function buildRowXml(
  rowNumber: number,
  cells: Array<{ type: 'string' | 'number'; value: string }>,
  styleId: number
): string {
  const columns = cells
    .map((cell, columnIndex) => {
      const cellRef = `${columnLetter(columnIndex)}${rowNumber}`;
      const styleAttr = styleId > 0 ? ` s="${styleId}"` : '';
      if (cell.type === 'number' && cell.value !== '') {
        return `<c r="${cellRef}"${styleAttr}><v>${escapeXml(cell.value)}</v></c>`;
      }
      const text = escapeXml(cell.value);
      if (!text && styleId === 0) {
        return `<c r="${cellRef}"/>`; // Empty cell
      }
      return `<c r="${cellRef}" t="inlineStr"${styleAttr}><is><t>${text}</t></is></c>`;
    })
    .join('');
  return `<row r="${rowNumber}">${columns}</row>`;
}

/**
 * Creates a map of unique colors to style IDs.
 * Style ID 0 is reserved for default (no background color).
 * Each unique color gets an incrementing style ID starting from 1.
 */
function buildColorStyleMap(rowFills: (string | null)[]): Map<string, number> {
  const map = new Map<string, number>();
  let styleIndex = 1; // 0 reserved for default
  rowFills.forEach((fill) => {
    if (fill && !map.has(fill)) {
      map.set(fill, styleIndex);
      styleIndex += 1;
    }
  });
  map.set('', 0); // Ensure empty key maps to default
  return map;
}

/**
 * Converts zero-based column index to Excel column letter.
 * Uses base-26 conversion with A-Z.
 * Examples: 0->A, 25->Z, 26->AA, 701->ZZ
 */
function columnLetter(index: number): string {
  let dividend = index + 1;
  let columnLabel = '';
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnLabel = String.fromCharCode(65 + modulo) + columnLabel;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnLabel;
}

/** Escapes special XML characters to prevent malformed XML or injection */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
