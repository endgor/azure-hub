import type { NextApiRequest, NextApiResponse } from 'next';
import net from 'node:net';
import { checkIpAddress, searchAzureIpAddresses, type ServerDataLoadOptions } from '@/lib/serverIpService';
import { readEdgeCache, writeEdgeCache } from '@/lib/edgeCache';
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

/** The index only changes with the daily data commit, so an hour of edge caching is safe. */
const EDGE_CACHE_TTL_SECONDS = 3600;
const BROWSER_CACHE_SECONDS = 300;

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
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.ipAddressPrefix}|${item.serviceTagId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

interface LookupQuery {
  ipOrDomain?: string;
  region?: string;
  service?: string;
}

/** A free-text term matches either service tags or regions */
async function searchByName(term: string, loadOptions: ServerDataLoadOptions): Promise<AzureIpAddress[]> {
  const [serviceResults, regionResults] = await Promise.all([
    searchAzureIpAddresses({ service: term }, loadOptions),
    searchAzureIpAddresses({ region: term }, loadOptions)
  ]);
  return deduplicateResults([...serviceResults, ...regionResults]);
}

async function lookupHostname(hostname: string, loadOptions: ServerDataLoadOptions): Promise<AzureIpAddress[]> {
  let ipAddresses: string[];
  try {
    ipAddresses = await resolveHostname(hostname);
  } catch {
    return searchByName(hostname, loadOptions);
  }

  if (ipAddresses.length === 0) {
    return searchByName(hostname, loadOptions);
  }

  const perIp = await Promise.all(
    ipAddresses.map(async (resolvedIp) => {
      const matches = await checkIpAddress(resolvedIp, loadOptions);
      return matches.map((match) => ({ ...match, resolvedFrom: hostname, resolvedIp }));
    })
  );
  return perIp.flat();
}

async function performLookup(query: LookupQuery, loadOptions: ServerDataLoadOptions): Promise<AzureIpAddress[]> {
  const { ipOrDomain, region, service } = query;

  if (!ipOrDomain) {
    return searchAzureIpAddresses({ region, service }, loadOptions);
  }
  if (isIpOrCidr(ipOrDomain)) {
    return checkIpAddress(ipOrDomain, loadOptions);
  }
  if (isHostname(ipOrDomain)) {
    return lookupHostname(ipOrDomain, loadOptions);
  }
  return searchByName(ipOrDomain, loadOptions);
}

function buildResponse(results: AzureIpAddress[], query: LookupQuery): IpLookupResponse {
  if (results.length === 0) {
    return {
      notFound: true,
      message: 'No Azure IP ranges found matching your search criteria',
      results: [],
      total: 0,
      query
    };
  }
  return { results, total: results.length, query };
}

function queryParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

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

  const query: LookupQuery = {
    ipOrDomain: queryParam(req.query.ipOrDomain),
    region: queryParam(req.query.region),
    service: queryParam(req.query.service)
  };

  try {
    const baseUrl = getBaseUrl(req);
    const loadOptions: ServerDataLoadOptions = { baseUrl };

    // DNS answers change independently of our data, so hostname lookups are never cached.
    const cacheable = !(query.ipOrDomain && isHostname(query.ipOrDomain));
    const cacheKey = `${baseUrl}/api/ipLookup?${new URLSearchParams(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))
    ).toString()}`;

    res.setHeader('Cache-Control', `public, max-age=${BROWSER_CACHE_SECONDS}`);

    if (cacheable) {
      const cached = await readEdgeCache<IpLookupResponse>(cacheKey);
      if (cached) {
        res.setHeader('X-Edge-Cache', 'HIT');
        return res.status(200).json(cached);
      }
    }

    const payload = buildResponse(await performLookup(query, loadOptions), query);

    if (cacheable && (await writeEdgeCache(cacheKey, payload, EDGE_CACHE_TTL_SECONDS))) {
      res.setHeader('X-Edge-Cache', 'MISS');
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('IP lookup error:', error);
    res.removeHeader('Cache-Control');
    return res.status(500).json({
      results: [],
      total: 0,
      error: 'Failed to lookup IP information. Please try again.'
    });
  }
}
