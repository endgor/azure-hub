/**
 * Scoring and ranking utilities for Entra ID roles.
 * Provides functions to calculate namespace relevance and privilege scores.
 */

import { EntraIDRole } from '@/types/rbac';

/**
 * Calculates namespace relevance for an Entra ID role.
 * Higher score = role is more specific to the requested actions.
 *
 * Example: "User Administrator" gets high score for microsoft.directory/users/* actions
 */
export function calculateEntraIDNamespaceRelevance(role: EntraIDRole, requiredActions: string[]): number {
  let relevanceScore = 0;

  // Extract unique namespaces from required actions
  const requiredNamespaces = new Set(
    requiredActions.map(action => {
      const parts = action.split('/');
      return parts[0]; // e.g., "microsoft.directory"
    })
  );

  // Check role's allowed actions for namespace matches
  for (const permission of role.rolePermissions) {
    for (const allowedAction of permission.allowedResourceActions) {
      // Broad wildcard penalty
      if (allowedAction === '*' || allowedAction === '*/') {
        relevanceScore -= 50;
        continue;
      }

      // Check namespace match
      const actionNamespace = allowedAction.split('/')[0];
      if (requiredNamespaces.has(actionNamespace)) {
        relevanceScore += 100;
      }
    }
  }

  // Bonus for role name matching namespace
  const roleNameLower = role.displayName.toLowerCase();
  for (const action of requiredActions) {
    const parts = action.split('/');
    if (parts.length >= 2) {
      const resourceType = parts[1]; // e.g., "users", "groups", "applications"
      if (roleNameLower.includes(resourceType)) {
        relevanceScore += 200;
        break;
      }
    }
  }

  return relevanceScore;
}
