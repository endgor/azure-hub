import { AzureRole, Operation, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';
import { CACHE_TTL_MS, SEARCH } from '@/config/constants';
import { calculatePermissionCount } from '@/lib/rbacUtils';

let rolesCache: AzureRole[] | null = null;
let rolesCacheExpiry = 0;

let actionsCache: Array<{ key: string; name: string; roleCount: number }> | null = null;
let actionsCacheExpiry = 0;

let actionSetsCache: {
  controlActions: Set<string>;
  dataActions: Set<string>;
  dataActionPrefixes: Set<string>;
  expiry: number;
} | null = null;

export async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  const response = await fetch('/data/roles-extended.json');
  if (!response.ok) {
    throw new Error(`Failed to load role definitions: ${response.statusText}`);
  }

  const roles = await response.json() as AzureRole[];
  rolesCache = roles;
  rolesCacheExpiry = now + CACHE_TTL_MS;

  return roles;
}

export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < SEARCH.MIN_QUERY_LENGTH) {
    return [];
  }

  const actions = await loadActionsIndex();
  const queryLower = query.trim().toLowerCase();
  const operations: Operation[] = [];

  for (const action of actions) {
    if (action.name.toLowerCase().includes(queryLower)) {
      operations.push({
        name: action.name,
        displayName: action.name,
        description: '',
        origin: '',
        provider: action.name.split('/')[0] || '',
        roleCount: action.roleCount
      });
    }

    if (operations.length >= 100) {
      break;
    }
  }

  return operations;
}

export async function getServiceNamespaces(): Promise<string[]> {
  const actions = await loadActionsIndex();
  const namespaces = new Set<string>();

  for (const action of actions) {
    const provider = action.name.split('/')[0];
    if (provider) {
      namespaces.add(provider);
    }
  }

  return Array.from(namespaces).sort();
}

export async function getActionsByService(serviceNamespace: string): Promise<Operation[]> {
  if (!serviceNamespace.trim()) {
    return [];
  }

  const namespace = serviceNamespace.trim().toLowerCase();
  const actions = await loadActionsIndex();

  return actions
    .filter((action) => action.name.toLowerCase().startsWith(`${namespace}/`))
    .map((action) => ({
      name: action.name,
      displayName: action.name,
      description: '',
      origin: '',
      provider: action.name.split('/')[0] || serviceNamespace,
      roleCount: action.roleCount
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function calculateLeastPrivilege(input: LeastPrivilegeInput): Promise<LeastPrivilegeResult[]> {
  const roles = await loadRoleDefinitions();
  return calculateLeastPrivilegeLocally(roles, input);
}

async function getKnownActionSets(): Promise<{
  controlActions: Set<string>;
  dataActions: Set<string>;
  dataActionPrefixes: Set<string>;
}> {
  const now = Date.now();
  if (actionSetsCache && actionSetsCache.expiry > now) {
    return actionSetsCache;
  }

  const roles = await loadRoleDefinitions();
  const controlActions = new Set<string>();
  const dataActions = new Set<string>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (!action.includes('*')) {
          controlActions.add(action.toLowerCase());
        }
      }
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (!dataAction.includes('*')) {
            dataActions.add(dataAction.toLowerCase());
          }
        }
      }
    }
  }

  const dataActionPrefixes = new Set<string>();
  for (const dataAction of dataActions) {
    const lastSlash = dataAction.lastIndexOf('/');
    if (lastSlash > 0) {
      dataActionPrefixes.add(dataAction.substring(0, lastSlash + 1));
    }
  }

  actionSetsCache = {
    controlActions,
    dataActions,
    dataActionPrefixes,
    expiry: now + CACHE_TTL_MS,
  };

  return actionSetsCache;
}

