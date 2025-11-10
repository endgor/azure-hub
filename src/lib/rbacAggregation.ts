import type { AzureRole } from '@/types/rbac';
import { matchesWildcard } from './utils/wildcardMatcher';

/** Tracks casing variants for each lowercased action key. */
export type ActionCasingMap = Map<string, Map<string, number>>;

/** Tracks which roles explicitly grant an action. */
export type ExplicitActionRolesMap = Map<string, Set<number>>;

/** Representation of a wildcard action/dataAction grant on a role. */
export interface WildcardPattern {
  pattern: string;
  roleIndex: number;
  notActions: string[];
  notDataActions: string[];
}

/**
 * Collect explicit (non-wildcard) actions and their metadata from Azure roles.
 * Records casing variants to determine canonical names and role membership for each action.
 */
export function collectExplicitActionMetadata(roles: AzureRole[]): {
  actionCasingMap: ActionCasingMap;
  explicitActionRoles: ExplicitActionRolesMap;
} {
  const explicitActionRoles: ExplicitActionRolesMap = new Map();
  const actionCasingMap: ActionCasingMap = new Map();

  for (let roleIndex = 0; roleIndex < roles.length; roleIndex++) {
    const role = roles[roleIndex];
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.includes('*')) continue;

        const lowerAction = action.toLowerCase();

        if (!actionCasingMap.has(lowerAction)) {
          actionCasingMap.set(lowerAction, new Map());
        }
        const casingVariants = actionCasingMap.get(lowerAction)!;
        casingVariants.set(action, (casingVariants.get(action) || 0) + 1);

        if (!explicitActionRoles.has(lowerAction)) {
          explicitActionRoles.set(lowerAction, new Set());
        }
        explicitActionRoles.get(lowerAction)!.add(roleIndex);
      }

      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (dataAction.includes('*')) continue;

          const lowerAction = dataAction.toLowerCase();

          if (!actionCasingMap.has(lowerAction)) {
            actionCasingMap.set(lowerAction, new Map());
          }
          const casingVariants = actionCasingMap.get(lowerAction)!;
          casingVariants.set(dataAction, (casingVariants.get(dataAction) || 0) + 1);

          if (!explicitActionRoles.has(lowerAction)) {
            explicitActionRoles.set(lowerAction, new Set());
          }
          explicitActionRoles.get(lowerAction)!.add(roleIndex);
        }
      }
    }
  }

  return { actionCasingMap, explicitActionRoles };
}

/**
 * Collect wildcard allow patterns and their corresponding deny lists for each role.
 * Includes both control plane actions and data plane actions.
 */
export function collectWildcardPatterns(roles: AzureRole[]): WildcardPattern[] {
  const wildcardPatterns: WildcardPattern[] = [];

  for (let roleIndex = 0; roleIndex < roles.length; roleIndex++) {
    const role = roles[roleIndex];
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.includes('*')) {
          wildcardPatterns.push({
            pattern: action,
            roleIndex,
            notActions: permission.notActions,
            notDataActions: permission.notDataActions || []
          });
        }
      }

      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (dataAction.includes('*')) {
            wildcardPatterns.push({
              pattern: dataAction,
              roleIndex,
              notActions: permission.notActions,
              notDataActions: permission.notDataActions || []
            });
          }
        }
      }
    }
  }

  return wildcardPatterns;
}

/**
 * Build an actions map by combining explicit actions with wildcard matches per role.
 * Resolves canonical casing and counts all roles that grant each action.
 */
export function buildActionsMap(
  actionCasingMap: ActionCasingMap,
  explicitActionRoles: ExplicitActionRolesMap,
  wildcardPatterns: WildcardPattern[]
): Map<string, { name: string; roleCount: number }> {
  const actionsMap = new Map<string, { name: string; roleCount: number }>();

  for (const [lowerAction, casingVariants] of Array.from(actionCasingMap.entries())) {
    let canonicalName = '';
    let maxCount = 0;

    for (const [casing, count] of Array.from(casingVariants.entries())) {
      if (count > maxCount) {
        maxCount = count;
        canonicalName = casing;
      }
    }

    const roleSet = new Set(explicitActionRoles.get(lowerAction) || []);

    for (const { pattern, roleIndex, notActions, notDataActions } of wildcardPatterns) {
      if (matchesWildcard(pattern, canonicalName)) {
        let isDenied = false;

        for (const deniedAction of notActions) {
          if (matchesWildcard(deniedAction, canonicalName)) {
            isDenied = true;
            break;
          }
        }

        if (!isDenied) {
          for (const deniedDataAction of notDataActions) {
            if (matchesWildcard(deniedDataAction, canonicalName)) {
              isDenied = true;
              break;
            }
          }
        }

        if (!isDenied) {
          roleSet.add(roleIndex);
        }
      }
    }

    actionsMap.set(lowerAction, { name: canonicalName, roleCount: roleSet.size });
  }

  return actionsMap;
}
