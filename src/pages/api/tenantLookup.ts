import type { NextApiRequest, NextApiResponse } from 'next';
import type { TenantLookupResponse } from '@/types/tenant';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import {
  getCredential,
  fetchTenantInformation,
  fetchTenantMetadata,
  formatAzureAdInstance,
  formatTenantScope,
  normalizeDomain,
  MissingCredentialsError,
} from '@/lib/tenant';

type ErrorResponse = { error: string };

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'https://localhost:3000'];

function sendJson<T>(
  res: NextApiResponse<T>,
  status: number,
  payload: T,
  corsOrigin?: string,
  rateLimitHeaders?: { limit: number; remaining: number; reset: number }
) {
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  if (rateLimitHeaders) {
    res.setHeader('X-RateLimit-Limit', rateLimitHeaders.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitHeaders.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitHeaders.reset.toString());
  }
  res.status(status).json(payload);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TenantLookupResponse | ErrorResponse>
) {
  const origin = req.headers.origin ?? '';
  const corsAllowedOrigins = (process.env.TENANT_LOOKUP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const corsAllowOrigin = [...corsAllowedOrigins, ...DEFAULT_ALLOWED_ORIGINS].includes(origin)
    ? origin
    : undefined;

  if (req.method === 'OPTIONS') {
    if (corsAllowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsAllowOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
    res.status(204).end();
    return;
  }

  const clientId = getClientIdentifier(req);
  const rateLimit = await checkRateLimit(clientId);

  if (!rateLimit.success) {
    const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    if (corsAllowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsAllowOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimit.reset.toString());
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  const rateLimitHeaders = {
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    reset: rateLimit.reset,
  };

  if (!['GET', 'POST'].includes(req.method ?? '')) {
    sendJson(res, 405, { error: 'Method Not Allowed' }, corsAllowOrigin, rateLimitHeaders);
    return;
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const requestBody =
      req.method === 'POST' ? (body as Record<string, unknown>) : ({} as Record<string, unknown>);
    const bodyDomain = typeof requestBody['domain'] === 'string' ? requestBody['domain'] : null;
    const domainParam = typeof req.query.domain === 'string' ? req.query.domain : bodyDomain;
    const domain = normalizeDomain(domainParam ?? '');

    if (!domain) {
      sendJson(
        res,
        400,
        { error: 'Enter a valid tenant-verified domain such as contoso.com.' },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    const credential = getCredential();
    const tenantInfo = await fetchTenantInformation(domain, credential);

    if (!tenantInfo) {
      sendJson(
        res,
        404,
        { error: `No Microsoft Entra tenant found for ${domain}.` },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    const tenantIdOrDomain = tenantInfo.tenantId || tenantInfo.defaultDomainName || domain;
    const metadata = await fetchTenantMetadata(tenantIdOrDomain);
    const result: TenantLookupResponse = {
      input: { domain },
      tenant: tenantInfo,
      metadata: metadata ?? undefined,
      derived: {
        azureAdInstance: formatAzureAdInstance(
          metadata?.cloud_instance_name,
          metadata?.tenant_region_scope
        ),
        tenantScope: formatTenantScope(metadata?.tenant_region_sub_scope),
      },
      fetchedAt: new Date().toISOString(),
    };

    sendJson(res, 200, result, corsAllowOrigin, rateLimitHeaders);
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error('Tenant lookup configuration error');
      sendJson(
        res,
        500,
        { error: 'Unable to retrieve tenant information. Try again later.' },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    console.error('Tenant lookup failed');
    sendJson(
      res,
      500,
      { error: 'Unable to retrieve tenant information. Try again later.' },
      corsAllowOrigin,
      rateLimitHeaders
    );
  }
}
