/**
 * Azure RBAC (Role-Based Access Control) type definitions
 * Based on Azure role definitions and permissions structure
 */

/**
 * Represents an Azure built-in or custom role definition
 */
export interface AzureRole {
  id: string;
  name: string;
  type: string;
  description: string;
  roleName: string;
  roleType: 'BuiltInRole' | 'CustomRole';
  permissions: RolePermission[];
  assignableScopes: string[];
  // Extended data (computed during data generation)
  permissionCount?: number;
  dataActions?: string[];
  notDataActions?: string[];
}

/**
 * Represents a set of permissions granted by a role
 */
export interface RolePermission {
  actions: string[];
  notActions: string[];
  dataActions?: string[];
  notDataActions?: string[];
}

/**
 * Represents a single Azure operation/permission
 */
export interface Operation {
  name: string;
  displayName: string;
  description: string;
  origin?: string;
  provider: string;
  /** Number of roles that grant this permission (used for sorting in fallback mode) */
  roleCount?: number;
}

/**
 * Represents an Azure resource provider with its operations
 */
export interface ResourceProvider {
  id: string;
  namespace: string;
  resourceTypes: ResourceType[];
  operations: Operation[];
}

/**
 * Represents a resource type within a provider
 */
export interface ResourceType {
  resourceType: string;
  operations: Operation[];
}

/**
 * Service namespace extracted from permission (e.g., "Microsoft.Compute" from "Microsoft.Compute/virtualMachines/read")
 */
export interface ServiceNamespace {
  namespace: string;
  displayName: string;
  count: number;
}

/**
 * Input for calculating least privileged roles
 */
export interface LeastPrivilegeInput {
  requiredActions: string[];
  requiredDataActions?: string[];
}

/**
 * Result from least privilege calculation
 */
export interface LeastPrivilegeResult {
  role: AzureRole;
  matchingActions: string[];
  matchingDataActions: string[];
  permissionCount: number;
  isExactMatch: boolean;
}
