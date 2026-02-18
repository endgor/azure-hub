/**
 * File system operations and data loading for server-side RBAC.
 * Handles loading role definitions and actions cache from disk with caching.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { CACHE_TTL_MS } from '@/config/constants';
import type { AzureRole } from '@/types/rbac';

let rolesCache: AzureRole[] | null = null;
let rolesCacheExpiry = 0;

let actionsCache: Map<string, { name: string; roleCount: number }> | null = null;
let actionsCacheExpiry = 0;

/**
 * Load role definitions from disk with caching
 */
export async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'roles-extended.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const roles = JSON.parse(fileContent) as AzureRole[];

    rolesCache = roles;
    rolesCacheExpiry = now + CACHE_TTL_MS;

    return roles;
  } catch (error) {
    throw new Error(`Failed to load role definitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load actions cache from disk
 */
export async function loadActionsCache(): Promise<Map<string, { name: string; roleCount: number }>> {
  const now = Date.now();

  if (actionsCache && actionsCacheExpiry > now) {
    return actionsCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'actions-index.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent) as Array<{ key: string; name: string; roleCount: number }>;

    const cacheMap = new Map<string, { name: string; roleCount: number }>();
    for (const entry of data) {
      cacheMap.set(entry.key, { name: entry.name, roleCount: entry.roleCount });
    }

    actionsCache = cacheMap;
    actionsCacheExpiry = now + CACHE_TTL_MS;

    return cacheMap;
  } catch (error) {
    throw new Error(`Failed to load actions cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get role details by ID
 */
export async function getRoleById(roleId: string): Promise<AzureRole | null> {
  const roles = await loadRoleDefinitions();
  return roles.find(role => role.id === roleId) || null;
}

/**
 * Search roles by name
 */
export async function searchRoles(query: string, limit: number = 50): Promise<AzureRole[]> {
  const roles = await loadRoleDefinitions();
  const queryLower = query.toLowerCase();
  const results: AzureRole[] = [];

  for (const role of roles) {
    if (role.roleName.toLowerCase().includes(queryLower)) {
      results.push(role);
      if (results.length >= limit) break;
    }
  }

  return results;
}
