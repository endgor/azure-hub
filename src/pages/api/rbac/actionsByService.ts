import type { NextApiRequest, NextApiResponse } from 'next';
import { getActionsByService } from '@/lib/serverRbacService';
import type { Operation } from '@/types/rbac';

interface ActionsByServiceResponse {
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

  const { service } = req.query;
  if (!service || typeof service !== 'string') {
    return res.status(400).json({
      operations: [],
      error: 'service parameter is required'
    });
  }

  try {
    const operations = await getActionsByService(service, { baseUrl: getBaseUrl(req) });
    return res.status(200).json({ operations });
  } catch (error) {
    console.error('Actions by service lookup error:', error);
    return res.status(500).json({
      operations: [],
      error: 'Failed to load actions for service'
    });
  }
}
