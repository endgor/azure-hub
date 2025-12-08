/**
 * Types for Azure IP data versioning and diff tracking
 */

import type { AzureCloudName } from './azure';

export interface IpDiffSummary {
  serviceTagsAdded: number;
  serviceTagsRemoved: number;
  serviceTagsModified: number;
  totalPrefixesAdded: number;
  totalPrefixesRemoved: number;
}

/** Per-cloud version transition info */
export interface CloudVersionInfo {
  fromChangeNumber: number;
  toChangeNumber: number;
  fromFilename: string;
  toFilename: string;
}

export interface IpDiffMeta {
  /** @deprecated Use clouds map instead for multi-cloud support */
  fromChangeNumber?: number;
  /** @deprecated Use clouds map instead for multi-cloud support */
  toChangeNumber?: number;
  /** @deprecated Use clouds map instead for multi-cloud support */
  fromFilename?: string;
  /** @deprecated Use clouds map instead for multi-cloud support */
  toFilename?: string;
  generatedAt: string;
  summary: IpDiffSummary;
  /** Per-cloud version transition info */
  clouds?: Partial<Record<AzureCloudName, CloudVersionInfo>>;
}

export interface AddedTag {
  name: string;
  systemService: string;
  region: string;
  prefixCount: number;
  prefixes: string[];
  cloud?: AzureCloudName;
}

export interface RemovedTag {
  name: string;
  systemService: string;
  region: string;
  prefixCount: number;
  prefixes: string[];
  cloud?: AzureCloudName;
}

export interface ModifiedTag {
  name: string;
  systemService: string;
  region: string;
  previousChangeNumber: number;
  currentChangeNumber: number;
  addedPrefixes: string[];
  removedPrefixes: string[];
  cloud?: AzureCloudName;
}

export interface IpDiffFile {
  meta: IpDiffMeta;
  addedTags: AddedTag[];
  removedTags: RemovedTag[];
  modifiedTags: ModifiedTag[];
}
