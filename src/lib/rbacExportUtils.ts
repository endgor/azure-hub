import type { LeastPrivilegeResult, AzureRole } from '@/types/rbac';
import * as XLSX from 'xlsx';
import { downloadFile, downloadJSON, downloadExcel } from './downloadUtils';
import { generateCountFilename } from './filenameUtils';

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
 * Converts a single LeastPrivilegeResult to Azure-compatible role definition format
 */
function convertToAzureFormat(result: LeastPrivilegeResult): AzureRoleDefinitionExport {
  return convertRoleToAzureFormat(result.role);
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
  const azureRoles = results.map(convertToAzureFormat);
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

  // Add data rows
  for (const role of roles) {
    const roleType = role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    const description = role.description || '';

    for (const permission of role.permissions) {
      // Add actions
      for (const action of permission.actions) {
        rows.push({
          'Role Name': role.roleName,
          'Role Type': roleType,
          'Description': description,
          'Permission Type': 'Action',
          'Permission': action
        });
      }

      // Add notActions
      for (const notAction of permission.notActions) {
        rows.push({
          'Role Name': role.roleName,
          'Role Type': roleType,
          'Description': description,
          'Permission Type': 'Not Action',
          'Permission': notAction
        });
      }

      // Add dataActions
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          rows.push({
            'Role Name': role.roleName,
            'Role Type': roleType,
            'Description': description,
            'Permission Type': 'Data Action',
            'Permission': dataAction
          });
        }
      }

      // Add notDataActions
      if (permission.notDataActions) {
        for (const notDataAction of permission.notDataActions) {
          rows.push({
            'Role Name': role.roleName,
            'Role Type': roleType,
            'Description': description,
            'Permission Type': 'Not Data Action',
            'Permission': notDataAction
          });
        }
      }
    }
  }

  // Use PapaParse for CSV generation (handles all escaping automatically)
  const Papa = (await import('papaparse')).default;
  const csv = Papa.unparse(rows);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
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

  // Create summary sheet
  const summaryData: any[][] = [['Role Name', 'Role Type', 'Description', 'Total Permissions']];

  for (const role of roles) {
    let totalPerms = 0;
    for (const perm of role.permissions) {
      totalPerms += perm.actions.length + perm.notActions.length;
      if (perm.dataActions) totalPerms += perm.dataActions.length;
      if (perm.notDataActions) totalPerms += perm.notDataActions.length;
    }

    summaryData.push([
      role.roleName,
      role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
      role.description || '',
      totalPerms
    ]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Create detailed permissions sheet
  const detailsData: any[][] = [['Role Name', 'Role Type', 'Permission Type', 'Permission']];

  for (const role of roles) {
    for (const permission of role.permissions) {
      // Add actions
      for (const action of permission.actions) {
        detailsData.push([
          role.roleName,
          role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
          'Action',
          action
        ]);
      }

      // Add notActions
      for (const notAction of permission.notActions) {
        detailsData.push([
          role.roleName,
          role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
          'Not Action',
          notAction
        ]);
      }

      // Add dataActions
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          detailsData.push([
            role.roleName,
            role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
            'Data Action',
            dataAction
          ]);
        }
      }

      // Add notDataActions
      if (permission.notDataActions) {
        for (const notDataAction of permission.notDataActions) {
          detailsData.push([
            role.roleName,
            role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
            'Not Data Action',
            notDataAction
          ]);
        }
      }
    }
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