export async function classifyActions(actions: string[]): Promise<{ controlActions: string[]; dataActions: string[] }> {
  const { dataActions: knownDataActions, dataActionPrefixes } = await getKnownActionSets();

  const controlActions: string[] = [];
  const dataActions: string[] = [];

  for (const action of actions) {
    const actionLower = action.toLowerCase();

    if (knownDataActions.has(actionLower)) {
      dataActions.push(action);
      continue;
    }

    if (action.includes('*')) {
      const prefix = actionLower.replace(/\*.*$/, '');
      const isDataAction = [...dataActionPrefixes].some((dataPrefix) =>
        dataPrefix.startsWith(prefix) || prefix.startsWith(dataPrefix)
      );

      if (isDataAction) {
        dataActions.push(action);
      } else {
        controlActions.push(action);
      }

      continue;
    }

    controlActions.push(action);
  }

  return { controlActions, dataActions };
}

export async function preloadActionsCache(): Promise<void> {
  try {
    await loadActionsIndex();
  } catch {
    // Silently fail - on-demand requests will retry.
  }
}

async function loadActionsIndex(): Promise<Array<{ key: string; name: string; roleCount: number }>> {
  const now = Date.now();

  if (actionsCache && actionsCacheExpiry > now) {
    return actionsCache;
  }

  const response = await fetch('/data/actions-index.json');
  if (!response.ok) {
    throw new Error(`Failed to load actions index: ${response.statusText}`);
  }

  const actions = await response.json() as Array<{ key: string; name: string; roleCount: number }>;
  actionsCache = actions;
  actionsCacheExpiry = now + CACHE_TTL_MS;

  return actions;
}

type MatchSpecificity = 'exact' | 'narrowWildcard' | 'broadWildcard' | 'fullWildcard';

const MATCH_SPECIFICITY_RANK: Record<MatchSpecificity, number> = {
  exact: 0,
  narrowWildcard: 1,
  broadWildcard: 2,
  fullWildcard: 3,
};

interface MatchBreakdown {
  exact: number;
  narrowWildcard: number;
  broadWildcard: number;
  fullWildcard: number;
}

interface RankedLeastPrivilegeResult extends LeastPrivilegeResult {
  matchBreakdown: MatchBreakdown;
}

function matchesPattern(action: string, pattern: string): boolean {
  const actionLower = action.toLowerCase();
  const patternLower = pattern.toLowerCase();

  if (!patternLower.includes('*')) {
    return actionLower === patternLower;
  }

  const regexPattern = patternLower
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');

  return new RegExp(`^${regexPattern}$`).test(actionLower);
}

function getMatchSpecificity(requiredAction: string, grantedPattern: string): MatchSpecificity | null {
  if (!matchesPattern(requiredAction, grantedPattern)) {
    return null;
  }

  const requiredLower = requiredAction.toLowerCase();
  const patternLower = grantedPattern.toLowerCase();

  if (patternLower === requiredLower) {
    return 'exact';
  }

  if (patternLower === '*') {
    return 'fullWildcard';
  }

  if (patternLower === '*/read') {
    return 'broadWildcard';
  }

  return 'narrowWildcard';
}

function findBestGrantedMatch(
  requiredPermission: string,
  allowPatterns: string[],
  denyPatterns: string[]
): MatchSpecificity | null {
  let bestSpecificity: MatchSpecificity | null = null;

  for (const allowed of allowPatterns) {
    const specificity = getMatchSpecificity(requiredPermission, allowed);
    if (!specificity) {
      continue;
    }

    const isDenied = denyPatterns.some((denied) => matchesPattern(requiredPermission, denied));
    if (isDenied) {
      continue;
    }

    if (!bestSpecificity || MATCH_SPECIFICITY_RANK[specificity] < MATCH_SPECIFICITY_RANK[bestSpecificity]) {
      bestSpecificity = specificity;
      if (bestSpecificity === 'exact') {
        break;
      }
    }
  }

  return bestSpecificity;
}

