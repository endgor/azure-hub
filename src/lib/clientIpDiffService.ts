import { CACHE_TTL_MS } from '@/config/constants';
import type { IpDiffFile } from '@/types/ipDiff';

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
  } catch {
    diffCacheExpiry = now + CACHE_TTL_MS; // Prevent rapid retries
    return null;
  }
}
