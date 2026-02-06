/**
 * Entra ID Roles Calculator Configuration
 *
 * All Entra ID-specific strings, scenarios, and UI configuration.
 * Scenarios are validated against Microsoft's "Least Privileged Roles by Task" documentation.
 */

import type { RoleSystemConfig } from './types';

export const entraIdConfig: RoleSystemConfig = {
  systemType: 'entraid',
  systemName: 'Entra ID Roles',

  labels: {
    heroTitle: 'Entra ID Roles Calculator',
    categoryLabel: 'Identity & Access',
    serviceLabel: 'Select Namespace',
    actionLabel: 'Permissions',
    searchPlaceholder: 'Search for permissions...',
    roleExplorerTitle: 'Entra ID Built-in Roles',
    roleExplorerPlaceholder: 'Search roles (e.g., User Administrator, Application Administrator)',
    roleSystemHelpText:
      'Entra ID roles control access to directory objects (users, groups, applications, etc.)',
  },

  modes: {
    available: ['simple', 'advanced', 'roleExplorer'],
    default: 'simple',
  },

  descriptions: {
    simple:
      'Find the least privileged Entra ID role for your required permissions. Enter Microsoft directory permissions and discover which built-in roles grant those permissions without excessive access.',
    advanced:
      'Find the least privileged Entra ID role for your required permissions. Enter Microsoft directory permissions and discover which built-in roles grant those permissions without excessive access.',
    roleExplorer:
      'Search and explore Entra ID built-in roles by name. View detailed permissions, compare multiple roles side-by-side, and export role definitions for documentation or analysis.',
  },

  examples: [
    {
      label: 'Create App Registrations',
      description: 'Register and manage new applications',
      actions: [
        'microsoft.directory/applications/createAsOwner',
        'microsoft.directory/applications/credentials/update',
      ],
    },
    {
      label: 'Reset User Passwords',
      description: 'Reset passwords for non-admin users',
      actions: ['microsoft.directory/users/password/update'],
    },
    {
      label: 'Manage Users',
      description: 'Create, update, and delete user accounts',
      actions: [
        'microsoft.directory/users/create',
        'microsoft.directory/users/delete',
        'microsoft.directory/users/basic/update',
      ],
    },
    {
      label: 'Manage Groups',
      description: 'Create and manage security & Microsoft 365 groups',
      actions: [
        'microsoft.directory/groups/create',
        'microsoft.directory/groups/delete',
        'microsoft.directory/groups/basic/update',
        'microsoft.directory/groups/members/update',
      ],
    },
    {
      label: 'Read Directory Data',
      description: 'View users, groups, and applications (read-only)',
      actions: [
        'microsoft.directory/users/standard/read',
        'microsoft.directory/groups/standard/read',
        'microsoft.directory/applications/standard/read',
      ],
    },
    {
      label: 'Manage Group Membership',
      description: 'Add and remove users from groups',
      actions: [
        'microsoft.directory/groups/members/update',
        'microsoft.directory/users/memberOf/read',
      ],
    },
    {
      label: 'Manage Enterprise Apps',
      description: 'Create and configure service principals',
      actions: [
        'microsoft.directory/servicePrincipals/create',
        'microsoft.directory/servicePrincipals/basic/update',
        'microsoft.directory/servicePrincipals/appRoleAssignedTo/update',
      ],
    },
  ],

  placeholders: {
    advancedMode:
      'microsoft.directory/users/password/update\nmicrosoft.directory/users/create\nmicrosoft.directory/groups/create',
    wildcardExample: 'microsoft.directory/users/*',
  },

  metadata: {
    title: 'Entra ID Roles Calculator - Find Least Privilege Directory Roles',
    description:
      'Find the least privileged Microsoft Entra ID role for managing directory objects like users, groups, and applications. Search by permissions to discover built-in roles that grant access without excessive privileges.',
    keywords: [
      'Entra ID roles calculator',
      'directory roles',
      'Azure AD roles',
      'least privilege directory access',
      'entra id least privilege',
      'Entra ID permissions',
      'identity roles',
      'Microsoft Entra ID',
      'Azure AD RBAC',
      'directory role assignment',
      'Entra ID access control'
    ],
    breadcrumbs: [
      { name: 'Home', url: 'https://azurehub.org/' },
      {
        name: 'Entra ID Roles Calculator',
        url: 'https://azurehub.org/tools/entraid-roles-calculator/',
      },
    ],
    toolSchemaName: 'Entra ID Roles Calculator',
  },

  disclaimer: {
    description:
      'This tool helps you find built-in roles in Microsoft Entra ID that provide the least privilege for a specific set of directory permissions. It searches through Entra ID\'s built-in role definitions and ranks them by relevance to your required permissions.',
    points: [
      'Only built-in roles are searched. Custom directory roles are not included in the search results.',
      'Role ranking is based on permission relevance and scope, not on risk assessment or privilege level beyond basic categorization.',
      'Some permissions may not be available in any built-in role. In such cases, you\'ll need to create a custom directory role.',
      'Always review the full list of permissions granted by a role before assignment to ensure it meets your security requirements.',
      '⚠️ Important: Always verify the results and test role assignments in a non-production environment before deploying to production. You are using this tool at your own risk.',
    ],
  },
};
