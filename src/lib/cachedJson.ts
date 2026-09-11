import { CACHE_TTL_MS } from '@/config/constants';

/**
 * Browser-side loader for the static JSON under /data. One in-memory copy per URL
 * for the TTL, and concurrent callers share a single in-flight fetch.
 */

interface CacheEntry {
  value: unknown;
  expiry: number;
}

export interface CachedJsonOptions {
  ttlMs?: number;
  /** Resolve to null on a 404 instead of throwing, and remember the miss for the TTL. */
  allowNotFound?: boolean;
}

const entries = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function cachedJson<T>(url: string, options: CachedJsonOptions & { allowNotFound: true }): Promise<T | null>;
export function cachedJson<T>(url: string, options?: CachedJsonOptions): Promise<T>;
export function cachedJson<T>(url: string, options: CachedJsonOptions = {}): Promise<T | null> {
  const now = Date.now();
  const cached = entries.get(url);
  if (cached && cached.expiry > now) {
    return Promise.resolve(cached.value as T | null);
  }

  const existing = inflight.get(url) as Promise<T | null> | undefined;
  if (existing) return existing;

  const ttlMs = options.ttlMs ?? CACHE_TTL_MS;
  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 404 && options.allowNotFound) {
          return null;
        }
        throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    })
    .then((value) => {
      entries.set(url, { value, expiry: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

/** Test hook. */
export function clearCachedJson(): void {
  entries.clear();
  inflight.clear();
}
