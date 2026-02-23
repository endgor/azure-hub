import { ClientSecretCredential, TokenCredential } from '@azure/identity';
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

let cachedCredential: TokenCredential | null = null;
let cachedGraphBaseUrl: URL | null = null;
let cachedGraphScope: string | null = null;

function getEnvValue(...keys: string[]): string | undefined {
  return keys.map(key => process.env[key]).find(value => value);
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

export function getCredential(): TokenCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new MissingCredentialsError();
  }

  cachedCredential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: process.env.AZURE_AUTHORITY_HOST,
  });

  return cachedCredential;
}

export async function fetchTenantInformation(
  domain: string,
  credential: TokenCredential
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
