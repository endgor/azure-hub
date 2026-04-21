// Extensions to CloudflareEnv for bindings declared in wrangler.jsonc.
// CloudflareEnv itself is declared globally by @opennextjs/cloudflare.

declare global {
  interface RateLimit {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  }

  interface CloudflareEnv {
    TENANT_LOOKUP_RATE_LIMITER?: RateLimit;
  }
}

export {};
