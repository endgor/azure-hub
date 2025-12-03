export interface TenantInformation {
  tenantId: string;
  defaultDomainName?: string;
  displayName?: string;
  federationBrandName?: string | null;
}

export interface TenantMetadata {
  cloud_instance_name?: string;
  tenant_region_scope?: string;
  tenant_region_sub_scope?: string;
  authorization_endpoint?: string;
  issuer?: string;
  [key: string]: unknown;
}

export interface TenantLookupResponse {
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
