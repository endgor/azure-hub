import type { LeastPrivilegeResult, AzureRole } from '@/types/rbac';
import * as XLSX from 'xlsx';

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
 * Converts a single LeastPrivilegeResult to Azure-compatible role definition format
 */
function convertToAzureFormat(result: LeastPrivilegeResult): AzureRoleDefinitionExport {
  const { role } = result;

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

  // Convert all selected roles to Azure format
  const azureRoles = results.map(convertToAzureFormat);

  // For single role, export as single object; for multiple, export as array
  const exportData = azureRoles.length === 1 ? azureRoles[0] : azureRoles;

  // Convert to formatted JSON
  const jsonContent = JSON.stringify(exportData, null, 2);

  // Trigger download
  downloadJSON(jsonContent, filename);
}

/**
 * Triggers browser file download for JSON content
 */
function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
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
 * Generates a descriptive filename for role export
 * @param roleCount Number of roles being exported
 * @returns Formatted filename with timestamp
 */
export function generateRoleExportFilename(roleCount: number): string {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const roleLabel = roleCount === 1 ? 'role' : 'roles';
  return `azure-rbac-${roleCount}-${roleLabel}_${timestamp}.json`;
}

/**
 * Exports Azure roles to CSV format
 * CSV columns: Role Name, Role Type, Description, Permission Type, Permission
 */
export function exportRolesToCSV(
  roles: AzureRole[],
  filename: string = 'azure-roles.csv'
): void {
  if (roles.length === 0) {
    console.warn('No roles to export');
    return;
  }

  // Create CSV rows
  const rows: string[][] = [];

  // Add header
  rows.push(['Role Name', 'Role Type', 'Description', 'Permission Type', 'Permission']);

  // Add data rows
  for (const role of roles) {
    for (const permission of role.permissions) {
      // Add actions
      for (const action of permission.actions) {
        rows.push([
          role.roleName,
          role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
          role.description || '',
          'Action',
          action
        ]);
      }

      // Add notActions
      for (const notAction of permission.notActions) {
        rows.push([
          role.roleName,
          role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
          role.description || '',
          'Not Action',
          notAction
        ]);
      }

      // Add dataActions
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          rows.push([
            role.roleName,
            role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
            role.description || '',
            'Data Action',
            dataAction
          ]);
        }
      }

      // Add notDataActions
      if (permission.notDataActions) {
        for (const notDataAction of permission.notDataActions) {
          rows.push([
            role.roleName,
            role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom',
            role.description || '',
            'Not Data Action',
            notDataAction
          ]);
        }
      }
    }
  }

  // Convert to CSV string
  const csvContent = rows
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Trigger download
  downloadFile(csvContent, filename, 'text/csv');
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
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

  // Convert roles to Azure-compatible format
  const azureRoles = roles.map(role => ({
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
  }));

  // For single role, export as single object; for multiple, export as array
  const exportData = azureRoles.length === 1 ? azureRoles[0] : azureRoles;

  // Convert to formatted JSON
  const jsonContent = JSON.stringify(exportData, null, 2);

  // Trigger download
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Generic file download function
 */
function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
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
