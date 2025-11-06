import type { NextApiRequest, NextApiResponse } from 'next';
import { calculateLeastPrivilege } from '@/lib/serverRbacService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import type { LeastPrivilegeResult } from '@/types/rbac';

interface CalculateRequest {
  requiredActions: string[];
  requiredDataActions?: string[];
}

interface CalculateResponse {
  results: LeastPrivilegeResult[];
  error?: string;
}

/**
 * Server-side RBAC calculation API endpoint.
 *
 * Eliminates the need to load 2MB+ of role data client-side.
 * Performs wildcard matching and privilege scoring on the server.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalculateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      results: [],
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
      error: 'Rate limit exceeded. Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitResult.reset.toString());

  try {
    const body = req.body as CalculateRequest;

    if (!body.requiredActions || !Array.isArray(body.requiredActions) || body.requiredActions.length === 0) {
      return res.status(400).json({
        results: [],
        error: 'requiredActions must be a non-empty array'
      });
    }

    const results = await calculateLeastPrivilege({
      requiredActions: body.requiredActions,
      requiredDataActions: body.requiredDataActions || []
    });

    return res.status(200).json({
      results
    });
  } catch (error) {
    console.error('RBAC calculation error:', error);
    return res.status(500).json({
      results: [],
      error: 'Failed to calculate least privilege roles'
    });
  }
}
