import { CACHE_TTL_MS } from '@/config/constants';
import type { IpDiffFile, IpDiffSummary } from '@/types/ipDiff';

/**
 * Client-side service for loading IP data diff information.
 * Loads the computed diff between the current and previous versions of Azure IP data.
 */

// In-memory cache
let diffCache: IpDiffFile | null = null;
let diffCacheExpiry = 0;
let diffLoadAttempted = false;

/**
 * Loads the IP diff data from the server.
 * Returns null if no diff is available (e.g., first update or no changes).
 */
export async function loadIpDiff(): Promise<IpDiffFile | null> {
  const now = Date.now();

  // Return cached data if still valid
  if (diffCache && diffCacheExpiry > now) {
    return diffCache;
  }

  // If we already tried loading and got a 404, don't retry until cache expires
  if (diffLoadAttempted && !diffCache && diffCacheExpiry > now) {
    return null;
  }

  try {
    diffLoadAttempted = true;
    const response = await fetch('/data/ip-diff.json');

    if (!response.ok) {
      if (response.status === 404) {
        // No diff available yet - this is normal for first run
        diffCacheExpiry = now + CACHE_TTL_MS;
        return null;
      }
      throw new Error(`Failed to load IP diff: ${response.statusText}`);
    }

    const data = await response.json();
    diffCache = data;
    diffCacheExpiry = now + CACHE_TTL_MS;

    return data;
  } catch (error) {
    // Log warning but don't throw - diff is optional
    console.warn('Failed to load IP diff:', error instanceof Error ? error.message : 'Unknown error');
    diffCacheExpiry = now + CACHE_TTL_MS; // Prevent rapid retries
    return null;
  }
}

/**
 * Gets just the summary of the diff without full details.
 * Returns null if no diff is available.
 */
export async function getDiffSummary(): Promise<IpDiffSummary | null> {
  const diff = await loadIpDiff();
  return diff?.meta.summary || null;
}

/**
 * Checks if a diff is available without loading the full data.
 * Uses cached data if available.
 */
export async function isDiffAvailable(): Promise<boolean> {
  const diff = await loadIpDiff();
  return diff !== null;
}

/**
 * Gets the version transition info (from -> to changeNumbers).
 */
export async function getVersionInfo(): Promise<{
  fromChangeNumber: number;
  toChangeNumber: number;
  generatedAt: string;
} | null> {
  const diff = await loadIpDiff();
  if (!diff) return null;

  return {
    fromChangeNumber: diff.meta.fromChangeNumber,
    toChangeNumber: diff.meta.toChangeNumber,
    generatedAt: diff.meta.generatedAt,
  };
}

/**
 * Clears the diff cache, forcing a fresh load on next request.
 */
export function clearDiffCache(): void {
  diffCache = null;
  diffCacheExpiry = 0;
  diffLoadAttempted = false;
}
