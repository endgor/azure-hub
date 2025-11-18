import type { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import { promisify } from 'util';
import { getClientIdentifier, checkRateLimit } from '@/lib/rateLimit';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

interface DnsLookupResponse {
  hostname: string;
  ipAddresses: string[];
  error?: string;
}

/**
 * DNS lookup API route. Returns IP addresses for hostname resolution.
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

  const clientId = getClientIdentifier(req);
  const rateLimitResult = await checkRateLimit(clientId);

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

    const ipv4 = await resolve4(hostname).catch(() => []);
    ipAddresses.push(...ipv4);

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
    console.error('DNS lookup error:', error);
    return res.status(500).json({
      hostname: '',
      ipAddresses: [],
      error: 'DNS lookup failed'
    });
  }
}