function evaluateRequiredPermissions(params: {
  rolePermissions: AzureRole['permissions'];
  requiredPermissions: string[];
  type: 'action' | 'dataAction';
  grantedList: Set<string>;
  breakdown: MatchBreakdown;
}): boolean {
  const { rolePermissions, requiredPermissions, type, grantedList, breakdown } = params;

  for (const requiredPermission of requiredPermissions) {
    let bestMatchForRequired: MatchSpecificity | null = null;

    for (const permission of rolePermissions) {
      const allowPatterns = type === 'action' ? permission.actions : (permission.dataActions || []);
      const denyPatterns = type === 'action' ? permission.notActions : (permission.notDataActions || []);
      const candidateMatch = findBestGrantedMatch(requiredPermission, allowPatterns, denyPatterns);

      if (!candidateMatch) {
        continue;
      }

      if (
        !bestMatchForRequired ||
        MATCH_SPECIFICITY_RANK[candidateMatch] < MATCH_SPECIFICITY_RANK[bestMatchForRequired]
      ) {
        bestMatchForRequired = candidateMatch;
        if (bestMatchForRequired === 'exact') {
          break;
        }
      }
    }

    if (!bestMatchForRequired) {
      return false;
    }

    grantedList.add(requiredPermission);
    breakdown[bestMatchForRequired] += 1;
  }

  return true;
}

function countRolePermissionEntries(rolePermissions: AzureRole['permissions']): number {
  let total = 0;

  for (const permission of rolePermissions) {
    total += permission.actions.length;
    total += (permission.dataActions || []).length;
  }

  return total;
}

function calculateLeastPrivilegeLocally(roles: AzureRole[], input: LeastPrivilegeInput): LeastPrivilegeResult[] {
  const requiredActions = input.requiredActions || [];
  const requiredDataActions = input.requiredDataActions || [];
  const requiredPermissionTotal = requiredActions.length + requiredDataActions.length;
  const matchingRoles: RankedLeastPrivilegeResult[] = [];

  for (const role of roles) {
    const grantedActions = new Set<string>();
    const grantedDataActions = new Set<string>();
    const matchBreakdown: MatchBreakdown = {
      exact: 0,
      narrowWildcard: 0,
      broadWildcard: 0,
      fullWildcard: 0
    };

    const allActionsGranted = evaluateRequiredPermissions({
      rolePermissions: role.permissions,
      requiredPermissions: requiredActions,
      type: 'action',
      grantedList: grantedActions,
      breakdown: matchBreakdown
    });
    if (!allActionsGranted) {
      continue;
    }

    const allDataActionsGranted = evaluateRequiredPermissions({
      rolePermissions: role.permissions,
      requiredPermissions: requiredDataActions,
      type: 'dataAction',
      grantedList: grantedDataActions,
      breakdown: matchBreakdown
    });
    if (!allDataActionsGranted) {
      continue;
    }

    const totalPermissionEntries = countRolePermissionEntries(role.permissions);
    const permissionCount = role.permissionCount ?? calculatePermissionCount(role);
    const isExactMatch =
      matchBreakdown.exact === requiredPermissionTotal &&
      totalPermissionEntries === requiredPermissionTotal;

    matchingRoles.push({
      role,
      matchingActions: Array.from(grantedActions),
      matchingDataActions: Array.from(grantedDataActions),
      permissionCount,
      isExactMatch,
      matchBreakdown
    });
  }

  return matchingRoles
    .sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;

      if (a.matchBreakdown.fullWildcard !== b.matchBreakdown.fullWildcard) {
        return a.matchBreakdown.fullWildcard - b.matchBreakdown.fullWildcard;
      }

      if (a.matchBreakdown.broadWildcard !== b.matchBreakdown.broadWildcard) {
        return a.matchBreakdown.broadWildcard - b.matchBreakdown.broadWildcard;
      }

      if (a.matchBreakdown.narrowWildcard !== b.matchBreakdown.narrowWildcard) {
        return a.matchBreakdown.narrowWildcard - b.matchBreakdown.narrowWildcard;
      }

      if (a.matchBreakdown.exact !== b.matchBreakdown.exact) {
        return b.matchBreakdown.exact - a.matchBreakdown.exact;
      }

      if (a.permissionCount !== b.permissionCount) {
        return a.permissionCount - b.permissionCount;
      }

      return a.role.roleName.localeCompare(b.role.roleName);
    })
    .map(({ matchBreakdown: _matchBreakdown, ...result }) => result);
}
