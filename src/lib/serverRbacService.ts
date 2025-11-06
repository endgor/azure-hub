import { promises as fs } from 'fs';
import path from 'path';
import { CACHE_TTL_MS } from '@/config/constants';
import type { AzureRole, LeastPrivilegeResult, Operation } from '@/types/rbac';

/**
 * Server-side RBAC service for role and permission operations.
 *
 * Benefits over client-side approach:
 * - Keeps 2MB+ of role data on server
 * - Returns only requested data (typically < 50KB)
 * - Shared cache across all users
 * - Faster wildcard matching on server
 */

let rolesCache: AzureRole[] | null = null;
let rolesCacheExpiry = 0;

let actionsCache: Map<string, { name: string; roleCount: number }> | null = null;
let actionsCacheExpiry = 0;

/**
 * Load role definitions from disk with caching
 */
async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'roles-extended.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const roles = JSON.parse(fileContent) as AzureRole[];

    rolesCache = roles;
    rolesCacheExpiry = now + CACHE_TTL_MS;

    return roles;
  } catch (error) {
    throw new Error(`Failed to load role definitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load actions cache from disk
 */
async function loadActionsCache(): Promise<Map<string, { name: string; roleCount: number }>> {
  const now = Date.now();

  if (actionsCache && actionsCacheExpiry > now) {
    return actionsCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'actions-cache.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent) as Array<{ key: string; name: string; roleCount: number }>;

    const cacheMap = new Map<string, { name: string; roleCount: number }>();
    for (const entry of data) {
      cacheMap.set(entry.key, { name: entry.name, roleCount: entry.roleCount });
    }

    actionsCache = cacheMap;
    actionsCacheExpiry = now + CACHE_TTL_MS;

    return cacheMap;
  } catch (error) {
    throw new Error(`Failed to load actions cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if an action matches a pattern (with wildcard support)
 */
function matchesPattern(action: string, pattern: string): boolean {
  const actionLower = action.toLowerCase();
  const patternLower = pattern.toLowerCase();

  if (!patternLower.includes('*')) {
    return actionLower === patternLower;
  }

  const regexPattern = patternLower
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);

  return regex.test(actionLower);
}

/**
 * Calculate least privileged roles for given actions
 */
export async function calculateLeastPrivilege(params: {
  requiredActions: string[];
  requiredDataActions: string[];
}): Promise<LeastPrivilegeResult[]> {
  const { requiredActions, requiredDataActions } = params;
  const roles = await loadRoleDefinitions();

  const matchingRoles: LeastPrivilegeResult[] = [];

  for (const role of roles) {
    let allActionsGranted = true;
    let allDataActionsGranted = true;
    const grantedActions = new Set<string>();
    const grantedDataActions = new Set<string>();

    // Check if role grants all required actions
    for (const requiredAction of requiredActions) {
      let granted = false;

      for (const permission of role.permissions) {
        // Check explicit actions
        for (const action of permission.actions) {
          if (matchesPattern(requiredAction, action)) {
            granted = true;
            grantedActions.add(requiredAction);
            break;
          }
        }

        // Check denied actions
        if (granted && permission.notActions) {
          for (const notAction of permission.notActions) {
            if (matchesPattern(requiredAction, notAction)) {
              granted = false;
              grantedActions.delete(requiredAction);
              break;
            }
          }
        }

        if (granted) break;
      }

      if (!granted) {
        allActionsGranted = false;
        break;
      }
    }

    // Check if role grants all required data actions
    if (requiredDataActions.length > 0) {
      for (const requiredDataAction of requiredDataActions) {
        let granted = false;

        for (const permission of role.permissions) {
          if (permission.dataActions) {
            for (const dataAction of permission.dataActions) {
              if (matchesPattern(requiredDataAction, dataAction)) {
                granted = true;
                grantedDataActions.add(requiredDataAction);
                break;
              }
            }
          }

          if (granted && permission.notDataActions) {
            for (const notDataAction of permission.notDataActions) {
              if (matchesPattern(requiredDataAction, notDataAction)) {
                granted = false;
                grantedDataActions.delete(requiredDataAction);
                break;
              }
            }
          }

          if (granted) break;
        }

        if (!granted) {
          allDataActionsGranted = false;
          break;
        }
      }
    }

    // If role grants all required permissions, add it to results
    if (allActionsGranted && allDataActionsGranted) {
      // Count total permissions in role
      let totalPermissions = 0;

      for (const permission of role.permissions) {
        totalPermissions += permission.actions.length;
        if (permission.dataActions) {
          totalPermissions += permission.dataActions.length;
        }
      }

      // Check if this is an exact match (no extra permissions)
      const isExactMatch =
        grantedActions.size === requiredActions.length &&
        grantedDataActions.size === requiredDataActions.length &&
        totalPermissions === (requiredActions.length + requiredDataActions.length);

      matchingRoles.push({
        role,
        matchingActions: Array.from(grantedActions),
        matchingDataActions: Array.from(grantedDataActions),
        permissionCount: totalPermissions,
        isExactMatch
      });
    }
  }

  // Sort by permission count (lower is better - least privilege)
  return matchingRoles.sort((a, b) => a.permissionCount - b.permissionCount);
}

/**
 * Search operations by query string
 */
export async function searchOperations(query: string, limit: number = 50): Promise<Operation[]> {
  const actionsMap = await loadActionsCache();
  const queryLower = query.toLowerCase();
  const results: Operation[] = [];

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [_key, value] of entries) {
    if (value.name.toLowerCase().includes(queryLower)) {
      results.push({
        name: value.name,
        displayName: value.name,
        description: '',
        origin: '',
        provider: value.name.split('/')[0] || '',
        roleCount: value.roleCount
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get service namespaces
 */
export async function getServiceNamespaces(): Promise<string[]> {
  const actionsMap = await loadActionsCache();
  const namespaces = new Set<string>();

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [, value] of entries) {
    const parts = value.name.split('/');
    if (parts.length >= 2) {
      namespaces.add(parts[0]);
    }
  }

  return Array.from(namespaces).sort();
}

/**
 * Get actions by service namespace
 */
export async function getActionsByService(service: string): Promise<Operation[]> {
  const actionsMap = await loadActionsCache();
  const results: Operation[] = [];

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [, value] of entries) {
    if (value.name.startsWith(service + '/')) {
      results.push({
        name: value.name,
        displayName: value.name,
        description: '',
        origin: '',
        provider: service,
        roleCount: value.roleCount
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get role details by ID
 */
export async function getRoleById(roleId: string): Promise<AzureRole | null> {
  const roles = await loadRoleDefinitions();
  return roles.find(role => role.id === roleId) || null;
}

/**
 * Search roles by name
 */
export async function searchRoles(query: string, limit: number = 50): Promise<AzureRole[]> {
  const roles = await loadRoleDefinitions();
  const queryLower = query.toLowerCase();
  const results: AzureRole[] = [];

  for (const role of roles) {
    if (role.roleName.toLowerCase().includes(queryLower)) {
      results.push(role);
      if (results.length >= limit) break;
    }
  }

  return results;
}
