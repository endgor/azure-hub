/**
 * Data loading for Entra ID roles and the action map derived from them.
 */

import { EntraIDRole } from '@/types/rbac';
import { cachedJson } from '@/lib/cachedJson';

const NO_ROLES: EntraIDRole[] = [];

/** Derived from the roles array, so it is keyed on that array's identity. */
let entraIdActionsMapCache: {
  roles: EntraIDRole[];
  actions: Map<string, { name: string; roleCount: number }>;
} | null = null;

type EntraIdRolesDataStatus = 'unknown' | 'missing' | 'available';
let entraIdRolesDataStatus: EntraIdRolesDataStatus = 'unknown';

export function getEntraIDRolesDataStatus(): EntraIdRolesDataStatus {
  return entraIdRolesDataStatus;
}

/**
 * Loads Entra ID role definitions with extended metadata.
 * The file is only present when the build had Graph credentials, so a 404 is
 * a normal "no data" state rather than an error.
 */
export async function loadEntraIDRoles(): Promise<EntraIDRole[]> {
  const roles = await cachedJson<EntraIDRole[]>('/data/entraid-roles.json', { allowNotFound: true });
  if (!roles) {
    entraIdRolesDataStatus = 'missing';
    return NO_ROLES;
  }
  entraIdRolesDataStatus = 'available';
  return roles;
}

/**
 * Extracts unique service namespaces from all Entra ID roles.
 * Returns namespaces like "microsoft.directory", "microsoft.azure", etc.
 */
export async function getEntraIDNamespaces(): Promise<string[]> {
  const roles = await loadEntraIDRoles();
  const namespaceSet = new Set<string>();

  for (const role of roles) {
    for (const permission of role.rolePermissions) {
      for (const action of permission.allowedResourceActions) {
        const namespace = action.split('/')[0];
        if (namespace && namespace !== '*') {
          namespaceSet.add(namespace);
        }
      }
    }
  }

  return Array.from(namespaceSet).sort();
}

/**
 * Extracts all unique actions from Entra ID roles.
 * Returns a map of action name to role count (how many roles grant this action).
 */
export async function extractActionsFromEntraIDRoles(): Promise<Map<string, { name: string; roleCount: number }>> {
  const roles = await loadEntraIDRoles();
  if (entraIdActionsMapCache && entraIdActionsMapCache.roles === roles) {
    return entraIdActionsMapCache.actions;
  }

  const actionsMap = new Map<string, { name: string; roleCount: number }>();

  for (const role of roles) {
    if (!role.isEnabled) continue;

    for (const permission of role.rolePermissions) {
      for (const action of permission.allowedResourceActions) {
        // Include all actions, including wildcards (e.g., allEntities/allTasks)
        // Many Entra ID services only have wildcard-style permissions
        const key = action.toLowerCase();
        const existing = actionsMap.get(key);

        if (existing) {
          existing.roleCount++;
        } else {
          actionsMap.set(key, {
            name: action,
            roleCount: 1
          });
        }
      }
    }
  }

  entraIdActionsMapCache = { roles, actions: actionsMap };

  return actionsMap;
}

/**
 * Gets all actions for a specific Entra ID namespace.
 * Example: "microsoft.directory" returns all directory actions
 */
export async function getEntraIDActionsByNamespace(namespace: string): Promise<string[]> {
  const actionsMap = await extractActionsFromEntraIDRoles();
  const results: string[] = [];
  const namespaceLower = namespace.toLowerCase();

  for (const [key, actionData] of Array.from(actionsMap.entries())) {
    if (key.startsWith(namespaceLower + '/')) {
      results.push(actionData.name);
    }
  }

  return results.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * Searches Entra ID actions by query string.
 * Returns actions matching the query in name or namespace.
 */
export async function searchEntraIDActions(query: string): Promise<string[]> {
  if (query.length < 2) {
    return [];
  }

  const actionsMap = await extractActionsFromEntraIDRoles();
  const results: string[] = [];
  const queryLower = query.toLowerCase();

  for (const [, actionData] of Array.from(actionsMap.entries())) {
    if (actionData.name.toLowerCase().includes(queryLower)) {
      results.push(actionData.name);
    }
  }

  return results
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .slice(0, 100); // Limit to 100 results
}

/**
 * Pre-loads and caches the Entra ID actions map in the background.
 */
export async function preloadEntraIDActionsCache(): Promise<void> {
  try {
    await extractActionsFromEntraIDRoles();
  } catch {
    // Silently fail - cache will be computed on demand
  }
}
