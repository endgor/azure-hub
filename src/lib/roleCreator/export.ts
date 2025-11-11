import { downloadJSON } from '@/lib/downloadUtils';
import { generateNameFilename } from '@/lib/filenameUtils';
import { hasPlaceholderScope, findValidationIssues } from './validation';

export interface CustomRoleDefinition {
  roleName: string;
  description: string;
  assignableScopes: string[];
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

export interface ExportRoleOptions {
  customRole: CustomRoleDefinition;
  manuallyAddedActions: Set<string>;
}

/**
 * Convert custom role to Azure-compatible JSON format
 */
export function convertToAzureFormat(customRole: CustomRoleDefinition) {
  return {
    properties: {
      roleName: customRole.roleName,
      description: customRole.description,
      assignableScopes: customRole.assignableScopes,
      permissions: [
        {
          actions: customRole.actions,
          notActions: customRole.notActions,
          dataActions: customRole.dataActions,
          notDataActions: customRole.notDataActions
        }
      ]
    }
  };
}

/**
 * Export custom role definition to JSON file with validation checks
 */
export function exportRoleDefinition({
  customRole,
  manuallyAddedActions
}: ExportRoleOptions): boolean {
  // Validate role name
  if (!customRole.roleName.trim()) {
    alert('Please provide a role name before exporting');
    return false;
  }

  // Check for placeholder subscription
  if (hasPlaceholderScope(customRole.assignableScopes)) {
    const proceed = confirm(
      '⚠️ Placeholder Subscription Detected\n\n' +
      'Your assignable scopes contain a placeholder subscription ID (00000000-0000-0000-0000-000000000000).\n\n' +
      'Azure Portal will require you to update this with your actual subscription ID before you can save the role definition.\n\n' +
      'Do you want to export anyway?'
    );
    if (!proceed) return false;
  }

  // Check for validation issues in manually added actions
  const validationIssues = findValidationIssues(
    customRole.actions,
    customRole.dataActions,
    manuallyAddedActions
  );

  if (validationIssues.length > 0) {
    const proceed = confirm(
      `⚠️ Validation Warning:\n\n${validationIssues.slice(0, 5).join('\n')}${
        validationIssues.length > 5 ? `\n\n...and ${validationIssues.length - 5} more issues` : ''
      }\n\nThese may cause Azure validation errors. Do you want to export anyway?`
    );
    if (!proceed) return false;
  }

  // Convert to Azure format and download
  const exportData = convertToAzureFormat(customRole);
  const jsonContent = JSON.stringify(exportData, null, 2);
  const filename = generateNameFilename(customRole.roleName, 'json', 'custom_role');
  downloadJSON(jsonContent, filename);

  return true;
}
