import type { Guide, GuideCategory } from '@/lib/guides';
import type { AzureFileMetadata } from '@/types/azure';

export interface GeneratedSiteData {
  home: {
    lastUpdated: string | null;
  };
  about: {
    fileMetadata: AzureFileMetadata[];
    rbacLastRetrieved: string | null;
  };
  rbac: {
    roleCount: number;
    namespaceCount: number;
  };
  entraid: {
    roleCount: number;
    hasData: boolean;
  };
  serviceTags: {
    baseServiceTags: string[];
  };
  guides: {
    categories: GuideCategory[];
    guides: Guide[];
  };
}
