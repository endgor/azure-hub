interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * In-memory rate limiter implementation.
 *
 * ⚠️ IMPORTANT LIMITATION - Per-Instance Only:
 * This rate limiter stores state in memory, which means each serverless function
 * instance maintains its own separate counter. On platforms like Vercel, AWS Lambda,
 * or any multi-instance deployment:
 *
 * - Each request may hit a different instance
 * - Attackers can bypass limits by retrying until they hit a different instance
 * - Rate limits are enforced per-instance, not globally
 *
 * For production use with distributed deployments, consider migrating to:
 *
 * 1. **Vercel KV** (Redis):
 *    - Install: npm install @vercel/kv
 *    - Set up: https://vercel.com/docs/storage/vercel-kv
 *
 * 2. **Upstash Redis**:
 *    - Install: npm install @upstash/redis
 *    - Set up: https://upstash.com/
 *
 * 3. **Vercel Edge Config** (for simple read-heavy rate limits):
 *    - Install: npm install @vercel/edge-config
 *
 * 4. **Cloudflare Workers KV** (if using Cloudflare)
 *
 * The current implementation is suitable for:
 * - Development environments
 * - Single-instance deployments
 * - Basic abuse prevention (not security-critical)
 */
export class RateLimiter {
  private cache: Map<string, RateLimitEntry>;
  private readonly limit: number;
  private readonly windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.cache = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
    this.cleanupInterval = null;
    this.startCleanup();

    // Log warning in production environments with serverless deployment
    if (process.env.NODE_ENV === 'production' && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
      console.warn(
        '[RateLimit] Using in-memory rate limiter in distributed environment. ' +
        'Rate limits are per-instance only. Consider using Redis (Vercel KV/Upstash) for global limits.'
      );
    }
  }

  private startCleanup(): void {
    clearInterval(this.cleanupInterval!);
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.cache.forEach((entry, key) => {
        if (entry.resetTime < now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.cache.delete(key));
    }, this.windowMs);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    if (!entry || entry.resetTime < now) {
      const resetTime = now + this.windowMs;
      this.cache.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: resetTime,
      };
    }

    if (entry.count >= this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    entry.count++;
    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - entry.count,
      reset: entry.resetTime,
    };
  }

  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

const rateLimiter = new RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);

/**
 * Extracts client identifier for rate limiting.
 *
 * On Vercel, x-forwarded-for is reliably set by the platform and can be trusted.
 * In other environments, falls back to socket remote address.
 *
 * Security note: Only trusts x-forwarded-for when VERCEL=1 environment variable
 * is set, otherwise uses socket address to prevent header spoofing.
 */
export function getClientIdentifier(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const isVercel = process.env.VERCEL === '1';

  // On Vercel, trust x-forwarded-for header set by the platform
  if (isVercel) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const ip = forwarded.split(',')[0].trim();
      if (ip) return ip;
    }

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp) return realIp;
  }

  // Fallback to socket address (cannot be spoofed)
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Last resort fallback
  return 'unknown';
}

export function checkRateLimit(identifier: string): RateLimitResult {
  return rateLimiter.check(identifier);
}
