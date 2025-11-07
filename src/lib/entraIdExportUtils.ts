import type { EntraIDRole } from '@/types/rbac';
import * as XLSX from 'xlsx';
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

  await downloadCSV(rows, filename);
}

/**
 * Export Entra ID roles to Excel format
 */
export async function exportEntraIdRolesToExcel(roles: EntraIDRole[], filename: string): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: (string | number)[][] = [
    ['Entra ID Roles Export'],
    ['Generated', new Date().toLocaleString()],
    ['Total Roles', roles.length],
    []
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Roles overview sheet
  const overviewRows: (string | number)[][] = [
    ['Role ID', 'Display Name', 'Description', 'Is Built-in', 'Permission Count']
  ];

  for (const role of roles) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
    overviewRows.push([
      role.id,
      role.displayName,
      role.description || '',
      role.isBuiltIn ? 'Yes' : 'No',
      allPermissions.length
    ]);
  }

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Roles Overview');

  // Individual role sheets (limit to first 10 roles to avoid Excel sheet limit)
  const rolesToExport = roles.slice(0, 10);
  for (const role of rolesToExport) {
    const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
    const roleRows: string[][] = [
      ['Display Name', role.displayName],
      ['Description', role.description || ''],
      ['Role ID', role.id],
      ['Is Built-in', role.isBuiltIn ? 'Yes' : 'No'],
      [],
      ['Permissions']
    ];

    for (const permission of allPermissions) {
      roleRows.push([permission]);
    }

    const roleSheet = XLSX.utils.aoa_to_sheet(roleRows);
    // Sanitize sheet name (max 31 chars, no special chars)
    const sheetName = role.displayName
      .replace(/[\\\/\?\*\[\]]/g, '')
      .substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, roleSheet, sheetName);
  }

  if (roles.length > 10) {
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ['Note: Only the first 10 roles have individual detail sheets to comply with Excel limits.'],
      ['All roles are listed in the "Roles Overview" sheet.']
    ]);
    XLSX.utils.book_append_sheet(workbook, noteSheet, 'Note');
  }

  await downloadExcel(workbook, filename);
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
