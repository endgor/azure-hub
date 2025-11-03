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
 * Search for operations by keyword
 * Searches in name, displayName, and description
 */
export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const permissions = await loadPermissions();
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
