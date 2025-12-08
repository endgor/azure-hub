import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import type { TenantInformation } from '@/types/tenant';

const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';

export class MissingCredentialsError extends Error {
  constructor() {
    super('Missing required Azure credentials');
    this.name = 'MissingCredentialsError';
  }
}

let cachedCredential: TokenCredential | null = null;

function getEnvValue(...keys: string[]): string | undefined {
  return keys.map(key => process.env[key]).find(value => value);
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
    throw new Error('Microsoft Graph request failed.');
  }

  return (await response.json()) as TenantInformation;
}
