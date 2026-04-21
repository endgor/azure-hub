import type { NextApiRequest, NextApiResponse } from 'next';
import { searchOperations } from '@/lib/serverRbacService';
import type { Operation } from '@/types/rbac';

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
