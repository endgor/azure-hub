/**
 * Predefined RBAC role templates for common Azure scenarios
 * These templates represent permission sets that Microsoft documents but doesn't provide as built-in roles
 */

export interface RbacTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Networking' | 'Backup' | 'Security' | 'Cost Management' | 'DevOps' | 'Monitoring';
  actions: string[];
  dataActions?: string[];
  notActions?: string[];
  notDataActions?: string[];
  /** Microsoft documentation link explaining why these permissions are needed */
  sourceUrl?: string;
  /** Additional notes or warnings for users */
  notes?: string;
}

export const RBAC_TEMPLATES: RbacTemplate[] = [
  {
    id: 'bastion-vm-access',
    name: 'Azure Bastion VM Access',
    description: 'Minimum permissions required to connect to VMs through Azure Bastion',
    category: 'Networking',
    actions: [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Network/networkInterfaces/read',
      'Microsoft.Network/bastionHosts/read',
      'Microsoft.Network/virtualNetworks/read'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/bastion/bastion-faq#vm-connection-and-available-features-faqs',
    notes: 'Reader role on VM, NIC, Bastion resource, and VNet (if peered). Users also need appropriate VM access rights (e.g., Remote Desktop Users group for Windows).'
  },
  {
    id: 'cross-region-restore',
    name: 'Cross-Region Restore Operator',
    description: 'Azure Backup operator with cross-region restore capabilities',
    category: 'Backup',
    actions: [
      'Microsoft.RecoveryServices/Vaults/backupFabrics/protectionContainers/protectedItems/read',
      'Microsoft.RecoveryServices/Vaults/backupFabrics/protectionContainers/protectedItems/recoveryPoints/read',
      'Microsoft.RecoveryServices/Vaults/backupFabrics/protectionContainers/protectedItems/backup/action',
      'Microsoft.RecoveryServices/locations/backupAadProperties/read',
      'Microsoft.RecoveryServices/locations/backupCrrJobs/action',
      'Microsoft.RecoveryServices/locations/backupCrrJob/action',
      'Microsoft.RecoveryServices/locations/backupCrossRegionRestore/action',
      'Microsoft.RecoveryServices/locations/backupCrrOperationResults/read',
      'Microsoft.RecoveryServices/locations/backupCrrOperationsStatus/read',
      'Microsoft.RecoveryServices/Vaults/read'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/backup/backup-rbac-rs-vault#mapping-backup-built-in-roles-to-backup-management-actions',
    notes: 'Extends Backup Operator with cross-region restore permissions. Scope at subscription level.'
  },
  {
    id: 'disk-backup-restore',
    name: 'Disk Backup & Restore Operator',
    description: 'Complete disk backup and restore operations',
    category: 'Backup',
    actions: [
      'Microsoft.DataProtection/backupVaults/backupInstances/read',
      'Microsoft.DataProtection/backupVaults/backupInstances/write',
      'Microsoft.DataProtection/backupVaults/backupPolicies/read',
      'Microsoft.Compute/disks/read',
      'Microsoft.Compute/disks/beginGetAccess/action',
      'Microsoft.Compute/disks/endGetAccess/action'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/backup/backup-rbac-rs-vault#minimum-role-requirements-for-azure-disk-backup',
    notes: 'Additional permissions required on the Backup Vault MSI. Restore operator permissions needed on target resource group.'
  },
  {
    id: 'cost-analyst-limited',
    name: 'Cost Analyst (Limited Billing)',
    description: 'Cost analysis with read-only billing access, no invoice download',
    category: 'Cost Management',
    actions: [
      'Microsoft.Consumption/*/read',
      'Microsoft.CostManagement/*/read',
      'Microsoft.Billing/billingPeriods/read',
      'Microsoft.Resources/subscriptions/read',
      'Microsoft.Resources/subscriptions/resourceGroups/read',
      'Microsoft.Management/managementGroups/read'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/assign-access-acm-data',
    notes: 'Provides cost visibility without invoice download permissions. Useful for finance team members who analyze costs but don\'t need invoice access.'
  },
  {
    id: 'monitoring-security-ops',
    name: 'Security Operations Monitor',
    description: 'Read-only monitoring and security data access for SOC teams',
    category: 'Security',
    actions: [
      'Microsoft.Insights/*/read',
      'Microsoft.Security/*/read',
      'Microsoft.OperationalInsights/workspaces/query/read',
      'Microsoft.OperationalInsights/workspaces/read',
      'Microsoft.Authorization/*/read'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/roles-permissions-security',
    notes: 'Combines monitoring and security reader permissions without write or ListKeys access. Ideal for security operations teams.'
  },
  {
    id: 'app-insights-viewer',
    name: 'Application Insights Viewer',
    description: 'View application telemetry without modifying settings',
    category: 'Monitoring',
    actions: [
      'Microsoft.Insights/components/*/read',
      'Microsoft.Insights/webtests/*/read',
      'Microsoft.OperationalInsights/workspaces/query/read',
      'Microsoft.OperationalInsights/workspaces/read'
    ],
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/roles-permissions-security',
    notes: 'Read-only access to Application Insights telemetry data. Useful for developers who need to view metrics but shouldn\'t modify monitoring configuration.'
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RbacTemplate['category']): RbacTemplate[] {
  return RBAC_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique categories
 */
export function getTemplateCategories(): RbacTemplate['category'][] {
  return Array.from(new Set(RBAC_TEMPLATES.map(t => t.category)));
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RbacTemplate | undefined {
  return RBAC_TEMPLATES.find(t => t.id === id);
}
