import type { TenantInformation } from '@/types/tenant';

const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';
const TRUSTED_GRAPH_SCOPES = new Set([
  'https://graph.microsoft.com/.default',
  'https://graph.microsoft.us/.default',
  'https://dod-graph.microsoft.us/.default',
  'https://microsoftgraph.chinacloudapi.cn/.default',
]);
const TRUSTED_GRAPH_HOSTS = new Set([
  'graph.microsoft.com',
  'graph.microsoft.us',
  'dod-graph.microsoft.us',
  'microsoftgraph.chinacloudapi.cn',
]);

export class MissingCredentialsError extends Error {
  constructor() {
    super('Missing required Azure credentials');
    this.name = 'MissingCredentialsError';
  }
}

export interface ClientSecretCredentialLike {
  getToken(scope: string): Promise<{ token: string } | null>;
}

let cachedCredential: ClientSecretCredentialLike | null = null;
let cachedGraphBaseUrl: URL | null = null;
let cachedGraphScope: string | null = null;
let cachedToken: { scope: string; token: string; expiresAt: number } | null = null;

function getEnvValue(...keys: string[]): string | undefined {
  return keys.map((key) => process.env[key]).find((value) => value);
}

function getValidatedGraphBaseUrl(): URL {
  if (cachedGraphBaseUrl) {
    return cachedGraphBaseUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(GRAPH_BASE_URL);
  } catch {
    throw new Error('GRAPH_BASE_URL must be an absolute URL.');
  }

  if (parsedUrl.protocol.toLowerCase() !== 'https:') {
    throw new Error('GRAPH_BASE_URL must use HTTPS.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (!TRUSTED_GRAPH_HOSTS.has(hostname)) {
    throw new Error(`GRAPH_BASE_URL host "${hostname}" is not allowed.`);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('GRAPH_BASE_URL must not include user credentials.');
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error('GRAPH_BASE_URL must not include query or fragment.');
  }

  if (parsedUrl.pathname !== '' && parsedUrl.pathname !== '/') {
    throw new Error('GRAPH_BASE_URL must not include a path.');
  }

  cachedGraphBaseUrl = new URL(parsedUrl.origin);
  return cachedGraphBaseUrl;
}

function getValidatedGraphScope(): string {
  if (cachedGraphScope) {
    return cachedGraphScope;
  }

  const normalizedScope = GRAPH_SCOPE.trim();
  if (!TRUSTED_GRAPH_SCOPES.has(normalizedScope)) {
    throw new Error(`GRAPH_SCOPE "${normalizedScope}" is not allowed.`);
  }

  cachedGraphScope = normalizedScope;
  return cachedGraphScope;
}

function getAuthorityHost(): string {
  const authorityHost = process.env.AZURE_AUTHORITY_HOST ?? 'https://login.microsoftonline.com';

  let url: URL;
  try {
    url = new URL(authorityHost);
  } catch {
    throw new Error('AZURE_AUTHORITY_HOST must be an absolute URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('AZURE_AUTHORITY_HOST must use HTTPS.');
  }

  return url.origin;
}

export function getCredential(): ClientSecretCredentialLike {
  if (cachedCredential) {
    return cachedCredential;
  }

  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new MissingCredentialsError();
  }

  const authorityHost = getAuthorityHost();

  cachedCredential = {
    async getToken(scope: string) {
      const now = Date.now();
      if (cachedToken && cachedToken.scope === scope && cachedToken.expiresAt - 60_000 > now) {
        return { token: cachedToken.token };
      }

      const tokenUrl = `${authorityHost}/${tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to acquire Microsoft Graph access token: ${response.status} ${errorText}`);
      }

      const payload = await response.json() as { access_token?: string; expires_in?: number };
      if (!payload.access_token) {
        throw new Error('Failed to acquire Microsoft Graph access token.');
      }

      cachedToken = {
        scope,
        token: payload.access_token,
        expiresAt: now + ((payload.expires_in ?? 3600) * 1000),
      };

      return { token: payload.access_token };
    },
  };

  return cachedCredential;
}

export async function fetchTenantInformation(
  domain: string,
  credential: ClientSecretCredentialLike
): Promise<TenantInformation | null> {
  const graphBaseUrl = getValidatedGraphBaseUrl();
  const graphScope = getValidatedGraphScope();
  const safeDomain = domain.replace(/'/g, "''");
  const graphPath = `/v1.0/tenantRelationships/findTenantInformationByDomainName(domainName='${safeDomain}')`;
  const graphUrl = new URL(graphPath, graphBaseUrl).toString();

  const token = await credential.getToken(graphScope);
  if (!token) {
    throw new Error('Failed to acquire Microsoft Graph access token.');
  }

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
    throw new Error('Microsoft Graph request failed.');
  }

  return (await response.json()) as TenantInformation;
}
