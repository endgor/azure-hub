/**
 * Distributed Rate Limiter using Redis
 *
 * This provides ACTUAL distributed rate limiting across all serverless instances.
 * Unlike the in-memory limiter, this cannot be bypassed by hitting different instances.
 *
 * Setup:
 * 1. Add Redis integration from Vercel Marketplace
 * 2. Install: npm install redis
 * 3. Environment variable REDIS_URL is automatically set by integration
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

// Check if Redis is available
const hasRedis = typeof process !== 'undefined' && Boolean(process.env.REDIS_URL);
const useDistributed = process.env.USE_DISTRIBUTED_RATE_LIMIT === 'true';

let redisClient: any = null;
let redisInitPromise: Promise<void> | null = null;

// Async initialization function for Redis
// Uses a shared promise to ensure all concurrent requests wait for the same connection
async function initializeRedis() {
  // If already initialized, return immediately
  if (redisClient) return;

  // If initialization is in progress, wait for it
  if (redisInitPromise) {
    await redisInitPromise;
    return;
  }

  // Start initialization and store the promise
  redisInitPromise = (async () => {
    if (!hasRedis || !useDistributed) return;

    try {
      // Use Function constructor to completely hide the import from webpack's static analysis
      // This prevents "Module not found" errors when redis is not installed
      const importRedis = new Function('return import("redis")');
      const redisModule = await importRedis();

      // Create and connect Redis client
      const client = redisModule.createClient({
        url: process.env.REDIS_URL
      });

      client.on('error', (err: Error) => {
        console.error('[RateLimit] Redis client error:', err);
      });

      await client.connect();

      // Only set redisClient after successful connection
      redisClient = client;
      console.log('[RateLimit] Using distributed Redis rate limiter');
    } catch (err) {
      console.warn('[RateLimit] Redis not installed or failed to connect, falling back to in-memory:', err);
      redisClient = null;
    }
  })();

  await redisInitPromise;
}

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_WINDOW_SEC = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

/**
 * Distributed rate limiter using Redis.
 * Uses atomic INCR and EXPIRE operations for accurate counting across instances.
 */
export async function checkRateLimitDistributed(identifier: string): Promise<RateLimitResult> {
  // Initialize Redis on first use
  await initializeRedis();

  if (!redisClient) {
    // Fall back to error response if Redis is not available
    throw new Error('Distributed rate limiter not configured');
  }

  try {
    const key = `ratelimit:${identifier}`;

    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.multi();
    pipeline.incr(key);
    pipeline.expire(key, RATE_LIMIT_WINDOW_SEC);
    pipeline.ttl(key);

    const results = await pipeline.exec();

    // Results format: [[null, count], [null, expireResult], [null, ttl]]
    const count = results[0][1] as number;
    const ttl = results[2][1] as number;

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
 * This checks config only, not whether Redis is actually initialized yet.
 */
export function isDistributedRateLimitEnabled(): boolean {
  return Boolean(hasRedis && useDistributed);
}

