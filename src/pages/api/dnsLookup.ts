import type { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import { promisify } from 'util';
import { getClientIdentifier, RateLimiter } from '@/lib/rateLimit';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

// Aggressive rate limiting for DNS lookups: 5 requests per minute
const DNS_RATE_LIMIT = 5;
const DNS_RATE_WINDOW_MS = 60000;

// Separate rate limiter instance for DNS endpoint
const dnsRateLimiter = new RateLimiter(DNS_RATE_LIMIT, DNS_RATE_WINDOW_MS);

interface DnsLookupResponse {
  hostname: string;
  ipAddresses: string[];
  error?: string;
}

/**
 * API route to perform DNS lookup for hostnames.
 * Returns resolved IP addresses that can be used for Azure IP lookup.
 *
 * Security notes:
 * - Aggressive rate limiting (5 req/min) to prevent abuse
 * - Generic error messages to avoid leaking DNS resolver details
 * - On Vercel, only resolves public DNS (no internal network access)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DnsLookupResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      hostname: '',
      ipAddresses: [],
      error: 'Method not allowed'
    });
  }

  // Apply aggressive rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimitResult = dnsRateLimiter.check(clientId);

  if (!rateLimitResult.success) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return res.status(429).json({
      hostname: '',
      ipAddresses: [],
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  const { hostname } = req.query;

  if (!hostname || typeof hostname !== 'string') {
    return res.status(400).json({
      hostname: '',
      ipAddresses: [],
      error: 'Hostname parameter is required'
    });
  }

  // Basic hostname validation
  const hostnamePattern = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
  if (!hostnamePattern.test(hostname)) {
    return res.status(400).json({
      hostname: '',
      ipAddresses: [],
      error: 'Invalid hostname format'
    });
  }

  try {
    const ipAddresses: string[] = [];

    // Try IPv4 resolution
    const ipv4 = await resolve4(hostname).catch(() => []);
    ipAddresses.push(...ipv4);

    // Try IPv6 resolution
    const ipv6 = await resolve6(hostname).catch(() => []);
    ipAddresses.push(...ipv6);

    if (ipAddresses.length === 0) {
      return res.status(404).json({
        hostname: '',
        ipAddresses: [],
        error: 'No DNS records found'
      });
    }

    return res.status(200).json({
      hostname,
      ipAddresses
    });
  } catch (error) {
    // Log detailed error internally but return generic message to prevent info leakage
    console.error('DNS lookup error:', error);
    return res.status(500).json({
      hostname: '',
      ipAddresses: [],
      error: 'DNS lookup failed'
    });
  }
}
