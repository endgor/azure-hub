import type { NextApiRequest } from 'next';

/**
 * Shared helpers for the Cloudflare Workers rate limiting bindings declared in
 * wrangler.jsonc. Bindings are absent outside the Workers runtime (local dev,
 * `next dev`), so every helper degrades to "not limited" rather than failing.
 */

export type RateLimiterName = 'TENANT_LOOKUP_RATE_LIMITER' | 'FEEDBACK_RATE_LIMITER';

export function getClientIp(req: NextApiRequest): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf;

  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') {
    const ip = fwd.split(',')[0].trim();
    if (ip) return ip;
  }

  return req.socket?.remoteAddress ?? 'unknown';
}

function getRateLimiterBinding(name: RateLimiterName): RateLimit | null {
  const globalScope = globalThis as typeof globalThis &
    Partial<Record<RateLimiterName, RateLimit>> & { [key: symbol]: unknown };
  const context = globalScope[Symbol.for('__cloudflare-context__')] as
    | { env?: Partial<Record<RateLimiterName, RateLimit>> }
    | undefined;

  return context?.env?.[name] ?? globalScope[name] ?? null;
}

/**
 * Returns true when the caller has exceeded the binding's quota.
 * Fails open: a missing or erroring binding never blocks real traffic.
 */
export async function isRateLimited(name: RateLimiterName, key: string): Promise<boolean> {
  try {
    const limiter = getRateLimiterBinding(name);
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    return false;
  }
}
