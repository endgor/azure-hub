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
