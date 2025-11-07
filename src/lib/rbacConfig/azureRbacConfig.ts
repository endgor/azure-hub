/**
 * Azure RBAC Calculator Configuration
 *
 * All Azure RBAC-specific strings, scenarios, and UI configuration.
 */

import type { RoleSystemConfig } from './types';

export const azureRbacConfig: RoleSystemConfig = {
  systemType: 'azure',
  systemName: 'Azure RBAC',

  labels: {
    heroTitle: 'Azure RBAC Calculator & Role Generator',
    categoryLabel: 'Identity & Access',
    serviceLabel: 'Select Azure Service',
    actionLabel: 'Actions',
    searchPlaceholder: 'Search for actions...',
    roleExplorerTitle: 'Azure Built-in Roles',
    roleExplorerPlaceholder: 'Search roles (e.g., Contributor, Reader, Owner)',
    roleSystemHelpText:
      'Azure RBAC roles control access to Azure resources (VMs, storage, networking, etc.)',
  },

  modes: {
    available: ['simple', 'advanced', 'roleExplorer', 'roleCreator'],
    default: 'simple',
  },

  descriptions: {
    simple:
      'Find the least privileged Azure RBAC roles for your required permissions. Enter Azure resource provider actions and discover which built-in roles grant those permissions without excessive access.',
    advanced:
      'Find the least privileged Azure RBAC roles for your required permissions. Enter Azure resource provider actions and discover which built-in roles grant those permissions without excessive access.',
    roleExplorer:
      'Search and explore Azure built-in RBAC roles by name. View detailed permissions, compare multiple roles side-by-side, and export role definitions for documentation or analysis.',
    roleCreator:
      'Build custom Azure RBAC roles tailored to your security requirements. Select specific permissions from built-in roles, define assignable scopes, and export role definitions ready for deployment.',
  },

  examples: [
    {
      label: 'VM Management',
      description: 'Start and stop virtual machines',
      actions: [
        'Microsoft.Compute/virtualMachines/read',
        'Microsoft.Compute/virtualMachines/start/action',
        'Microsoft.Compute/virtualMachines/powerOff/action',
      ],
    },
    {
      label: 'Storage Read',
      description: 'Read storage account and blob data',
      actions: [
        'Microsoft.Storage/storageAccounts/read',
        'Microsoft.Storage/storageAccounts/blobServices/containers/read',
      ],
    },
    {
      label: 'Network Viewer',
      description: 'View network resources',
      actions: [
        'Microsoft.Network/virtualNetworks/read',
        'Microsoft.Network/networkSecurityGroups/read',
        'Microsoft.Network/publicIPAddresses/read',
      ],
    },
    {
      label: 'Key Vault Secrets',
      description: 'Read secrets from Key Vault',
      actions: [
        'Microsoft.KeyVault/vaults/read',
        'Microsoft.KeyVault/vaults/secrets/read',
      ],
    },
    {
      label: 'Resource Reader',
      description: 'Read all resources in a subscription',
      actions: [
        'Microsoft.Resources/subscriptions/read',
        'Microsoft.Resources/subscriptions/resourceGroups/read',
      ],
    },
    {
      label: 'Web App Deploy',
      description: 'Deploy and manage web applications',
      actions: [
        'Microsoft.Web/sites/read',
        'Microsoft.Web/sites/config/write',
        'Microsoft.Web/sites/restart/action',
      ],
    },
  ],

  placeholders: {
    advancedMode:
      'Microsoft.Compute/virtualMachines/read\nMicrosoft.Compute/virtualMachines/start/action\nMicrosoft.Storage/storageAccounts/read',
    wildcardExample: 'Microsoft.Storage/*',
  },

  metadata: {
    title: 'Azure RBAC Calculator & Role Generator',
    description:
      'Find the least privileged Azure RBAC roles and generate custom role definitions for your required permissions using Azure Hub\'s RBAC calculator and role generator.',
    keywords: [
      'Azure RBAC calculator',
      'Azure role generator',
      'least privilege roles',
      'Azure permissions',
      'custom RBAC roles',
      'Azure role definitions',
      'Azure access control',
      'RBAC role assignment',
      'Azure resource permissions',
      'Azure IAM'
    ],
    breadcrumbs: [
      { name: 'Home', url: 'https://azurehub.org/' },
      {
        name: 'Azure RBAC Calculator',
        url: 'https://azurehub.org/tools/azure-rbac-calculator/',
      },
    ],
    toolSchemaName: 'Azure RBAC Calculator & Role Generator',
  },

  crossLink: {
    text: 'Need to manage directory objects like users, groups, or applications? Try the Entra ID Roles Calculator',
    url: '/tools/entraid-roles-calculator',
  },

  disclaimer: {
    description:
      'This tool helps you find built-in roles in Azure that provide the least privilege for a specific set of actions. It searches through Azure\'s built-in role definitions and ranks them by relevance to your required permissions.',
    points: [
      'Only built-in roles are searched. Some services may require custom roles for specific permission combinations.',
      'Role ranking is based on namespace relevance and permission scope, not on risk assessment or privilege level beyond basic categorization.',
      'Some permissions may not be available in any built-in role. In such cases, you\'ll need to create a custom role.',
      'Always review the full list of permissions granted by a role before assignment to ensure it meets your security requirements.',
      '⚠️ Important: Always verify the results and test role assignments in a non-production environment before deploying to production. You are using this tool at your own risk.',
    ],
  },
};
