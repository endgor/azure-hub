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
 * Request rate limiter for API endpoints.
 */
export class RateLimiter {
  private cache: Map<string, RateLimitEntry>;
  private readonly limit: number;
  private readonly windowMs: number;
  private lastCleanup: number;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.cache = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
    this.lastCleanup = 0;
  }

  private cleanupExpiredEntries(now: number): void {
    if (now - this.lastCleanup < this.windowMs) {
      return;
    }

    for (const [key, entry] of this.cache.entries()) {
      if (entry.resetTime < now) {
        this.cache.delete(key);
      }
    }

    this.lastCleanup = now;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
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
    this.cache.clear();
  }
}

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

const rateLimiter = new RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);

/**
 * Extracts client identifier for rate limiting.
 */
export function getClientIdentifier(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const cloudflareIp = req.headers['cf-connecting-ip'];
  if (typeof cloudflareIp === 'string' && cloudflareIp) {
    return cloudflareIp;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp) return realIp;

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return 'unknown';
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.check(identifier);
}
