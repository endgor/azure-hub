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
 * Checks if a role has a specific permission using Azure RBAC allow/deny logic.
 * Algorithm:
 * 1. Check if permission matches any pattern in allow list
 * 2. If matched, check if it's explicitly denied in deny list
 * 3. Deny overrides allow (follows Azure RBAC semantics)
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

    // Step 1: Check allow list
    for (const allowed of allowList) {
      if (matchesWildcard(allowed, required)) {
        hasAccess = true;
        break;
      }
    }

    // Step 2: Check deny list (deny overrides allow)
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

/** Checks if role has a specific action permission (control plane operation) */
export function hasPermission(role: AzureRole, requiredAction: string): boolean {
  return checkPermissionAccess(role, requiredAction, 'action');
}

/** Checks if role has a specific data action permission (data plane operation) */
export function hasDataPermission(role: AzureRole, requiredDataAction: string): boolean {
  return checkPermissionAccess(role, requiredDataAction, 'dataAction');
}

/**
 * Calculates weighted permission score to rank roles by privilege level.
 * Lower score = more restrictive = least privileged.
 *
 * Scoring system:
 * - Full wildcard ('*'): 10,000 points (highest privilege)
 * - Partial wildcards (e.g., 'Microsoft.Storage/*'): 100-1000 points
 *   (inversely proportional to specificity: fewer segments = higher score)
 * - Exact permissions: 1 point each
 * - Deny rules (notActions/notDataActions): -0.5 points each (reduces privilege)
 *
 * This heuristic helps identify roles with narrower permissions.
 */
export function calculatePermissionCount(role: AzureRole): number {
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

/**
 * Extracts service namespace from Azure permission string.
 * Example: "Microsoft.Storage/storageAccounts/read" -> "Microsoft.Storage"
 */
export function getServiceFromPermission(permission: string): string {
  if (!permission) return '';
  const parts = permission.split('/');
  return parts[0] || '';
}

/**
 * Finds roles that satisfy all required permissions, ranked by privilege level.
 * Returns roles sorted by least privileged first (exact matches prioritized).
 *
 * Filtering logic:
 * 1. Role must have ALL required actions (control plane permissions)
 * 2. Role must have ALL required data actions (data plane permissions), if specified
 * 3. Roles are ranked by permission score (lower = more restrictive)
 * 4. Exact matches (roles with only required permissions) appear first
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

      // Detect exact matches (role has only the required permissions, no extras)
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

  // Sort: exact matches first, then by permission count (ascending)
  results.sort((a, b) => {
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    return a.permissionCount - b.permissionCount;
  });

  return results;
}

/**
 * Extracts unique service namespaces from all roles with case-insensitive deduplication.
 * Prefers canonical casing (PascalCase) for display consistency.
 *
 * Example: If both "Microsoft.Storage" and "microsoft.storage" exist,
 * returns "Microsoft.Storage" (uppercase first letter preferred).
 *
 * Used to populate service filter dropdowns in UI.
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
            // Prefer PascalCase (uppercase first letter) for canonical display
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
