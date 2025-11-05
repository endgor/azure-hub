# Rate Limiting Architecture

## Current Implementation

The application uses an **in-memory rate limiter** (`src/lib/rateLimit.ts`) that stores request counts in a `Map` data structure within each serverless function instance.

## ⚠️ Known Limitation

### Per-Instance Rate Limiting

The current implementation has an **architectural limitation** in distributed/serverless environments:

**Problem**: Each serverless function instance maintains its own separate rate limit counter.

**Impact on Vercel/AWS Lambda/Multi-instance deployments**:
- Request A → Instance 1 (counter: 1)
- Request B → Instance 2 (counter: 1)
- Request C → Instance 1 (counter: 2)
- Request D → Instance 3 (counter: 1)

An attacker can bypass rate limits by simply retrying requests until they land on a different instance. This makes the rate limiter effective only for:
- ✅ Preventing accidental hammering from legitimate clients
- ✅ Basic abuse protection
- ✅ Single-instance deployments
- ✅ Development environments

It is **NOT effective** for:
- ❌ Security-critical rate limiting
- ❌ Protecting against determined attackers
- ❌ Enforcing strict global quotas
- ❌ DDoS mitigation

## Migration Path to Distributed Rate Limiting

When you need global rate limiting across all instances, migrate to a shared data store:

### Option 1: Vercel KV (Recommended for Vercel deployments)

```bash
npm install @vercel/kv
```

Setup Vercel KV in your dashboard, then update `src/lib/rateLimit.ts`:

```typescript
import { kv } from '@vercel/kv';

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, 60); // 60 second window
  }

  const limit = 10;
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + 60000
  };
}
```

### Option 2: Upstash Redis (Platform-agnostic)

```bash
npm install @upstash/redis
```

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  const limit = 10;
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + 60000
  };
}
```

### Option 3: Use Vercel's Built-in Edge Middleware

Create `middleware.ts` at the project root:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60s')
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString()
        }
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};
```

## Monitoring

To detect if you need distributed rate limiting:

1. **Monitor abuse patterns** in your logs
2. **Track 429 responses** - if they're rare despite high traffic, limits might be bypassed
3. **Check for IP-based attacks** using your hosting provider's analytics

## Configuration

Current rate limit settings are controlled via environment variables:

```bash
# .env.local
RATE_LIMIT_REQUESTS=10        # requests per window
RATE_LIMIT_WINDOW_MS=60000    # window duration in milliseconds
```

## Decision Checklist

Use **in-memory** (current) if:
- [ ] You're in development
- [ ] Traffic is low (<1000 req/min)
- [ ] Rate limiting is "nice to have" not critical
- [ ] Single-instance deployment

Migrate to **distributed** if:
- [ ] You need security-critical rate limiting
- [ ] Experiencing abuse from determined attackers
- [ ] Need strict quota enforcement
- [ ] High-traffic production environment (>1000 req/min)
- [ ] Multiple serverless instances active

## References

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Rate Limiting Patterns](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
