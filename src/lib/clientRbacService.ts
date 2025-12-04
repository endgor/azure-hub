import { AzureRole, Operation, LeastPrivilegeInput, LeastPrivilegeResult, ActionPlaneType } from '@/types/rbac';
import { calculateLeastPrivilegedRoles, extractServiceNamespaces } from './rbacService';
import { CACHE_TTL_MS, SEARCH } from '@/config/constants';
import { collectExplicitActionMetadata, collectWildcardPatterns, buildActionsMap } from './rbacAggregation';

let rolesCache: AzureRole[] | null = null;
let permissionsCache: Operation[] | null = null;
let actionsMapCache: Map<string, { name: string; roleCount: number }> | null = null;
let rolesCacheExpiry = 0;
let permissionsCacheExpiry = 0;
let actionsMapCacheExpiry = 0;

function createOperationFromAction(
  actionName: string,
  roleCount: number,
  planeType: ActionPlaneType = 'control'
): Operation {
  const parts = actionName.split('/');
  const provider = parts[0] || '';
  const resource = parts.slice(1, -1).join('/') || '';
  const operation = parts[parts.length - 1] || '';

  return {
    name: actionName,
    displayName: `${operation} ${resource}`.trim() || actionName,
    description: `Used by ${roleCount} role${roleCount > 1 ? 's' : ''}`,
    provider,
    roleCount,
    planeType
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
    rolesCacheExpiry = now + CACHE_TTL_MS;

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
    permissionsCacheExpiry = now + CACHE_TTL_MS;

    return permissions;
  } catch (error) {
    console.warn('Failed to load permissions:', error);
    return [];
  }
}

async function loadActionsCache(): Promise<Map<string, { name: string; roleCount: number }> | null> {
  try {
    const response = await fetch('/data/actions-cache.json');
    if (!response.ok) {
      return null;
    }

    const cacheArray = await response.json() as Array<{ key: string; name: string; roleCount: number }>;
    const cacheMap = new Map<string, { name: string; roleCount: number }>();

    for (const entry of cacheArray) {
      cacheMap.set(entry.key, { name: entry.name, roleCount: entry.roleCount });
    }

    return cacheMap;
  } catch (error) {
    console.warn('Failed to load pre-computed actions cache, will compute at runtime:', error);
    return null;
  }
}

async function extractActionsFromRoles(): Promise<Map<string, { name: string; roleCount: number }>> {
  const now = Date.now();

  if (actionsMapCache && actionsMapCacheExpiry > now) {
    return actionsMapCache;
  }

  const precomputedCache = await loadActionsCache();
  if (precomputedCache) {
    actionsMapCache = precomputedCache;
    actionsMapCacheExpiry = now + CACHE_TTL_MS;
    return precomputedCache;
  }

  console.warn('Pre-computed actions cache not available, computing at runtime (this may take a few seconds)...');

  const roles = await loadRoleDefinitions();
  const { actionCasingMap, explicitActionRoles } = collectExplicitActionMetadata(roles);
  const wildcardPatterns = collectWildcardPatterns(roles);
  const actionsMap = buildActionsMap(actionCasingMap, explicitActionRoles, wildcardPatterns);

  actionsMapCache = actionsMap;
  actionsMapCacheExpiry = now + CACHE_TTL_MS;

  return actionsMap;
}

export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < SEARCH.MIN_QUERY_LENGTH) {
    return [];
  }

  const roles = await loadRoleDefinitions();
  const queryLower = query.toLowerCase();

  const controlActions = new Map<string, { name: string; roleCount: number }>();
  const dataActions = new Map<string, { name: string; roleCount: number }>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.includes('*')) continue;
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes(queryLower)) {
          const existing = controlActions.get(lowerAction);
          if (existing) {
            existing.roleCount++;
          } else {
            controlActions.set(lowerAction, { name: action, roleCount: 1 });
          }
        }
      }

      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (dataAction.includes('*')) continue;
          const lowerAction = dataAction.toLowerCase();
          if (lowerAction.includes(queryLower)) {
            const existing = dataActions.get(lowerAction);
            if (existing) {
              existing.roleCount++;
            } else {
              dataActions.set(lowerAction, { name: dataAction, roleCount: 1 });
            }
          }
        }
      }
    }
  }

  const results: Operation[] = [];

  for (const [, actionData] of Array.from(controlActions.entries())) {
    results.push(createOperationFromAction(actionData.name, actionData.roleCount, 'control'));
  }

  for (const [, actionData] of Array.from(dataActions.entries())) {
    results.push(createOperationFromAction(actionData.name, actionData.roleCount, 'data'));
  }

  return results.sort((a, b) => {
    const aCount = a.roleCount ?? 0;
    const bCount = b.roleCount ?? 0;
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

  const roles = await loadRoleDefinitions();
  const namespaceLower = serviceNamespace.toLowerCase();

  const controlActions = new Map<string, { name: string; roleCount: number }>();
  const dataActions = new Map<string, { name: string; roleCount: number }>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.includes('*')) continue;
        const lowerAction = action.toLowerCase();
        if (lowerAction.startsWith(namespaceLower + '/')) {
          const existing = controlActions.get(lowerAction);
          if (existing) {
            existing.roleCount++;
          } else {
            controlActions.set(lowerAction, { name: action, roleCount: 1 });
          }
        }
      }

      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (dataAction.includes('*')) continue;
          const lowerAction = dataAction.toLowerCase();
          if (lowerAction.startsWith(namespaceLower + '/')) {
            const existing = dataActions.get(lowerAction);
            if (existing) {
              existing.roleCount++;
            } else {
              dataActions.set(lowerAction, { name: dataAction, roleCount: 1 });
            }
          }
        }
      }
    }
  }

  const results: Operation[] = [];

  for (const [, actionData] of Array.from(controlActions.entries())) {
    results.push(createOperationFromAction(actionData.name, actionData.roleCount, 'control'));
  }

  for (const [, actionData] of Array.from(dataActions.entries())) {
    results.push(createOperationFromAction(actionData.name, actionData.roleCount, 'data'));
  }

  return results.sort((a, b) => {
    if (a.planeType !== b.planeType) {
      return a.planeType === 'control' ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export async function calculateLeastPrivilege(input: LeastPrivilegeInput): Promise<LeastPrivilegeResult[]> {
  const roles = await loadRoleDefinitions();
  return calculateLeastPrivilegedRoles(roles, input);
}

export async function classifyActions(actions: string[]): Promise<{ controlActions: string[]; dataActions: string[] }> {
  const roles = await loadRoleDefinitions();

  const allControlActions = new Set<string>();
  const allDataActions = new Set<string>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (!action.includes('*')) {
          allControlActions.add(action.toLowerCase());
        }
      }
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (!dataAction.includes('*')) {
            allDataActions.add(dataAction.toLowerCase());
          }
        }
      }
    }
  }

  const controlActions: string[] = [];
  const dataActions: string[] = [];

  for (const action of actions) {
    const actionLower = action.toLowerCase();
    if (allDataActions.has(actionLower)) {
      dataActions.push(action);
    } else {
      controlActions.push(action);
    }
  }

  return { controlActions, dataActions };
}

export async function preloadActionsCache(): Promise<void> {
  try {
    await extractActionsFromRoles();
  } catch (error) {
    console.warn('Failed to preload actions cache:', error);
  }
}
