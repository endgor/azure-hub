import type { LeastPrivilegeResult, AzureRole } from '@/types/rbac';
import * as XLSX from 'xlsx';
import { downloadFile, downloadExcel, downloadCSV, downloadMarkdown } from './downloadUtils';
import { generateCountFilename } from './filenameUtils';
import { getFlattenedPermissions, countTotalPermissions, type PermissionType } from './utils/permissionFlattener';

/**
 * Azure-compatible role definition format for export
 * Matches the structure used by Azure ARM templates and role definitions API
 */
interface AzureRoleDefinitionExport {
  id: string;
  properties: {
    roleName: string;
    description: string;
    assignableScopes: string[];
    permissions: Array<{
      actions: string[];
      notActions: string[];
      dataActions: string[];
      notDataActions: string[];
      conditionVersion?: string;
      condition?: string;
    }>;
  };
}

/**
 * Converts an AzureRole to Azure-compatible role definition format.
 * Shared helper used by multiple export functions.
 */
function convertRoleToAzureFormat(role: AzureRole): AzureRoleDefinitionExport {
  return {
    id: role.id,
    properties: {
      roleName: role.roleName,
      description: role.description || '',
      assignableScopes: role.assignableScopes || ['/'],
      permissions: role.permissions.map(permission => ({
        actions: permission.actions || [],
        notActions: permission.notActions || [],
        dataActions: permission.dataActions || [],
        notDataActions: permission.notDataActions || []
      }))
    }
  };
}

/**
 * Generic helper for exporting Azure role data to JSON format.
 * Handles single vs array export and JSON formatting.
 * @param data Array of role definitions in Azure format
 * @param filename Output filename
 * @param mimeType MIME type for download (defaults to application/json)
 */
function exportAzureRoleDefinitionsToJSON(
  data: AzureRoleDefinitionExport[],
  filename: string,
  mimeType: string = 'application/json'
): void {
  // For single role, export as single object; for multiple, export as array
  const exportData = data.length === 1 ? data[0] : data;

  // Convert to formatted JSON
  const jsonContent = JSON.stringify(exportData, null, 2);

  // Trigger download
  downloadFile(jsonContent, filename, mimeType);
}

/**
 * Exports selected roles to Azure-compatible JSON format
 * @param results Array of selected LeastPrivilegeResult objects
 * @param filename Optional filename for the download
 */
export function exportRolesToAzureJSON(
  results: LeastPrivilegeResult[],
  filename: string = 'azure-roles.json'
): void {
  if (results.length === 0) {
    console.warn('No roles to export');
    return;
  }

  // Convert all selected roles to Azure format and export
  const azureRoles = results.map(result => convertRoleToAzureFormat(result.role));
  exportAzureRoleDefinitionsToJSON(azureRoles, filename);
}

/**
 * Generates a descriptive filename for role export
 * @param roleCount Number of roles being exported
 * @returns Formatted filename with timestamp
 */
export function generateRoleExportFilename(roleCount: number): string {
  return generateCountFilename(roleCount, 'json');
}

/**
 * Exports Azure roles to CSV format using PapaParse library.
 * CSV columns: Role Name, Role Type, Description, Permission Type, Permission
 * Uses dynamic import to reduce initial bundle size.
 */
export async function exportRolesToCSV(
  roles: AzureRole[],
  filename: string = 'azure-roles.csv'
): Promise<void> {
  if (roles.length === 0) {
    console.warn('No roles to export');
    return;
  }

  // Prepare data rows as objects for PapaParse
  const rows: Array<{
    'Role Name': string;
    'Role Type': string;
    'Description': string;
    'Permission Type': string;
    'Permission': string;
  }> = [];

  // Add data rows using flattening utility
  for (const role of roles) {
    const roleType = role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    const description = role.description || '';
    const flattened = getFlattenedPermissions(role);

    // Helper to add permissions of a specific type
    const addPermissions = (permissions: string[], type: PermissionType) => {
      for (const permission of permissions) {
        rows.push({
          'Role Name': role.roleName,
          'Role Type': roleType,
          'Description': description,
          'Permission Type': type,
          'Permission': permission
        });
      }
    };

    addPermissions(flattened.actions, 'Action');
    addPermissions(flattened.notActions, 'Not Action');
    addPermissions(flattened.dataActions, 'Data Action');
    addPermissions(flattened.notDataActions, 'Not Data Action');
  }

  // Use PapaParse for CSV generation (handles all escaping automatically)
  const Papa = (await import('papaparse')).default;
  const csv = Papa.unparse(rows);
  downloadCSV(csv, filename);
}

/**
 * Exports Azure roles to Excel format
 * Creates a workbook with separate sheets for each role
 */
