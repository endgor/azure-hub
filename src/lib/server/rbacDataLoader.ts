/**
 * File system operations and data loading for server-side RBAC.
 * Handles loading role definitions and actions cache from disk with caching.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { CACHE_TTL_MS } from '@/config/constants';
import type { AzureRole } from '@/types/rbac';

interface LoadOptions {
  baseUrl?: string;
}

let rolesCache: AzureRole[] | null = null;
let rolesCacheExpiry = 0;

let actionsCache: Map<string, { name: string; roleCount: number }> | null = null;
let actionsCacheExpiry = 0;

interface CloudflareAssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

function getCloudflareAssetsBinding(): CloudflareAssetsBinding | null {
  const globalScope = globalThis as typeof globalThis & {
    ASSETS?: CloudflareAssetsBinding;
    [key: symbol]: unknown;
  };
  const context = globalScope[Symbol.for('__cloudflare-context__')] as
    | { env?: { ASSETS?: CloudflareAssetsBinding } }
    | undefined;

  return context?.env?.ASSETS ?? globalScope.ASSETS ?? null;
}

async function loadJsonAssetFromCloudflare<T>(assetPath: string): Promise<T | null> {
  try {
    const assets = getCloudflareAssetsBinding();

    if (!assets) {
      return null;
    }

    const response = await assets.fetch(new URL(assetPath, 'https://assets.local'));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${assetPath} from Cloudflare assets: ${response.status}`);
    }

    return await response.json() as T;
  } catch {
    return null;
  }
}

async function loadJsonAsset<T>(assetPath: string, options?: LoadOptions): Promise<T> {
  const cloudflareAsset = await loadJsonAssetFromCloudflare<T>(assetPath);
  if (cloudflareAsset) {
    return cloudflareAsset;
  }

  if (options?.baseUrl) {
    const response = await fetch(new URL(assetPath, options.baseUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${assetPath}: ${response.status}`);
    }
    return await response.json() as T;
  }

  const dataPath = path.join(process.cwd(), 'public', ...assetPath.replace(/^\/+/, '').split('/'));
  const fileContent = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(fileContent) as T;
}

/**
 * Load role definitions from disk with caching
 */
export async function loadRoleDefinitions(options?: LoadOptions): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  try {
    const roles = await loadJsonAsset<AzureRole[]>('/data/roles-extended.json', options);

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
export async function loadActionsCache(options?: LoadOptions): Promise<Map<string, { name: string; roleCount: number }>> {
  const now = Date.now();

  if (actionsCache && actionsCacheExpiry > now) {
    return actionsCache;
  }

  try {
    const data = await loadJsonAsset<Array<{ key: string; name: string; roleCount: number }>>(
      '/data/actions-index.json',
      options
    );

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
export async function getRoleById(roleId: string, options?: LoadOptions): Promise<AzureRole | null> {
  const roles = await loadRoleDefinitions(options);
  return roles.find(role => role.id === roleId) || null;
}

/**
 * Search roles by name
 */
export async function searchRoles(query: string, limit: number = 50, options?: LoadOptions): Promise<AzureRole[]> {
  const roles = await loadRoleDefinitions(options);
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
