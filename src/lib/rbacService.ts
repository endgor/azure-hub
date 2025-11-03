import { AzureRole, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';

/**
 * Check if a permission action matches a wildcard pattern
 * Case-insensitive matching with support for Azure RBAC wildcards
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
 * Check if a role has a specific permission (action or dataAction)
 */
function checkPermissionAccess(
  role: AzureRole,
  required: string,
  type: 'action' | 'dataAction'
): boolean {
  for (const permission of role.permissions) {
    let hasAccess = false;

    const allowList = type === 'action' ? permission.actions : (permission.dataActions || []);
    const denyList = type === 'action' ? permission.notActions : (permission.notDataActions || []);

    for (const allowed of allowList) {
      if (matchesWildcard(allowed, required)) {
        hasAccess = true;
        break;
      }
    }

    if (hasAccess) {
      for (const denied of denyList) {
        if (matchesWildcard(denied, required)) {
          hasAccess = false;
          break;
        }
      }
    }

    if (hasAccess) return true;
  }

  return false;
}

export function hasPermission(role: AzureRole, requiredAction: string): boolean {
  return checkPermissionAccess(role, requiredAction, 'action');
}

export function hasDataPermission(role: AzureRole, requiredDataAction: string): boolean {
  return checkPermissionAccess(role, requiredDataAction, 'dataAction');
}

/**
 * Calculate permission count to rank roles by privilege level
 * Lower count = more restrictive = least privileged
 */
export function calculatePermissionCount(role: AzureRole): number {
  let count = 0;

  for (const permission of role.permissions) {
    for (const action of permission.actions) {
      if (action === '*') {
        count += 10000;
      } else if (action.includes('*')) {
        const parts = action.split('/');
        count += Math.max(100, 1000 / parts.length);
      } else {
        count += 1;
      }
    }

    count -= permission.notActions.length * 0.5;

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

export function getServiceFromPermission(permission: string): string {
  if (!permission) return '';
  const parts = permission.split('/');
  return parts[0] || '';
}

/**
 * Calculate least privileged roles that satisfy required permissions
 * Returns roles sorted by permission count (least privileged first)
 */
export function calculateLeastPrivilegedRoles(
  roles: AzureRole[],
  input: LeastPrivilegeInput
): LeastPrivilegeResult[] {
  const results: LeastPrivilegeResult[] = [];

  for (const role of roles) {
    const matchingActions: string[] = [];
    const matchingDataActions: string[] = [];

    let hasAllActions = true;
    for (const requiredAction of input.requiredActions) {
      if (hasPermission(role, requiredAction)) {
        matchingActions.push(requiredAction);
      } else {
        hasAllActions = false;
        break;
      }
    }

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

    if (hasAllActions && hasAllDataActions) {
      const permissionCount = role.permissionCount || calculatePermissionCount(role);

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

  results.sort((a, b) => {
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    return a.permissionCount - b.permissionCount;
  });

  return results;
}

/**
 * Extract unique service namespaces with case-insensitive deduplication
 */
export function extractServiceNamespaces(roles: AzureRole[]): string[] {
  const namespaceMap = new Map<string, string>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        const namespace = getServiceFromPermission(action);
        if (namespace && namespace !== '*') {
          const lowercaseKey = namespace.toLowerCase();

          if (!namespaceMap.has(lowercaseKey)) {
            namespaceMap.set(lowercaseKey, namespace);
          } else {
            const existing = namespaceMap.get(lowercaseKey)!;
            if (namespace.charAt(0) === namespace.charAt(0).toUpperCase() &&
                existing.charAt(0) === existing.charAt(0).toLowerCase()) {
              namespaceMap.set(lowercaseKey, namespace);
            }
          }
        }
      }
    }
  }

  return Array.from(namespaceMap.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}