export async function exportRolesToExcel(
  roles: AzureRole[],
  filename: string = 'azure-roles.xlsx'
): Promise<void> {
  if (roles.length === 0) {
    console.warn('No roles to export');
    return;
  }

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Create summary sheet using counting utility
  const summaryData: any[][] = [['Role Name', 'Role Type', 'Description', 'Total Permissions']];

  for (const role of roles) {
    summaryData.push([
      role.roleName,
      role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
      role.description || '',
      countTotalPermissions(role)
    ]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Create detailed permissions sheet using flattening utility
  const detailsData: any[][] = [['Role Name', 'Role Type', 'Permission Type', 'Permission']];

  for (const role of roles) {
    const roleType = role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    const flattened = getFlattenedPermissions(role);

    // Helper to add permissions of a specific type
    const addPermissions = (permissions: string[], type: PermissionType) => {
      for (const permission of permissions) {
        detailsData.push([
          role.roleName,
          roleType,
          type,
          permission
        ]);
      }
    };

    addPermissions(flattened.actions, 'Action');
    addPermissions(flattened.notActions, 'Not Action');
    addPermissions(flattened.dataActions, 'Data Action');
    addPermissions(flattened.notDataActions, 'Not Data Action');
  }

  const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
  XLSX.utils.book_append_sheet(wb, detailsSheet, 'Permissions');

  // Generate Excel file and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadExcel(wbout, filename);
}

/**
 * Exports Azure roles to JSON format (for Role Explorer)
 * Different from exportRolesToAzureJSON which is for LeastPrivilegeResult
 */
export function exportRolesToJSON(
  roles: AzureRole[],
  filename: string = 'azure-roles.json'
): void {
  if (roles.length === 0) {
    console.warn('No roles to export');
    return;
  }

  // Convert roles to Azure-compatible format and export
  const azureRoles = roles.map(convertRoleToAzureFormat);
  exportAzureRoleDefinitionsToJSON(azureRoles, filename);
}

/**
 * Exports Azure roles to Markdown table format.
 * Creates separate tables for each role showing Actions and Data Actions.
 * Note: Markdown doesn't support colors, so styling is ignored.
 */
export function exportRolesToMarkdown(
  roles: AzureRole[],
  filename: string = 'azure-roles.md'
): void {
  if (roles.length === 0) {
    console.warn('No roles to export');
    return;
  }

  const sections: string[] = [];

  // Add title
  sections.push(`# Azure RBAC Roles\n`);
  sections.push(`Exported ${roles.length} role${roles.length === 1 ? '' : 's'} on ${new Date().toISOString().slice(0, 10)}\n`);

  // Create a section for each role
  for (const role of roles) {
    const roleType = role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    const flattened = getFlattenedPermissions(role);
    const totalPermissions = countTotalPermissions(role);

    sections.push(`## ${role.roleName}`);
    sections.push(`**Type:** ${roleType}`);
    if (role.description) {
      sections.push(`**Description:** ${role.description}`);
    }
    sections.push(`**Total Permissions:** ${totalPermissions}\n`);

    // Actions table
    if (flattened.actions.length > 0 || flattened.notActions.length > 0) {
      sections.push(`### Actions`);
      sections.push(`| Type | Permission |`);
      sections.push(`|------|------------|`);

      for (const action of flattened.actions) {
        sections.push(`| Action | ${action.replace(/\|/g, '\\|')} |`);
      }
      for (const notAction of flattened.notActions) {
        sections.push(`| Not Action | ${notAction.replace(/\|/g, '\\|')} |`);
      }
      sections.push('');
    }

    // Data Actions table
    if (flattened.dataActions.length > 0 || flattened.notDataActions.length > 0) {
      sections.push(`### Data Actions`);
      sections.push(`| Type | Permission |`);
      sections.push(`|------|------------|`);

      for (const dataAction of flattened.dataActions) {
        sections.push(`| Data Action | ${dataAction.replace(/\|/g, '\\|')} |`);
      }
      for (const notDataAction of flattened.notDataActions) {
        sections.push(`| Not Data Action | ${notDataAction.replace(/\|/g, '\\|')} |`);
      }
      sections.push('');
    }

    sections.push('---\n');
  }

  // Create summary table at the end
  sections.push(`## Summary\n`);
  sections.push(`| Role Name | Type | Total Permissions |`);
  sections.push(`|-----------|------|-------------------|`);
  for (const role of roles) {
    const roleType = role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    const totalPermissions = countTotalPermissions(role);
    sections.push(`| ${role.roleName.replace(/\|/g, '\\|')} | ${roleType} | ${totalPermissions} |`);
  }

  const markdown = sections.join('\n');
  downloadMarkdown(markdown, filename);
}
