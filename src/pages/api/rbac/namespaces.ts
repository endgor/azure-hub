import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceNamespaces } from '@/lib/serverRbacService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

interface NamespacesResponse {
  namespaces: string[];
  error?: string;
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

/**
 * Server-side service namespace API.
 * Returns all Azure provider namespaces from RBAC actions cache.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NamespacesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      namespaces: [],
      error: 'Method not allowed'
    });
  }

  const clientId = getClientIdentifier(req);
  const rateLimitResult = await checkRateLimit(`${clientId}:rbac:namespaces`);

  if (!rateLimitResult.success) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return res.status(429).json({
      namespaces: [],
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  try {
    const namespaces = await getServiceNamespaces({ baseUrl: getBaseUrl(req) });
    return res.status(200).json({ namespaces });
  } catch (error) {
    console.error('Service namespaces lookup error:', error);
    return res.status(500).json({
      namespaces: [],
      error: 'Failed to load service namespaces'
    });
  }
}
