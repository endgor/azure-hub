import type { EntraIDRole } from '@/types/rbac';
import { downloadFile, downloadExcel, downloadCSV, downloadMarkdown } from './downloadUtils';

/**
 * Entra ID role definition format for export
 */
interface EntraIDRoleExport {
  id: string;
  displayName: string;
  description: string;
  isBuiltIn: boolean;
  permissions: string[];
}

/**
 * Converts an EntraIDRole to a flattened format for export
 */
function convertEntraIdRoleToExportFormat(role: EntraIDRole): EntraIDRoleExport {
  const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);

  return {
    id: role.id,
    displayName: role.displayName,
    description: role.description || '',
    isBuiltIn: role.isBuiltIn,
    permissions: allPermissions
  };
}

/**
 * Export Entra ID roles to JSON format
 */
export function exportEntraIdRolesToJSON(roles: EntraIDRole[], filename: string): void {
  const exportData = roles.map(convertEntraIdRoleToExportFormat);
  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, filename, 'application/json');
}

/**
 * Export Entra ID roles to CSV format
 */
export async function exportEntraIdRolesToCSV(roles: EntraIDRole[], filename: string): Promise<void> {
  const rows: string[][] = [];

  // Header row
  rows.push(['Role ID', 'Display Name', 'Description', 'Is Built-in', 'Permission Count', 'Permissions']);

  // Data rows
  for (const role of roles) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
    rows.push([
      role.id,
      role.displayName,
      role.description || '',
      role.isBuiltIn ? 'Yes' : 'No',
      allPermissions.length.toString(),
      allPermissions.join('; ')
    ]);
  }

  const Papa = (await import('papaparse')).default;
  const csv = Papa.unparse(rows);
  downloadCSV(csv, filename);
}

/**
 * Export Entra ID roles to Excel format
 */
export async function exportEntraIdRolesToExcel(roles: EntraIDRole[], filename: string): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Entra ID Roles Export']);
  summarySheet.addRow(['Generated', new Date().toLocaleString()]);
  summarySheet.addRow(['Total Roles', roles.length]);

  // Roles overview sheet
  const overviewSheet = workbook.addWorksheet('Roles Overview');
  overviewSheet.addRow(['Role ID', 'Display Name', 'Description', 'Is Built-in', 'Permission Count']);

  for (const role of roles) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
    overviewSheet.addRow([
      role.id,
      role.displayName,
      role.description || '',
      role.isBuiltIn ? 'Yes' : 'No',
      allPermissions.length
    ]);
  }

  // Individual role sheets (limit to first 10 roles to avoid Excel sheet limit)
  const rolesToExport = roles.slice(0, 10);
  for (const role of rolesToExport) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
    // Sanitize sheet name (max 31 chars, no special chars)
    const sheetName = role.displayName
      .replace(/[\\\/\?\*\[\]]/g, '')
      .substring(0, 31);
    const roleSheet = workbook.addWorksheet(sheetName);

    roleSheet.addRow(['Display Name', role.displayName]);
    roleSheet.addRow(['Description', role.description || '']);
    roleSheet.addRow(['Role ID', role.id]);
    roleSheet.addRow(['Is Built-in', role.isBuiltIn ? 'Yes' : 'No']);
    roleSheet.addRow([]);
    roleSheet.addRow(['Permissions']);
    for (const permission of allPermissions) {
      roleSheet.addRow([permission]);
    }
  }

  if (roles.length > 10) {
    const noteSheet = workbook.addWorksheet('Note');
    noteSheet.addRow(['Note: Only the first 10 roles have individual detail sheets to comply with Excel limits.']);
    noteSheet.addRow(['All roles are listed in the "Roles Overview" sheet.']);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcel(buffer as ArrayBuffer, filename);
}

/**
 * Export Entra ID roles to Markdown format
 */
export function exportEntraIdRolesToMarkdown(roles: EntraIDRole[], filename: string): void {
  const lines: string[] = [];

  lines.push('# Entra ID Roles Export');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`**Total Roles:** ${roles.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const role of roles) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);

    lines.push(`## ${role.displayName}`);
    lines.push('');
    if (role.description) {
      lines.push(`**Description:** ${role.description}`);
      lines.push('');
    }
    lines.push(`**Role ID:** \`${role.id}\``);
    lines.push(`**Is Built-in:** ${role.isBuiltIn ? 'Yes' : 'No'}`);
    lines.push(`**Permission Count:** ${allPermissions.length}`);
    lines.push('');

    if (allPermissions.length > 0) {
      lines.push('### Permissions');
      lines.push('');
      for (const permission of allPermissions) {
        lines.push(`- \`${permission}\``);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  const markdown = lines.join('\n');
  downloadMarkdown(markdown, filename);
}
