import { AzureRole, Operation, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';
import { calculateLeastPrivilegedRoles, extractServiceNamespaces } from './rbacService';

// Client-side cache
let rolesCache: AzureRole[] | null = null;
let permissionsCache: Operation[] | null = null;
let rolesCacheExpiry = 0;
let permissionsCacheExpiry = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Load Azure role definitions from static file
 */
export async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  // Check if cache is valid
  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  try {
    const response = await fetch('/data/roles-extended.json');
    if (!response.ok) {
      throw new Error(`Failed to load role definitions: ${response.statusText}`);
    }

    const roles = await response.json() as AzureRole[];

    // Cache the results
    rolesCache = roles;
    rolesCacheExpiry = now + CACHE_TTL;

    return roles;
  } catch (error) {
    throw new Error(`Failed to load role definitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load Azure permissions (operations) from static file
 */
export async function loadPermissions(): Promise<Operation[]> {
  const now = Date.now();

  // Check if cache is valid
  if (permissionsCache && permissionsCacheExpiry > now) {
    return permissionsCache;
  }

  try {
    const response = await fetch('/data/permissions.json');
    if (!response.ok) {
      // Permissions file is optional, return empty array if not found
      if (response.status === 404) {
        console.warn('Permissions file not found - search functionality will be limited');
        return [];
      }
      throw new Error(`Failed to load permissions: ${response.statusText}`);
    }

    const permissions = await response.json() as Operation[];

    // Cache the results
    permissionsCache = permissions;
    permissionsCacheExpiry = now + CACHE_TTL;

    return permissions;
  } catch (error) {
    console.warn('Failed to load permissions:', error);
    return [];
  }
}

/**
 * Extract all unique actions from roles
 * This is used when permissions.json is not available
 */
async function extractActionsFromRoles(): Promise<Map<string, { name: string; roleCount: number }>> {
  const roles = await loadRoleDefinitions();
  const actionsMap = new Map<string, { name: string; roleCount: number }>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      // Add actions
      for (const action of permission.actions) {
        // Skip wildcards for search
        if (!action.includes('*')) {
          const existing = actionsMap.get(action);
          if (existing) {
            existing.roleCount++;
          } else {
            actionsMap.set(action, { name: action, roleCount: 1 });
          }
        }
      }

      // Add dataActions
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (!dataAction.includes('*')) {
            const existing = actionsMap.get(dataAction);
            if (existing) {
              existing.roleCount++;
            } else {
              actionsMap.set(dataAction, { name: dataAction, roleCount: 1 });
            }
          }
        }
      }
    }
  }

  return actionsMap;
}

/**
 * Search for operations by keyword
 * Searches in action names extracted from roles
 */
export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Try to load from permissions file first
  const permissions = await loadPermissions();

  if (permissions.length > 0) {
    // If we have permissions data, use it
    const queryLower = query.toLowerCase();
    return permissions.filter(operation => {
      const nameLower = operation.name.toLowerCase();
      const displayNameLower = operation.displayName?.toLowerCase() || '';
      const descriptionLower = operation.description?.toLowerCase() || '';

      return (
        nameLower.includes(queryLower) ||
        displayNameLower.includes(queryLower) ||
        descriptionLower.includes(queryLower)
      );
    });
  }

  // Fallback: extract actions from roles
  const actionsMap = await extractActionsFromRoles();
  const queryLower = query.toLowerCase();
  const results: Operation[] = [];

  // Convert Map to array for iteration
  const actionsArray = Array.from(actionsMap.entries());

  for (const [actionName, actionData] of actionsArray) {
    if (actionName.toLowerCase().includes(queryLower)) {
      // Parse action to create a friendly display name
      const parts = actionName.split('/');
      const provider = parts[0] || '';
      const resource = parts.slice(1, -1).join('/') || '';
      const operation = parts[parts.length - 1] || '';

      results.push({
        name: actionName,
        displayName: `${operation} ${resource}`.trim() || actionName,
        description: `Used by ${actionData.roleCount} role${actionData.roleCount > 1 ? 's' : ''}`,
        provider
      });
    }
  }

  // Sort by role count (more popular actions first)
  return results.sort((a, b) => {
    const aCount = parseInt(a.description?.match(/\d+/)?.[0] || '0');
    const bCount = parseInt(b.description?.match(/\d+/)?.[0] || '0');
    return bCount - aCount;
  });
}

/**
 * Get all unique service namespaces from roles
 */
export async function getServiceNamespaces(): Promise<string[]> {
  const roles = await loadRoleDefinitions();
  return extractServiceNamespaces(roles);
}

/**
 * Filter roles by service namespace
 */
export async function filterRolesByService(serviceNamespace: string): Promise<AzureRole[]> {
  if (!serviceNamespace) {
    return [];
  }

  const roles = await loadRoleDefinitions();
  const namespaceLower = serviceNamespace.toLowerCase();

  return roles.filter(role => {
    // Check if role has any actions matching this service namespace
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.toLowerCase().startsWith(namespaceLower)) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * Calculate least privileged roles for given actions
 */
export async function calculateLeastPrivilege(input: LeastPrivilegeInput): Promise<LeastPrivilegeResult[]> {
  const roles = await loadRoleDefinitions();
  return calculateLeastPrivilegedRoles(roles, input);
}

/**
 * Search roles by name or description
 */
export async function searchRoles(query: string): Promise<AzureRole[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const roles = await loadRoleDefinitions();
  const queryLower = query.toLowerCase();

  return roles.filter(role => {
    const nameLower = role.roleName?.toLowerCase() || '';
    const descriptionLower = role.description?.toLowerCase() || '';

    return (
      nameLower.includes(queryLower) ||
      descriptionLower.includes(queryLower)
    );
  });
}

/**
 * Get a specific role by ID
 */
export async function getRoleById(roleId: string): Promise<AzureRole | null> {
  const roles = await loadRoleDefinitions();
  return roles.find(role => role.id === roleId) || null;
}

/**
 * Get roles by type (BuiltInRole or CustomRole)
 */
export async function getRolesByType(roleType: 'BuiltInRole' | 'CustomRole'): Promise<AzureRole[]> {
  const roles = await loadRoleDefinitions();
  return roles.filter(role => role.roleType === roleType);
}
