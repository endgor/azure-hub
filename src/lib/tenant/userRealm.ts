export interface UserRealmResult {
  nameSpaceType: 'Managed' | 'Federated' | 'Unknown';
  federationProtocol?: string;
  federationBrandName?: string;
  cloudInstanceName?: string;
}

interface UserRealmApiResponse {
  NameSpaceType?: string;
  federation_protocol?: string;
  FederationBrandName?: string;
  cloud_instance_name?: string;
}

export async function fetchUserRealm(domain: string): Promise<UserRealmResult | null> {
  const testLogin = encodeURIComponent(`user@${domain}`);
  const url = `https://login.microsoftonline.com/common/userrealm/${testLogin}?api-version=1.0`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as UserRealmApiResponse;

    const nameSpaceType = (data.NameSpaceType ?? 'Unknown') as UserRealmResult['nameSpaceType'];
    return {
      nameSpaceType,
      federationProtocol: data.federation_protocol,
      federationBrandName: data.FederationBrandName,
      cloudInstanceName: data.cloud_instance_name,
    };
  } catch {
    return null;
  }
}
