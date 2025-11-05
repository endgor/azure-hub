import { AzureRole, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';
import { calculatePermissionCount } from './rbacUtils';
import { RBAC_SCORING } from '@/config/constants';
import { matchesWildcard } from './utils/wildcardMatcher';

// Re-export for external consumers
export { calculatePermissionCount, matchesWildcard };

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
 * Extracts service namespace from Azure permission string.
 * Example: "Microsoft.Storage/storageAccounts/read" -> "Microsoft.Storage"
 */
export function getServiceFromPermission(permission: string): string {
  if (!permission) return '';
  const parts = permission.split('/');
  return parts[0] || '';
}

/**
 * Calculates namespace relevance score for a role based on required permissions.
 * Higher score = more relevant to the specific namespace of required permissions.
 *
 * Scoring:
 * - Actions matching the exact namespace: +100 points per action
 * - Actions with broader wildcards (e.g., asterisk/read): -50 points penalty
 * - Role name matching namespace: +200 bonus
 *
 * This helps prioritize domain-specific roles (e.g., "Billing Reader" for billing permissions)
 * over generic broad roles (e.g., "Reader" with asterisk/read).
 */
function calculateNamespaceRelevance(role: AzureRole, requiredActions: string[]): number {
  let relevanceScore = 0;

  // Extract unique namespaces from required actions
  const requiredNamespaces = new Set(
    requiredActions
      .filter(a => a && !a.startsWith('*'))
      .map(a => getServiceFromPermission(a))
      .filter(ns => ns)
  );

  if (requiredNamespaces.size === 0) {
    return 0; // No specific namespace to match
  }

  // Check role actions for namespace matches
  for (const permission of role.permissions) {
    for (const action of permission.actions) {
      if (action === '*' || action === '*/read') {
        // Penalize overly broad wildcards
        relevanceScore -= RBAC_SCORING.BROAD_WILDCARD_PENALTY;
      } else {
        const actionNamespace = getServiceFromPermission(action);
        if (requiredNamespaces.has(actionNamespace)) {
          // Bonus for matching the required namespace
          relevanceScore += RBAC_SCORING.NAMESPACE_MATCH_BONUS;
        }
      }
    }
  }

  // Bonus if role name mentions the namespace
  const roleName = role.roleName.toLowerCase();
  const namespaceArray = Array.from(requiredNamespaces);
  for (const namespace of namespaceArray) {
    const namespaceParts = namespace.toLowerCase().split('.');
    // Check if any part of namespace appears in role name
    if (namespaceParts.some(part => part.length > RBAC_SCORING.MIN_NAMESPACE_PART_LENGTH && roleName.includes(part))) {
      relevanceScore += RBAC_SCORING.ROLE_NAME_MATCH_BONUS;
    }
  }

  return relevanceScore;
}

/**
 * Finds roles that satisfy all required permissions, ranked by privilege level.
 * Returns roles sorted by least privileged first (exact matches prioritized).
 *
 * Ranking logic (in order of priority):
 * 1. Exact matches first (roles with only the required permissions)
 * 2. Namespace relevance (higher = more specific to the domain)
 * 3. Permission count (lower = more restrictive)
 *
 * This ensures domain-specific roles (e.g., "Billing Reader") rank higher than
 * generic broad roles (e.g., "Reader" with asterisk/read) when searching for specific permissions.
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

  // Sort with improved ranking:
  // 1. Exact matches first
  // 2. Then by namespace relevance (higher is better)
  // 3. Finally by permission count (lower is better)
  const allRequiredActions = [...input.requiredActions, ...(input.requiredDataActions || [])];

  results.sort((a, b) => {
    // Exact matches always come first
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;

    // Calculate namespace relevance for both roles
    const relevanceA = calculateNamespaceRelevance(a.role, allRequiredActions);
    const relevanceB = calculateNamespaceRelevance(b.role, allRequiredActions);

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
