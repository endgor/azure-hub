import type { NextApiRequest, NextApiResponse } from 'next';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';

interface TenantInformation {
  tenantId: string;
  defaultDomainName?: string;
  displayName?: string;
  federationBrandName?: string | null;
}

interface TenantMetadata {
  cloud_instance_name?: string;
  tenant_region_scope?: string;
  tenant_region_sub_scope?: string;
  authorization_endpoint?: string;
  issuer?: string;
  [key: string]: unknown;
}

interface TenantLookupResponse {
  input: {
    domain: string;
  };
  tenant: TenantInformation;
  metadata?: TenantMetadata;
  derived: {
    azureAdInstance?: string;
    tenantScope?: string;
  };
  fetchedAt: string;
}

type ErrorResponse = {
  error: string;
};

const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'https://localhost:3000'];

const CLOUD_INSTANCE_LABELS: Record<string, string> = {
  AzureADMyOrg: 'Azure AD Global',
  AzureADChina: 'Azure AD China',
  AzureADGermany: 'Azure AD Germany',
  AzureADGovernment: 'Azure AD Government',
  AzureADUSGovernment: 'Azure AD US Government',
  AzureADUSSecurity: 'Azure AD US Security',
  AzureADUSGovernmentCloud: 'Azure AD US Government',
};

const REGION_SCOPE_LABELS: Record<string, string> = {
  NA: 'North America',
  EU: 'Europe',
  AS: 'Asia',
  IN: 'India',
  OC: 'Oceania',
  AF: 'Africa',
  ME: 'Middle East',
  SA: 'South America',
  CA: 'Canada',
  CN: 'China',
  DE: 'Germany',
  USGov: 'United States Government',
};

let cachedCredential: TokenCredential | null = null;

function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function getCredential(): TokenCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Azure AD app registration credentials. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID (or legacy GRAPH_* equivalents).'
    );
  }

  cachedCredential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: process.env.AZURE_AUTHORITY_HOST,
  });

  return cachedCredential;
}

function formatAzureAdInstance(instance?: string, regionScope?: string): string | undefined {
  if (!instance) return undefined;
  const instanceLabel = CLOUD_INSTANCE_LABELS[instance] ?? instance;
  const regionLabel = regionScope ? REGION_SCOPE_LABELS[regionScope] ?? regionScope : null;
  return regionLabel ? `${instanceLabel}: ${regionLabel}` : instanceLabel;
}

function formatTenantScope(subScope?: string): string | undefined {
  if (!subScope) return 'Not applicable';
  return REGION_SCOPE_LABELS[subScope] ?? subScope;
}

function normalizeDomain(rawDomain: string | null): string | null {
  if (!rawDomain) return null;
  const trimmed = rawDomain.trim().toLowerCase();
  if (!trimmed) return null;
  const domainRegex =
    /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;
  if (!domainRegex.test(trimmed)) {
    return null;
  }
  return trimmed;
}

async function fetchTenantInformation(domain: string, credential: TokenCredential) {
  const token = await credential.getToken(GRAPH_SCOPE);
  if (!token) {
    throw new Error('Failed to acquire Microsoft Graph access token.');
  }

  const safeDomain = domain.replace(/'/g, "''");
  const graphUrl = `${GRAPH_BASE_URL}/v1.0/tenantRelationships/findTenantInformationByDomainName(domainName='${safeDomain}')`;

  const response = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Graph request failed: ${response.status} ${errorText}`);
    throw new Error('Microsoft Graph request failed.');
  }

  return (await response.json()) as TenantInformation;
}

async function fetchTenantMetadata(tenantIdOrDomain: string): Promise<TenantMetadata | null> {
  const metadataUrl = `https://login.microsoftonline.com/${tenantIdOrDomain}/v2.0/.well-known/openid-configuration`;

  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      console.warn(`Metadata fetch returned ${response.status} for ${metadataUrl}`);
      return null;
    }
    return (await response.json()) as TenantMetadata;
  } catch (error) {
    console.warn(`Failed to fetch OpenID metadata: ${(error as Error).message}`);
    return null;
  }
}

function sendJson<T>(res: NextApiResponse<T>, status: number, payload: T, corsOrigin?: string) {
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
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

  if (!['GET', 'POST'].includes(req.method ?? '')) {
    sendJson(res, 405, { error: 'Method Not Allowed' }, corsAllowOrigin);
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
        corsAllowOrigin
      );
      return;
    }

    const credential = getCredential();
    const tenantInfo = await fetchTenantInformation(domain, credential);

    if (!tenantInfo) {
      sendJson(
        res,
        404,
        {
          error: `No Microsoft Entra tenant found for ${domain}.`,
        },
        corsAllowOrigin
      );
      return;
    }

    const tenantIdOrDomain = tenantInfo.tenantId || tenantInfo.defaultDomainName || domain;
    const metadata = await fetchTenantMetadata(tenantIdOrDomain);
    const result: TenantLookupResponse = {
      input: {
        domain,
      },
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

    sendJson(res, 200, result, corsAllowOrigin);
  } catch (error) {
    console.error(`Tenant lookup failed: ${(error as Error).message}`);
    sendJson(
      res,
      500,
      { error: 'Tenant lookup failed. Please try again in a few moments.' },
      corsAllowOrigin
    );
  }
}
