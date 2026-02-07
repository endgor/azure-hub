import type { NextApiRequest, NextApiResponse } from 'next';
import { getActionsByService } from '@/lib/serverRbacService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { Operation } from '@/types/rbac';

interface ActionsByServiceResponse {
  operations: Operation[];
  error?: string;
}

/**
 * Server-side actions-by-service API.
 * Returns all operations under a specific Azure provider namespace.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionsByServiceResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      operations: [],
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
      operations: [],
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  const { service } = req.query;
  if (!service || typeof service !== 'string') {
    return res.status(400).json({
      operations: [],
      error: 'service parameter is required'
    });
  }

  try {
    const operations = await getActionsByService(service);
    return res.status(200).json({ operations });
  } catch (error) {
    console.error('Actions by service lookup error:', error);
    return res.status(500).json({
      operations: [],
      error: 'Failed to load actions for service'
    });
  }
}
