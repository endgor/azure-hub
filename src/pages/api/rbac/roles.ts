import type { NextApiRequest, NextApiResponse } from 'next';
import { searchRoles, getRoleById } from '@/lib/serverRbacService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { AzureRole } from '@/types/rbac';

interface RolesResponse {
  roles: AzureRole[];
  error?: string;
}

/**
 * Server-side roles API.
 * Searches or retrieves specific roles without loading full dataset client-side.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RolesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      roles: [],
      error: 'Method not allowed'
    });
  }

  // Apply rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await checkRateLimit(`${clientId}:rbac:roles`);

  if (!rateLimitResult.success) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return res.status(429).json({
      roles: [],
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  const { query, id, limit } = req.query;

  try {
    // If ID is provided, get specific role
    if (id && typeof id === 'string') {
      const role = await getRoleById(id);
      if (!role) {
        return res.status(404).json({
          roles: [],
          error: 'Role not found'
        });
      }
      return res.status(200).json({
        roles: [role]
      });
    }

    // Otherwise search roles by query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        roles: [],
        error: 'query or id parameter is required'
      });
    }

    const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : 50;
    const roles = await searchRoles(query, limitNum);

    return res.status(200).json({
      roles
    });
  } catch (error) {
    console.error('Roles search error:', error);
    return res.status(500).json({
      roles: [],
      error: 'Failed to search roles'
    });
  }
}
