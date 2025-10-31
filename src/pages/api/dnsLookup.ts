import type { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

interface DnsLookupResponse {
  hostname: string;
  ipAddresses: string[];
  error?: string;
}

/**
 * API route to perform DNS lookup for hostnames
 * Returns resolved IP addresses that can be used for Azure IP lookup
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
      hostname,
      ipAddresses: [],
      error: 'Invalid hostname format'
    });
  }

  try {
    const ipAddresses: string[] = [];

    // Try IPv4 resolution
    try {
      const ipv4Addresses = await resolve4(hostname);
      ipAddresses.push(...ipv4Addresses);
    } catch (error) {
      // IPv4 resolution failed, that's okay - might only have IPv6
    }

    // Try IPv6 resolution
    try {
      const ipv6Addresses = await resolve6(hostname);
      ipAddresses.push(...ipv6Addresses);
    } catch (error) {
      // IPv6 resolution failed, that's okay - might only have IPv4
    }

    if (ipAddresses.length === 0) {
      return res.status(404).json({
        hostname,
        ipAddresses: [],
        error: `No DNS records found for ${hostname}`
      });
    }

    return res.status(200).json({
      hostname,
      ipAddresses
    });
  } catch (error) {
    console.error('DNS lookup error:', error);
    return res.status(500).json({
      hostname,
      ipAddresses: [],
      error: error instanceof Error ? error.message : 'DNS lookup failed'
    });
  }
}
