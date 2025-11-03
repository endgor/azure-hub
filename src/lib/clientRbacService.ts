import { AzureRole, Operation, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';
import { calculateLeastPrivilegedRoles, extractServiceNamespaces } from './rbacService';

let rolesCache: AzureRole[] | null = null;
let permissionsCache: Operation[] | null = null;
let rolesCacheExpiry = 0;
let permissionsCacheExpiry = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * Parse action name into a friendly Operation object
 */
function createOperationFromAction(actionName: string, roleCount: number): Operation {
  const parts = actionName.split('/');
  const provider = parts[0] || '';
  const resource = parts.slice(1, -1).join('/') || '';
  const operation = parts[parts.length - 1] || '';

  return {
    name: actionName,
    displayName: `${operation} ${resource}`.trim() || actionName,
    description: `Used by ${roleCount} role${roleCount > 1 ? 's' : ''}`,
    provider
  };
}

export async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  try {
    const response = await fetch('/data/roles-extended.json');
    if (!response.ok) {
      throw new Error(`Failed to load role definitions: ${response.statusText}`);
    }

    const roles = await response.json() as AzureRole[];
    rolesCache = roles;
    rolesCacheExpiry = now + CACHE_TTL;

    return roles;
  } catch (error) {
    throw new Error(`Failed to load role definitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function loadPermissions(): Promise<Operation[]> {
  const now = Date.now();

  if (permissionsCache && permissionsCacheExpiry > now) {
    return permissionsCache;
  }

  try {
    const response = await fetch('/data/permissions.json');
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Permissions file not found - search functionality will be limited');
        return [];
      }
      throw new Error(`Failed to load permissions: ${response.statusText}`);
    }

    const permissions = await response.json() as Operation[];
    permissionsCache = permissions;
    permissionsCacheExpiry = now + CACHE_TTL;

    return permissions;
  } catch (error) {
    console.warn('Failed to load permissions:', error);
    return [];
  }
}

/**
 * Extract all unique actions from roles (fallback when permissions.json unavailable)
 */
async function extractActionsFromRoles(): Promise<Map<string, { name: string; roleCount: number }>> {
  const roles = await loadRoleDefinitions();
  const actionsMap = new Map<string, { name: string; roleCount: number }>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (!action.includes('*')) {
          const existing = actionsMap.get(action);
          if (existing) {
            existing.roleCount++;
          } else {
            actionsMap.set(action, { name: action, roleCount: 1 });
          }
        }
      }

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

export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const permissions = await loadPermissions();

  if (permissions.length > 0) {
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

  const actionsMap = await extractActionsFromRoles();
  const queryLower = query.toLowerCase();
  const results: Operation[] = [];

  for (const [actionName, actionData] of Array.from(actionsMap.entries())) {
    if (actionName.toLowerCase().includes(queryLower)) {
      results.push(createOperationFromAction(actionName, actionData.roleCount));
    }
  }

  return results.sort((a, b) => {
    const aCount = parseInt(a.description?.match(/\d+/)?.[0] || '0');
    const bCount = parseInt(b.description?.match(/\d+/)?.[0] || '0');
    return bCount - aCount;
  });
}

export async function getServiceNamespaces(): Promise<string[]> {
  const roles = await loadRoleDefinitions();
  return extractServiceNamespaces(roles);
}

export async function getActionsByService(serviceNamespace: string): Promise<Operation[]> {
  if (!serviceNamespace) {
    return [];
  }

  const actionsMap = await extractActionsFromRoles();
  const namespaceLower = serviceNamespace.toLowerCase();
  const results: Operation[] = [];

  for (const [actionName, actionData] of Array.from(actionsMap.entries())) {
    if (actionName.toLowerCase().startsWith(namespaceLower + '/')) {
      results.push(createOperationFromAction(actionName, actionData.roleCount));
    }
  }

  return results.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export async function calculateLeastPrivilege(input: LeastPrivilegeInput): Promise<LeastPrivilegeResult[]> {
  const roles = await loadRoleDefinitions();
  return calculateLeastPrivilegedRoles(roles, input);
}
