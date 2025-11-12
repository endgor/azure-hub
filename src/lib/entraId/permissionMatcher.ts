/**
 * Permission matching and wildcard pattern support for Entra ID roles.
 * Handles checking if a role has specific permissions.
 */

import { EntraIDRole } from '@/types/rbac';
import { matchesWildcard } from '@/lib/rbacService';

/**
 * Checks if an Entra ID role has a specific permission.
 * Supports wildcard matching for resource actions.
 *
 * Example patterns:
 * - microsoft.directory/users/password/update (exact match)
 * - microsoft.directory/* (all directory actions)
 * - microsoft.directory/users/* (all user actions)
 */
export function hasEntraIDPermission(role: EntraIDRole, requiredAction: string): boolean {
  for (const permission of role.rolePermissions) {
    // Check allowed actions
    for (const allowedAction of permission.allowedResourceActions) {
      if (matchesWildcard(allowedAction, requiredAction)) {
        // Also check it's not in excluded actions
        const isExcluded = permission.excludedResourceActions?.some(
          excluded => matchesWildcard(excluded, requiredAction)
        ) || false;

        if (!isExcluded) {
          return true;
        }
      }
    }
  }

  return false;
}
