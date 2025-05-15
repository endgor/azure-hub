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
  AzureUSGovernment = "AzureUSGovernment",
  AzureGermanCloud = "AzureGermanCloud"
}

export interface DownloadMapping {
  id: string;
  cloud: AzureCloudName;
}
