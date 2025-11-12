/**
 * Least privilege role calculator for Azure RBAC.
 * Pure business logic for finding roles that satisfy given actions.
 */

import type { LeastPrivilegeResult } from '@/types/rbac';
import { matchesPattern } from './rbacPatternMatcher';
import { loadRoleDefinitions } from './rbacDataLoader';

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
