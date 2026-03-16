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

export interface UserRealmResult {
  nameSpaceType: 'Managed' | 'Federated' | 'Unknown';
  federationProtocol?: string;
  federationBrandName?: string;
  cloudInstanceName?: string;
}

export interface TenantLookupResponse {
  input: {
    domain: string;
  };
  tenant: TenantInformation;
  metadata?: TenantMetadata;
  userRealm?: UserRealmResult;
  derived: {
    azureAdInstance?: string;
    tenantScope?: string;
  };
  fetchedAt: string;
}
