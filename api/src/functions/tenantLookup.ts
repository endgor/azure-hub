import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

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

function getCredential(): TokenCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, or GRAPH_TENANT_ID environment variables.');
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
  // Basic domain validation (supports subdomains and punycode prefixes)
  const domainRegex =
    /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;
  if (!domainRegex.test(trimmed)) {
    return null;
  }
  return trimmed;
}

async function fetchTenantInformation(domain: string, credential: TokenCredential, context: InvocationContext) {
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
    context.log(`Graph request failed: ${response.status} ${errorText}`);
    throw new Error('Microsoft Graph request failed.');
  }

  return (await response.json()) as TenantInformation;
}

async function fetchTenantMetadata(tenantIdOrDomain: string, context: InvocationContext): Promise<TenantMetadata | null> {
  const metadataUrl = `https://login.microsoftonline.com/${tenantIdOrDomain}/v2.0/.well-known/openid-configuration`;

  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      context.log(`Metadata fetch returned ${response.status} for ${metadataUrl}`);
      return null;
    }
    return (await response.json()) as TenantMetadata;
  } catch (error) {
    context.log(`Failed to fetch OpenID metadata: ${(error as Error).message}`);
    return null;
  }
}

export async function tenantLookup(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Tenant lookup invoked for ${request.method} ${request.url}`);

  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = (process.env.TENANT_LOOKUP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const corsAllowOrigin = [...allowedOrigins, ...DEFAULT_ALLOWED_ORIGINS].includes(origin) ? origin : undefined;

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        ...(corsAllowOrigin ? { 'Access-Control-Allow-Origin': corsAllowOrigin } : {}),
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
      },
    };
  }

  try {
    const requestBody =
      request.method === 'POST'
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};
    const bodyDomain = typeof requestBody['domain'] === 'string' ? (requestBody['domain'] as string) : null;
    const domainParam = request.query.get('domain') ?? bodyDomain;
    const domain = normalizeDomain(typeof domainParam === 'string' ? domainParam : '');

    if (!domain) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...(corsAllowOrigin ? { 'Access-Control-Allow-Origin': corsAllowOrigin } : {}),
        },
        body: JSON.stringify({ error: 'A valid domain is required. Example: contoso.com' }),
      };
    }

    const credential = getCredential();
    const tenantInfo = await fetchTenantInformation(domain, credential, context);

    if (!tenantInfo) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...(corsAllowOrigin ? { 'Access-Control-Allow-Origin': corsAllowOrigin } : {}),
        },
        body: JSON.stringify({
          error: 'Tenant not found',
          message: `No Microsoft Entra tenant is associated with "${domain}".`,
        }),
      };
    }

    const metadata =
      (await fetchTenantMetadata(tenantInfo.tenantId ?? tenantInfo.defaultDomainName ?? domain, context)) ?? undefined;

    const responsePayload: TenantLookupResponse = {
      input: { domain },
      tenant: tenantInfo,
      metadata,
      derived: {
        azureAdInstance: formatAzureAdInstance(metadata?.cloud_instance_name, metadata?.tenant_region_scope),
        tenantScope: formatTenantScope(metadata?.tenant_region_sub_scope),
      },
      fetchedAt: new Date().toISOString(),
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(corsAllowOrigin ? { 'Access-Control-Allow-Origin': corsAllowOrigin } : {}),
      },
      body: JSON.stringify(responsePayload),
    };
  } catch (error) {
    context.log(`Tenant lookup failed: ${(error as Error).message}`);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...(corsAllowOrigin ? { 'Access-Control-Allow-Origin': corsAllowOrigin } : {}),
      },
      body: JSON.stringify({ error: 'Tenant lookup failed. Please try again later.' }),
    };
  }
}

app.http('tenantLookup', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: tenantLookup,
});
