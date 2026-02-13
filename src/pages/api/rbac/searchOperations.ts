import type { NextApiRequest, NextApiResponse } from 'next';
import { searchOperations } from '@/lib/serverRbacService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { Operation } from '@/types/rbac';

interface SearchResponse {
  operations: Operation[];
  error?: string;
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
  const rateLimitResult = await checkRateLimit(`${clientId}:rbac:searchOperations`);

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
    const operations = await searchOperations(query, limitNum);

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
