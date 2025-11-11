/**
 * Search operations for Azure RBAC actions and service namespaces.
 * Provides functions to search operations and extract service namespaces.
 */

import type { Operation } from '@/types/rbac';
import { loadActionsCache } from './rbacDataLoader';

/**
 * Search operations by query string
 */
export async function searchOperations(query: string, limit: number = 50): Promise<Operation[]> {
  const actionsMap = await loadActionsCache();
  const queryLower = query.toLowerCase();
  const results: Operation[] = [];

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [_key, value] of entries) {
    if (value.name.toLowerCase().includes(queryLower)) {
      results.push({
        name: value.name,
        displayName: value.name,
        description: '',
        origin: '',
        provider: value.name.split('/')[0] || '',
        roleCount: value.roleCount
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get service namespaces
 */
export async function getServiceNamespaces(): Promise<string[]> {
  const actionsMap = await loadActionsCache();
  const namespaces = new Set<string>();

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [, value] of entries) {
    const parts = value.name.split('/');
    if (parts.length >= 2) {
      namespaces.add(parts[0]);
    }
  }

  return Array.from(namespaces).sort();
}

/**
 * Get actions by service namespace
 */
export async function getActionsByService(service: string): Promise<Operation[]> {
  const actionsMap = await loadActionsCache();
  const results: Operation[] = [];

  // Convert Map entries to array for iteration (ES5 compatibility)
  const entries = Array.from(actionsMap.entries());
  for (const [, value] of entries) {
    if (value.name.startsWith(service + '/')) {
      results.push({
        name: value.name,
        displayName: value.name,
        description: '',
        origin: '',
        provider: service,
        roleCount: value.roleCount
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
