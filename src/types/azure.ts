export interface AzureIpAddress {
  serviceTagId: string;
  ipAddress?: string;
  ipAddressPrefix: string;
  region: string;
  regionId: string;
  systemService: string;
  networkFeatures: string;
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

export interface DownloadMapping {
  id: string;
  cloud: AzureCloudName;
}

export interface AzureCloudVersions {
  AzureCloud?: string;
  AzureChinaCloud?: string;
  AzureUSGovernment?: string;
}

export interface AzureFileMetadata {
  cloud: AzureCloudName;
  changeNumber: number;
  filename: string;
  downloadUrl: string;
  lastRetrieved: string;
}
