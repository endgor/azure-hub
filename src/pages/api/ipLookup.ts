import type { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import { promisify } from 'util';
import { checkIpAddress, searchAzureIpAddresses } from '@/lib/serverIpService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { AzureIpAddress } from '@/types/azure';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

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
 * Check if a string is a hostname (not an IP or CIDR)
 */
function isHostname(input: string): boolean {
  if (!input.includes('.') || input.includes('/')) {
    return false;
  }
  if (/^\d+\.\d+/.test(input)) {
    return false;
  }
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
    let results: AzureIpAddress[] = [];

    if (ipOrDomain && typeof ipOrDomain === 'string') {
      // Check if it's an IP address or CIDR
      if (/^\d+\.\d+/.test(ipOrDomain) || ipOrDomain.includes('/')) {
        results = await checkIpAddress(ipOrDomain);
      }
      // Check if it's a hostname that needs DNS resolution
      else if (isHostname(ipOrDomain)) {
        try {
          const ipAddresses: string[] = [];

          // Resolve DNS
          const ipv4 = await resolve4(ipOrDomain).catch(() => []);
          ipAddresses.push(...ipv4);

          const ipv6 = await resolve6(ipOrDomain).catch(() => []);
          ipAddresses.push(...ipv6);

          if (ipAddresses.length > 0) {
            // Check each resolved IP in parallel
            const matchPromises = ipAddresses.map(async (resolvedIp: string) => {
              const matches = await checkIpAddress(resolvedIp);
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
              searchAzureIpAddresses({ service: ipOrDomain }),
              searchAzureIpAddresses({ region: ipOrDomain })
            ]);
            results = deduplicateResults([...serviceResults, ...regionResults]);
          }
        } catch {
          // DNS lookup failed, fall back to service/region search
          const [serviceResults, regionResults] = await Promise.all([
            searchAzureIpAddresses({ service: ipOrDomain }),
            searchAzureIpAddresses({ region: ipOrDomain })
          ]);
          results = deduplicateResults([...serviceResults, ...regionResults]);
        }
      }
      // Otherwise treat as service/region search
      else {
        const [serviceResults, regionResults] = await Promise.all([
          searchAzureIpAddresses({ service: ipOrDomain }),
          searchAzureIpAddresses({ region: ipOrDomain })
        ]);
        results = deduplicateResults([...serviceResults, ...regionResults]);
      }
    } else {
      // Search by region and/or service
      results = await searchAzureIpAddresses({
        region: typeof region === 'string' ? region : undefined,
        service: typeof service === 'string' ? service : undefined
      });
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
