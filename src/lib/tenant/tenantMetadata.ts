import type { TenantMetadata } from '@/types/tenant';

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

export async function fetchTenantMetadata(tenantIdOrDomain: string): Promise<TenantMetadata | null> {
  const metadataUrl = `https://login.microsoftonline.com/${tenantIdOrDomain}/v2.0/.well-known/openid-configuration`;

  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as TenantMetadata;
  } catch {
    return null;
  }
}

export function formatAzureAdInstance(instance?: string, regionScope?: string): string | undefined {
  if (!instance) return undefined;
  const instanceLabel = CLOUD_INSTANCE_LABELS[instance] ?? instance;
  const regionLabel = regionScope ? REGION_SCOPE_LABELS[regionScope] ?? regionScope : null;
  return regionLabel ? `${instanceLabel}: ${regionLabel}` : instanceLabel;
}

export function formatTenantScope(subScope?: string): string | undefined {
  if (!subScope) return 'Not applicable';
  return REGION_SCOPE_LABELS[subScope] ?? subScope;
}
