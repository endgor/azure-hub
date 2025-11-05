/**
 * Distributed Rate Limiter using Vercel KV (Redis)
 *
 * This provides ACTUAL distributed rate limiting across all serverless instances.
 * Unlike the in-memory limiter, this cannot be bypassed by hitting different instances.
 *
 * Setup:
 * 1. Install: npm install @vercel/kv
 * 2. Add Vercel KV database in Vercel dashboard
 * 3. Set environment variables:
 *    - KV_REST_API_URL=<your-kv-url>
 *    - KV_REST_API_TOKEN=<your-kv-token>
 * 4. Set USE_DISTRIBUTED_RATE_LIMIT=true
 *
 * Local Development:
 * - Automatically falls back to in-memory limiter
 * - Set USE_DISTRIBUTED_RATE_LIMIT=false (default)
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Check if Vercel KV is available
const hasVercelKV = typeof process !== 'undefined' &&
                    process.env.KV_REST_API_URL &&
                    process.env.KV_REST_API_TOKEN;

const useDistributed = process.env.USE_DISTRIBUTED_RATE_LIMIT === 'true';

let kv: any = null;
let kvInitialized = false;

// Async initialization function for KV
async function initializeKV() {
  if (kvInitialized) return;
  kvInitialized = true;

  if (!hasVercelKV || !useDistributed) return;

  try {
    // Dynamic import to avoid build errors if @vercel/kv is not installed
    const kvModule = await import('@vercel/kv' as any);
    kv = kvModule.kv;
    console.log('[RateLimit] Using distributed Vercel KV rate limiter');
  } catch {
    console.warn('[RateLimit] @vercel/kv not installed or failed to load, falling back to in-memory');
  }
}

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_WINDOW_SEC = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

/**
 * Distributed rate limiter using Redis (Vercel KV).
 * Uses atomic INCR and EXPIRE operations for accurate counting across instances.
 */
export async function checkRateLimitDistributed(identifier: string): Promise<RateLimitResult> {
  // Initialize KV on first use
  await initializeKV();

  if (!kv) {
    // Fall back to error response if KV is not available
    throw new Error('Distributed rate limiter not configured');
  }

  try {
    const key = `ratelimit:${identifier}`;

    // Use Redis pipeline for atomic operations
    const multi = kv.multi();
    multi.incr(key);
    multi.expire(key, RATE_LIMIT_WINDOW_SEC);
    multi.ttl(key);

    const [count, , ttl]: [number, any, number] = await multi.exec();

    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      success: count <= RATE_LIMIT_REQUESTS,
      limit: RATE_LIMIT_REQUESTS,
      remaining,
      reset: resetTime
    };
  } catch (error) {
    console.error('[RateLimit] Distributed rate limiter error:', error);
    // On error, allow the request (fail open) rather than blocking
    return {
      success: true,
      limit: RATE_LIMIT_REQUESTS,
      remaining: RATE_LIMIT_REQUESTS - 1,
      reset: Date.now() + RATE_LIMIT_WINDOW_MS
    };
  }
}

/**
 * Check if distributed rate limiting is enabled via environment variables.
 * This checks config only, not whether KV is actually initialized yet.
 */
export function isDistributedRateLimitEnabled(): boolean {
  return hasVercelKV && useDistributed;
}

/**
 * Get current rate limit configuration.
 */
export function getRateLimitConfig() {
  return {
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    distributed: isDistributedRateLimitEnabled(),
    backend: isDistributedRateLimitEnabled() ? 'Vercel KV (Redis)' : 'In-Memory (per-instance)'
  };
}
