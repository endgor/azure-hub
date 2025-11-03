import { AzureRole, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';

/**
 * Check if a permission action matches a wildcard pattern
 * Handles Azure RBAC wildcard patterns (e.g., "Microsoft.Compute/ *" or "* /read")
 * Case-insensitive matching
 */
export function matchesWildcard(pattern: string, action: string): boolean {
  if (!pattern || !action) return false;

  // Normalize to lowercase for case-insensitive matching
  const normalizedPattern = pattern.toLowerCase();
  const normalizedAction = action.toLowerCase();

  // Exact match
  if (normalizedPattern === normalizedAction) return true;

  // Full wildcard
  if (normalizedPattern === '*') return true;

  // Convert wildcard pattern to regex
  // Escape special regex characters except *
  const regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*/g, '.*'); // Replace * with .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedAction);
}

/**
 * Check if a role has a specific permission
 * Takes into account both actions and notActions
 */
export function hasPermission(role: AzureRole, requiredAction: string): boolean {
  let hasAccess = false;

  // Check if any of the role's actions grant this permission
  for (const permission of role.permissions) {
    // Check actions
    for (const action of permission.actions) {
      if (matchesWildcard(action, requiredAction)) {
        hasAccess = true;
        break;
      }
    }

    // If granted, check if it's explicitly denied in notActions
    if (hasAccess) {
      for (const notAction of permission.notActions) {
        if (matchesWildcard(notAction, requiredAction)) {
          hasAccess = false;
          break;
        }
      }
    }

    if (hasAccess) break;
  }

  return hasAccess;
}

/**
 * Check if a role has a specific data action permission
 */
export function hasDataPermission(role: AzureRole, requiredDataAction: string): boolean {
  let hasAccess = false;

  for (const permission of role.permissions) {
    // Check dataActions
    if (permission.dataActions) {
      for (const dataAction of permission.dataActions) {
        if (matchesWildcard(dataAction, requiredDataAction)) {
          hasAccess = true;
          break;
        }
      }
    }

    // If granted, check if it's explicitly denied in notDataActions
    if (hasAccess && permission.notDataActions) {
      for (const notDataAction of permission.notDataActions) {
        if (matchesWildcard(notDataAction, requiredDataAction)) {
          hasAccess = false;
          break;
        }
      }
    }

    if (hasAccess) break;
  }

  return hasAccess;
}

/**
 * Calculate the total number of permissions granted by a role
 * This helps rank roles by "least privileged" (fewer permissions = more restrictive)
 */
export function calculatePermissionCount(role: AzureRole): number {
  let count = 0;

  for (const permission of role.permissions) {
    // Count actions
    for (const action of permission.actions) {
      if (action === '*') {
        // Full wildcard - this is a very permissive role
        count += 10000;
      } else if (action.includes('*')) {
        // Partial wildcard - estimate based on scope
        const parts = action.split('/');
        // More specific wildcards get lower counts
        count += Math.max(100, 1000 / parts.length);
      } else {
        // Specific action
        count += 1;
      }
    }

    // Subtract for notActions (they restrict permissions)
    count -= permission.notActions.length * 0.5;

    // Count dataActions
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

    // Subtract for notDataActions
    if (permission.notDataActions) {
      count -= permission.notDataActions.length * 0.5;
    }
  }

  return Math.max(0, count);
}

/**
 * Extract the service namespace from a permission
 * e.g., "Microsoft.Compute/virtualMachines/read" -> "Microsoft.Compute"
 */
export function getServiceFromPermission(permission: string): string {
  if (!permission) return '';

  const parts = permission.split('/');
  return parts[0] || '';
}

/**
 * Get a friendly display name for a service namespace
 */
export function getServiceDisplayName(namespace: string): string {
  if (!namespace) return '';

  // Remove "Microsoft." prefix for cleaner display
  const name = namespace.replace(/^Microsoft\./, '');

  // Add spaces before capital letters for better readability
  return name.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Calculate the least privileged roles that satisfy the required permissions
 * Returns roles sorted by permission count (ascending - least privileged first)
 */
export function calculateLeastPrivilegedRoles(
  roles: AzureRole[],
  input: LeastPrivilegeInput
): LeastPrivilegeResult[] {
  const results: LeastPrivilegeResult[] = [];

  for (const role of roles) {
    const matchingActions: string[] = [];
    const matchingDataActions: string[] = [];

    // Check if role has all required actions
    let hasAllActions = true;
    for (const requiredAction of input.requiredActions) {
      if (hasPermission(role, requiredAction)) {
        matchingActions.push(requiredAction);
      } else {
        hasAllActions = false;
        break;
      }
    }

    // Check if role has all required data actions
    let hasAllDataActions = true;
    if (input.requiredDataActions && input.requiredDataActions.length > 0) {
      for (const requiredDataAction of input.requiredDataActions) {
        if (hasDataPermission(role, requiredDataAction)) {
          matchingDataActions.push(requiredDataAction);
        } else {
          hasAllDataActions = false;
          break;
        }
      }
    }

    // Only include roles that satisfy all requirements
    if (hasAllActions && hasAllDataActions) {
      const permissionCount = role.permissionCount || calculatePermissionCount(role);

      // Check if this is an exact match (role grants only what's required)
      const isExactMatch =
        matchingActions.length === input.requiredActions.length &&
        matchingDataActions.length === (input.requiredDataActions?.length || 0) &&
        permissionCount === (input.requiredActions.length + (input.requiredDataActions?.length || 0));

      results.push({
        role,
        matchingActions,
        matchingDataActions,
        permissionCount,
        isExactMatch
      });
    }
  }

  // Sort by permission count (ascending) - least privileged first
  results.sort((a, b) => {
    // Exact matches should appear first
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;

    // Then sort by permission count
    return a.permissionCount - b.permissionCount;
  });

  return results;
}

/**
 * Get all unique service namespaces from a list of roles
 */
export function extractServiceNamespaces(roles: AzureRole[]): string[] {
  const namespaces = new Set<string>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        const namespace = getServiceFromPermission(action);
        if (namespace && namespace !== '*') {
          namespaces.add(namespace);
        }
      }
    }
  }

  return Array.from(namespaces).sort();
}
