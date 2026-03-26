import { AzureCloudName } from '@/types/azure';

/** Full cloud display names */
export const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Government',
  [AzureCloudName.AzureChinaCloud]: 'China',
};

/** Short cloud display names for compact UI (badges, tags) */
export const CLOUD_LABELS_SHORT: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Gov',
  [AzureCloudName.AzureChinaCloud]: 'China',
};

/** Badge styling per cloud environment */
export const CLOUD_STYLES: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  [AzureCloudName.AzureUSGovernment]: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  [AzureCloudName.AzureChinaCloud]: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
};
