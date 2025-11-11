/**
 * Least privilege role calculator for Entra ID.
 * Main business logic for finding roles that satisfy given permissions.
 */

import {
  EntraIDRole,
  EntraIDLeastPrivilegeInput,
  EntraIDLeastPrivilegeResult
} from '@/types/rbac';
import { hasEntraIDPermission } from './permissionMatcher';
import { calculateEntraIDNamespaceRelevance } from './scoring';
import { calculateEntraIDPermissionCount } from '@/lib/entraIdScoringUtils';
import { loadEntraIDRoles } from './dataService';

/**
 * Finds Entra ID roles that satisfy all required permissions, ranked by privilege level.
 * Returns roles sorted by least privileged first (exact matches prioritized).
 *
 * Ranking logic:
 * 1. Exact matches first (roles with only the required permissions)
 * 2. Namespace relevance (higher = more specific to the domain)
 * 3. Permission count (lower = more restrictive)
 */
export function calculateLeastPrivilegedEntraIDRoles(
  roles: EntraIDRole[],
  input: EntraIDLeastPrivilegeInput
): EntraIDLeastPrivilegeResult[] {
  const results: EntraIDLeastPrivilegeResult[] = [];

  for (const role of roles) {
    // Skip disabled roles
    if (!role.isEnabled) {
      continue;
    }

    const matchingActions: string[] = [];

    // Check if role has all required actions
    let hasAllActions = true;
    for (const requiredAction of input.requiredActions) {
      if (hasEntraIDPermission(role, requiredAction)) {
        matchingActions.push(requiredAction);
      } else {
        hasAllActions = false;
        break;
      }
    }

    // Only include roles that satisfy all requirements
    if (hasAllActions) {
      const permissionCount = role.permissionCount || calculateEntraIDPermissionCount(role);

      // Detect exact matches
      const isExactMatch =
        matchingActions.length === input.requiredActions.length &&
        permissionCount === input.requiredActions.length;

      results.push({
        role,
        matchingActions,
        permissionCount,
        isExactMatch
      });
    }
  }

  // Sort by: exact matches first, then relevance, then permission count
  results.sort((a, b) => {
    // Exact matches always come first
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;

    // Calculate namespace relevance
    const relevanceA = calculateEntraIDNamespaceRelevance(a.role, input.requiredActions);
    const relevanceB = calculateEntraIDNamespaceRelevance(b.role, input.requiredActions);

    // Higher relevance = better match (descending)
    if (relevanceA !== relevanceB) {
      return relevanceB - relevanceA;
    }

    // If relevance is equal, use permission count (ascending)
    return a.permissionCount - b.permissionCount;
  });

  return results;
}

/**
 * Calculates least privileged Entra ID roles for given permissions.
 * Wrapper that loads roles and delegates to calculation logic.
 */
export async function calculateLeastPrivilegeEntraID(
  input: EntraIDLeastPrivilegeInput
): Promise<EntraIDLeastPrivilegeResult[]> {
  const roles = await loadEntraIDRoles();
  return calculateLeastPrivilegedEntraIDRoles(roles, input);
}
