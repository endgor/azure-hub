import { promises as fs } from 'fs';
import path from 'path';
import type { AzureIpAddress } from '../types/azure';
import { CACHE_TTL_MS } from '@/config/constants';
import {
  lookupIpInIndex,
  prepareIpLookupIndex,
  searchIpIndex,
  type IpLookupIndexFile,
  type PreparedIpLookupIndex
} from './ipLookupIndex';

/**
 * Server-side IP lookups for /api/ipLookup. Everything is answered from the
 * pre-built lookup index; the raw multi-megabyte cloud files are never read here.
 */

export interface SearchOptions {
  region?: string;
  service?: string;
}

export interface ServerDataLoadOptions {
  baseUrl?: string;
}

const INDEX_PATH = '/data/ip-lookup-index.json';

let indexCache: { data: PreparedIpLookupIndex; expiry: number } | null = null;
let indexInflight: Promise<PreparedIpLookupIndex> | null = null;

interface CloudflareAssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// OpenNext sets the Cloudflare context on globalThis under a known symbol,
// but in some code paths (e.g. routes invoked outside the normal request
// scope) only the direct ASSETS binding is present. Check both so we don't
// silently drop back to the fs fallback — which 404s in the Worker runtime.
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

async function loadJsonAsset<T>(assetPath: string, options?: ServerDataLoadOptions): Promise<T> {
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

  const filePath = path.join(process.cwd(), 'public', ...assetPath.replace(/^\/+/, '').split('/'));
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/** Loads and prepares the index once; concurrent callers share the same load. */
function loadIndex(options?: ServerDataLoadOptions): Promise<PreparedIpLookupIndex> {
  const now = Date.now();
  if (indexCache && indexCache.expiry > now) {
    return Promise.resolve(indexCache.data);
  }
  if (indexInflight) {
    return indexInflight;
  }

  indexInflight = loadJsonAsset<IpLookupIndexFile>(INDEX_PATH, options)
    .then((file) => {
      const data = prepareIpLookupIndex(file);
      indexCache = { data, expiry: Date.now() + CACHE_TTL_MS };
      return data;
    })
    .finally(() => {
      indexInflight = null;
    });

  return indexInflight;
}

/** Azure ranges containing the given IP address or CIDR block */
export async function checkIpAddress(ipAddress: string, options?: ServerDataLoadOptions): Promise<AzureIpAddress[]> {
  const index = await loadIndex(options);
  return lookupIpInIndex(index, ipAddress);
}

/** Azure ranges whose service tag matches a region and/or service name, across all clouds */
export async function searchAzureIpAddresses(
  options: SearchOptions,
  loadOptions?: ServerDataLoadOptions
): Promise<AzureIpAddress[]> {
  const index = await loadIndex(loadOptions);
  return searchIpIndex(index, options);
}
