import { EntraIDRole } from '@/types/rbac';

/**
 * Shared Entra ID permission scoring logic.
 * Used by both the build-time script (fetchEntraIdRoles.ts)
 * and runtime client code (entraIdRbacService.ts).
 *
 * Calculates total permission count for an Entra ID role.
 * Used for privilege scoring (lower is more restrictive).
 *
 * Scoring weights:
 * - Full wildcard (*): 10,000 points (extremely broad)
 * - Wildcard patterns: 100 points per wildcard segment
 * - Specific actions: 1 point each
 * - Excluded actions: subtract points (they restrict the role)
 *
 * @param role - The Entra ID role to score
 * @returns Permission count score (minimum 1)
 */
export function calculateEntraIDPermissionCount(role: EntraIDRole): number {
  let count = 0;

  for (const permission of role.rolePermissions) {
    for (const action of permission.allowedResourceActions) {
      if (action === '*') {
        count += 10000;
      } else if (action.includes('*')) {
        // Count wildcard segments
        const segments = action.split('/').filter(s => s === '*').length;
        count += 100 * segments;
      } else {
        count += 1;
      }
    }

    // Subtract points for excluded actions (they restrict the role)
    if (permission.excludedResourceActions) {
      for (const excluded of permission.excludedResourceActions) {
        if (excluded === '*') {
          count -= 1000;
        } else if (excluded.includes('*')) {
          count -= 10;
        } else {
          count -= 1;
        }
      }
    }
  }

  return Math.max(count, 1); // Minimum of 1
}
