/**
 * Shared RBAC utilities (Node-safe, no browser APIs)
 * Can be imported by both client code and build scripts
 */

/**
 * Minimal role permission interface for permission counting.
 * Compatible with both client and script role definitions.
 */
interface RolePermission {
  actions: string[];
  notActions: string[];
  dataActions?: string[];
  notDataActions?: string[];
}

/**
 * Minimal role interface for permission counting.
 * Compatible with both client and script role definitions.
 */
interface RoleWithPermissions {
  permissions: RolePermission[];
}

/**
 * Calculates a weighted permission count for an Azure role.
 * Used to rank roles by privilege level (lower count = more restrictive = least privilege).
 *
 * Scoring system:
 * - Full wildcard (*): 10,000 points (maximum privilege)
 * - Partial wildcard (e.g., Microsoft.Storage/*): 100-1,000 points based on scope
 * - Specific action: 1 point (minimal privilege)
 * - notActions/notDataActions: -0.5 points each (denies reduce privilege)
 *
 * @param role - Azure RBAC role definition (must have permissions property)
 * @returns Weighted permission count (minimum 0)
 *
 * @example
 * const count = calculatePermissionCount(ownerRole); // ~10000
 * const count = calculatePermissionCount(readerRole); // ~100
 */
export function calculatePermissionCount(role: RoleWithPermissions): number {
  let count = 0;

  for (const permission of role.permissions) {
    for (const action of permission.actions) {
      if (action === '*') {
        count += 10000; // Full wildcard: maximum privilege
      } else if (action.includes('*')) {
        const parts = action.split('/');
        // Broader wildcards score higher (e.g., 'Microsoft.Storage/*' > 'Microsoft.Storage/storageAccounts/*/read')
        count += Math.max(100, 1000 / parts.length);
      } else {
        count += 1; // Specific permission: minimal privilege
      }
    }

    count -= permission.notActions.length * 0.5; // Denies reduce privilege

    if (permission.dataActions) {
      for (const dataAction of permission.dataActions) {
        if (dataAction === '*') {
          count += 10000;
        } else if (dataAction.includes('*')) {
          const parts = dataAction.split('/');
          count += Math.max(100, 1000 / parts.length);
        } else {
          count += 1;
        }
      }
    }

    if (permission.notDataActions) {
      count -= permission.notDataActions.length * 0.5;
    }
  }

  return Math.max(0, count);
}
