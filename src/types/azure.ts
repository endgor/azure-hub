export interface AzureIpAddress {
  serviceTagId: string;
  ipAddress?: string;
  ipAddressPrefix: string;
  region: string;
  regionId: string;
  systemService: string;
  networkFeatures: string;
  // DNS resolution info (when hostname was resolved)
  resolvedFrom?: string; // Original hostname that was resolved
  resolvedIp?: string;   // The specific IP address this entry matched
}

export interface AzureServiceTag {
  name: string;
  id: string;
  properties: AzureServiceTagProperties;
}

export interface AzureServiceTagProperties {
  changeNumber: number;
  region: string;
  regionId: string;
  platform: string;
  systemService: string;
  addressPrefixes: string[];
  networkFeatures: string[];
}

export interface AzureServiceTagsRoot {
  changeNumber: number;
  cloud: string;
  values: AzureServiceTag[];
}

export enum AzureCloudName {
  AzureCloud = "AzureCloud",
  AzureChinaCloud = "AzureChinaCloud",
  AzureUSGovernment = "AzureUSGovernment"
}

export interface AzureFileMetadata {
  cloud: AzureCloudName;
  changeNumber: number;
  filename: string;
  downloadUrl: string;
  lastRetrieved: string;
  // Diff-related fields (optional, added when diff is computed)
  previousChangeNumber?: number;
  previousFilename?: string;
  diffAvailable?: boolean;
}
