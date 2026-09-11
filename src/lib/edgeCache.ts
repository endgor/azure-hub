/**
 * Thin wrapper over the Workers Cache API for API routes whose answers only
 * change when the daily data changes. The global is absent under Node
 * (`next dev`, `next start`) and inert on workers.dev, so every helper fails
 * open and the route simply computes the answer.
 */

interface WorkerCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

function getEdgeCache(): WorkerCache | null {
  const scope = globalThis as typeof globalThis & { caches?: { default?: WorkerCache } };
  return scope.caches?.default ?? null;
}

export async function readEdgeCache<T>(key: string): Promise<T | null> {
  try {
    const cache = getEdgeCache();
    if (!cache) return null;
    const hit = await cache.match(new Request(key));
    return hit ? ((await hit.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Returns false when there is no cache to write to. */
export async function writeEdgeCache(key: string, payload: unknown, ttlSeconds: number): Promise<boolean> {
  try {
    const cache = getEdgeCache();
    if (!cache) return false;
    await cache.put(
      new Request(key),
      new Response(JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttlSeconds}`
        }
      })
    );
    return true;
  } catch {
    return false;
  }
}
