import type { NextApiRequest, NextApiResponse } from 'next';
import net from 'node:net';
import { checkIpAddress, searchAzureIpAddresses } from '@/lib/serverIpService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { AzureIpAddress } from '@/types/azure';

interface IpLookupResponse {
  results: AzureIpAddress[];
  total: number;
  query?: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
  error?: string;
  notFound?: boolean;
  message?: string;
}

/**
 * Check if a string is an IP address or CIDR notation.
 * Uses net.isIP() for reliable IPv4/IPv6 detection.
 */
function isIpOrCidr(input: string): boolean {
  if (input.includes('/')) {
    const ip = input.split('/')[0];
    return net.isIP(ip) !== 0;
  }
  return net.isIP(input) !== 0;
}

/**
 * Check if a string is a hostname (not an IP or CIDR)
 */
function isHostname(input: string): boolean {
  if (!input.includes('.')) return false;
  if (isIpOrCidr(input)) return false;
  return true;
}

/**
 * Deduplicate Azure IP address results
 */
function deduplicateResults(results: AzureIpAddress[]): AzureIpAddress[] {
  return results.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (t) => t.ipAddressPrefix === item.ipAddressPrefix && t.serviceTagId === item.serviceTagId
      )
  );
}

function getBaseUrl(req: NextApiRequest): string {
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = typeof protoHeader === 'string' ? protoHeader.split(',')[0] : 'https';
  const host = req.headers.host;

  if (!host) {
    throw new Error('Missing host header');
  }

  return `${protocol}://${host}`;
}

interface DnsJsonAnswer {
  data?: string;
  type?: number;
}

interface DnsJsonResponse {
  Answer?: DnsJsonAnswer[];
}

async function resolveHostname(hostname: string): Promise<string[]> {
  const recordTypes = ['A', 'AAAA'];
  const resolved = await Promise.all(
    recordTypes.map(async (type) => {
      const response = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`
      );

      if (!response.ok) {
        return [];
      }

      const payload = await response.json() as DnsJsonResponse;
      return (payload.Answer || [])
        .map((answer) => answer.data?.trim())
        .filter((value): value is string => {
          if (!value) {
            return false;
          }

          return net.isIP(value) !== 0;
        });
    })
  );

  return Array.from(new Set(resolved.flat()));
}

/**
 * Server-side API endpoint for IP lookups.
 *
 * Benefits over client-side approach:
 * - No 4MB download to browser
 * - Server-side CIDR matching (faster)
 * - Shared cache across all users
 * - Rate limited to prevent abuse
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IpLookupResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      results: [],
      total: 0,
      error: 'Method not allowed'
    });
  }

  // Apply rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await checkRateLimit(clientId);

  if (!rateLimitResult.success) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return res.status(429).json({
      results: [],
      total: 0,
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  const { ipOrDomain, region, service } = req.query;

  try {
    const baseUrl = getBaseUrl(req);
    let results: AzureIpAddress[] = [];

    if (ipOrDomain && typeof ipOrDomain === 'string') {
      // Check if it's an IP address or CIDR
      if (isIpOrCidr(ipOrDomain)) {
        results = await checkIpAddress(ipOrDomain, { baseUrl });
      }
      // Check if it's a hostname that needs DNS resolution
      else if (isHostname(ipOrDomain)) {
        try {
          const ipAddresses = await resolveHostname(ipOrDomain);

          if (ipAddresses.length > 0) {
            // Check each resolved IP in parallel
            const matchPromises = ipAddresses.map(async (resolvedIp: string) => {
              const matches = await checkIpAddress(resolvedIp, { baseUrl });
              // Tag each result with DNS info
              matches.forEach(match => {
                match.resolvedFrom = ipOrDomain;
                match.resolvedIp = resolvedIp;
              });
              return matches;
            });

            results = (await Promise.all(matchPromises)).flat();
          } else {
            // No DNS results, fall back to service/region search
            const [serviceResults, regionResults] = await Promise.all([
              searchAzureIpAddresses({ service: ipOrDomain }, { baseUrl }),
              searchAzureIpAddresses({ region: ipOrDomain }, { baseUrl })
            ]);
            results = deduplicateResults([...serviceResults, ...regionResults]);
          }
        } catch {
          // DNS lookup failed, fall back to service/region search
          const [serviceResults, regionResults] = await Promise.all([
            searchAzureIpAddresses({ service: ipOrDomain }, { baseUrl }),
            searchAzureIpAddresses({ region: ipOrDomain }, { baseUrl })
          ]);
          results = deduplicateResults([...serviceResults, ...regionResults]);
        }
      }
      // Otherwise treat as service/region search
      else {
        const [serviceResults, regionResults] = await Promise.all([
          searchAzureIpAddresses({ service: ipOrDomain }, { baseUrl }),
          searchAzureIpAddresses({ region: ipOrDomain }, { baseUrl })
        ]);
        results = deduplicateResults([...serviceResults, ...regionResults]);
      }
    } else {
      // Search by region and/or service
      results = await searchAzureIpAddresses({
        region: typeof region === 'string' ? region : undefined,
        service: typeof service === 'string' ? service : undefined
      }, { baseUrl });
    }

    if (results.length === 0) {
      return res.status(200).json({
        notFound: true,
        message: 'No Azure IP ranges found matching your search criteria',
        results: [],
        total: 0,
        query: {
          ipOrDomain: typeof ipOrDomain === 'string' ? ipOrDomain : undefined,
          region: typeof region === 'string' ? region : undefined,
          service: typeof service === 'string' ? service : undefined
        }
      });
    }

    return res.status(200).json({
      results,
      total: results.length,
      query: {
        ipOrDomain: typeof ipOrDomain === 'string' ? ipOrDomain : undefined,
        region: typeof region === 'string' ? region : undefined,
        service: typeof service === 'string' ? service : undefined
      }
    });
  } catch (error) {
    console.error('IP lookup error:', error);
    return res.status(500).json({
      results: [],
      total: 0,
      error: 'Failed to lookup IP information. Please try again.'
    });
  }
}
