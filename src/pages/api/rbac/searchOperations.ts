import type { NextApiRequest, NextApiResponse } from 'next';
import { searchOperations } from '@/lib/serverRbacService';
import { RateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import type { Operation } from '@/types/rbac';

// Higher limit for search — debounced keystrokes still add up across multiple searches
const searchRateLimiter = new RateLimiter(30, 60000);

interface SearchResponse {
  operations: Operation[];
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
 * Server-side operations search API.
 * Searches through Azure RBAC actions without loading full dataset client-side.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      operations: [],
      error: 'Method not allowed'
    });
  }

  // Apply rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimitResult = searchRateLimiter.check(`${clientId}:rbac:searchOperations`);

  if (!rateLimitResult.success) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return res.status(429).json({
      operations: [],
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  const { query, limit } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      operations: [],
      error: 'query parameter is required'
    });
  }

  try {
    const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : 50;
    const operations = await searchOperations(query, limitNum, { baseUrl: getBaseUrl(req) });

    return res.status(200).json({
      operations
    });
  } catch (error) {
    console.error('Operations search error:', error);
    return res.status(500).json({
      operations: [],
      error: 'Failed to search operations'
    });
  }
}
