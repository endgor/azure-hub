# Rate Limiting Architecture

## Implementation Status: ✅ BOTH Available

The application now supports **TWO rate limiting implementations**:

### 1. In-Memory Rate Limiter (Default)
- **Location**: `src/lib/rateLimit.ts`
- **Storage**: Local `Map` in each instance
- **Best for**: Development, single-instance deployments, basic abuse prevention
- **Limitation**: Per-instance only (can be bypassed in multi-instance environments)

### 2. Distributed Rate Limiter (Production-Ready)
- **Location**: `src/lib/rateLimitDistributed.ts`
- **Storage**: Vercel KV (Redis)
- **Best for**: Production, multi-instance deployments, security-critical limits
- **Benefit**: **Global limits across ALL instances** - cannot be bypassed

---

## Quick Start: Enable Distributed Rate Limiting

**For Vercel production deployments** (recommended):

### Step 1: Install Vercel KV
```bash
npm install @vercel/kv
```

### Step 2: Set Up Vercel KV
1. Go to Vercel Dashboard → Your Project → Storage
2. Create a new KV database
3. Environment variables are automatically set:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### Step 3: Enable Distributed Limiting
Add to your environment variables (in Vercel dashboard or `.env.local`):
```bash
USE_DISTRIBUTED_RATE_LIMIT=true
```

### Step 4: Deploy
```bash
git push
```

**That's it!** The application automatically uses distributed rate limiting when enabled. No code changes needed.

---

##⚠️ In-Memory Limiter Limitation (Default)

When using the **default in-memory limiter** (without distributed setup):

**Problem**: Each serverless instance has its own counter.

**Impact on Vercel/AWS Lambda/Multi-instance**:
- Request A → Instance 1 (counter: 1)
- Request B → Instance 2 (counter: 1)  ← Different instance, fresh counter!
- Request C → Instance 1 (counter: 2)
- Request D → Instance 3 (counter: 1)  ← Another instance, fresh counter!

Attackers can bypass by retrying until hitting a different instance.

**In-memory limiter is effective for**:
- ✅ Development environments
- ✅ Single-instance deployments
- ✅ Preventing accidental hammering
- ✅ Basic abuse protection

**In-memory limiter is NOT effective for**:
- ❌ Security-critical rate limiting
- ❌ Protecting against determined attackers
- ❌ Enforcing strict global quotas
- ❌ DDoS mitigation

---

## How It Works

The rate limiting automatically switches between implementations:

```typescript
// In src/lib/rateLimit.ts
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  // If distributed is enabled and configured:
  if (process.env.USE_DISTRIBUTED_RATE_LIMIT === 'true') {
    // Use Vercel KV (Redis) - global across all instances ✅
    return await checkRateLimitDistributed(identifier);
  }

  // Otherwise: Use in-memory - per-instance only ⚠️
  return rateLimiter.check(identifier);
}
```

---

## Alternative: Upstash Redis (Platform-Agnostic)

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
