/**
 * Least privilege role calculator for Azure RBAC.
 * Pure business logic for finding roles that satisfy given actions.
 */

import type { LeastPrivilegeResult } from '@/types/rbac';
import { matchesPattern } from './rbacPatternMatcher';
import { loadRoleDefinitions } from './rbacDataLoader';
import { calculatePermissionCount } from '@/lib/rbacUtils';

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

/**
 * Classifies how broadly a permission pattern grants access for a matched action.
 * Lower specificity rank means less privilege and should be ranked first.
 */
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

/**
 * Finds the most specific non-denied matching pattern for a required permission.
 */
function findBestGrantedMatch(
  requiredPermission: string,
  allowPatterns: string[],
  denyPatterns: string[]
): MatchSpecificity | null {
  let bestSpecificity: MatchSpecificity | null = null;

  for (const allowed of allowPatterns) {
    const specificity = getMatchSpecificity(requiredPermission, allowed);
    if (!specificity) continue;

    const isDenied = denyPatterns.some(denied => matchesPattern(requiredPermission, denied));
    if (isDenied) continue;

    if (
      !bestSpecificity ||
      MATCH_SPECIFICITY_RANK[specificity] < MATCH_SPECIFICITY_RANK[bestSpecificity]
    ) {
      bestSpecificity = specificity;
      if (bestSpecificity === 'exact') {
        break;
      }
    }
  }

  return bestSpecificity;
}

/**
 * Evaluates required permissions and records match specificity details.
 */
function evaluateRequiredPermissions(params: {
  rolePermissions: Array<{
    actions: string[];
    notActions: string[];
    dataActions?: string[];
    notDataActions?: string[];
  }>;
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
      if (!candidateMatch) continue;

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

function countRolePermissionEntries(rolePermissions: Array<{
  actions: string[];
  dataActions?: string[];
}>): number {
  let total = 0;

  for (const permission of rolePermissions) {
    total += permission.actions.length;
    total += (permission.dataActions || []).length;
  }

  return total;
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

  const matchingRoles: RankedLeastPrivilegeResult[] = [];
  const requiredPermissionTotal = requiredActions.length + requiredDataActions.length;

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
    if (!allActionsGranted) continue;

    const allDataActionsGranted = evaluateRequiredPermissions({
      rolePermissions: role.permissions,
      requiredPermissions: requiredDataActions,
      type: 'dataAction',
      grantedList: grantedDataActions,
      breakdown: matchBreakdown
    });
    if (!allDataActionsGranted) continue;

    // If role grants all required permissions, add it to results
    const totalPermissionEntries = countRolePermissionEntries(role.permissions);
    const weightedPermissionCount = role.permissionCount ?? calculatePermissionCount(role);

    // Exact match means all required permissions are granted explicitly and role has no extras.
    const isExactMatch =
      matchBreakdown.exact === requiredPermissionTotal &&
      totalPermissionEntries === requiredPermissionTotal;

    matchingRoles.push({
      role,
      matchingActions: Array.from(grantedActions),
      matchingDataActions: Array.from(grantedDataActions),
      permissionCount: weightedPermissionCount,
      isExactMatch,
      matchBreakdown
    });
  }

  // Sort by least privilege:
  // 1. Exact matches first
  // 2. Fewer broad/full wildcard grants for required permissions
  // 3. More explicit matches for required permissions
  // 4. Lower weighted permission count
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
