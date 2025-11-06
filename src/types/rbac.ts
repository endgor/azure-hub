/**
 * Azure RBAC (Role-Based Access Control) type definitions
 * Based on Azure role definitions and permissions structure
 */

/**
 * Role type discriminator for Azure RBAC vs Entra ID roles
 */
export type RoleSystemType = 'azure' | 'entraid';

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

/**
 * Entra ID (formerly Azure AD) Role Definitions
 * Based on Microsoft Graph API unifiedRoleDefinition structure
 */

/**
 * Represents a permission set for an Entra ID role
 */
export interface EntraIDRolePermission {
  allowedResourceActions: string[];
  excludedResourceActions?: string[];
  condition?: string;
}

/**
 * Represents an Entra ID built-in or custom role definition
 */
export interface EntraIDRole {
  id: string;
  displayName: string;
  description: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  templateId: string;
  version?: string;
  rolePermissions: EntraIDRolePermission[];
  // Extended data (computed during data generation)
  permissionCount?: number;
  inheritedRoleId?: string;
}

/**
 * Input for calculating least privileged Entra ID roles
 */
export interface EntraIDLeastPrivilegeInput {
  requiredActions: string[];
}

/**
 * Result from Entra ID least privilege calculation
 */
export interface EntraIDLeastPrivilegeResult {
  role: EntraIDRole;
  matchingActions: string[];
  permissionCount: number;
  isExactMatch: boolean;
}
