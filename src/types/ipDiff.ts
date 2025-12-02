/**
 * Types for Azure IP data versioning and diff tracking
 */

export interface IpDiffSummary {
  serviceTagsAdded: number;
  serviceTagsRemoved: number;
  serviceTagsModified: number;
  totalPrefixesAdded: number;
  totalPrefixesRemoved: number;
}

export interface IpDiffMeta {
  fromChangeNumber: number;
  toChangeNumber: number;
  fromFilename: string;
  toFilename: string;
  generatedAt: string;
  summary: IpDiffSummary;
}

export interface AddedTag {
  name: string;
  systemService: string;
  region: string;
  prefixCount: number;
  prefixes: string[];
}

export interface RemovedTag {
  name: string;
  systemService: string;
  region: string;
  prefixCount: number;
  prefixes: string[];
}

export interface ModifiedTag {
  name: string;
  systemService: string;
  region: string;
  previousChangeNumber: number;
  currentChangeNumber: number;
  addedPrefixes: string[];
  removedPrefixes: string[];
}

export interface IpDiffFile {
  meta: IpDiffMeta;
  addedTags: AddedTag[];
  removedTags: RemovedTag[];
  modifiedTags: ModifiedTag[];
}
