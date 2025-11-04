/**
 * Azure RBAC Privileged Roles Configuration
 *
 * This list defines roles that grant extensive permissions across Azure resources
 * and should be assigned with caution following the principle of least privilege.
 *
 * @see https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
 */

/**
 * Highly privileged Azure built-in roles that grant broad access to resources.
 *
 * These roles should trigger warnings when selected for assignment, as they:
 * - Grant wide-ranging permissions across multiple resource types
 * - May allow modification or deletion of critical resources
 * - Can impact security boundaries and access control
 * - Should be assigned only when absolutely necessary
 *
 * ## Role Descriptions
 *
 * - **Owner**: Full access to all resources including the ability to assign roles
 * - **Contributor**: Full access to manage all resources, but cannot assign roles
 * - **User Access Administrator**: Can manage user access to Azure resources
 * - **Security Admin**: Can view and update permissions for Security Center, policies, and security states
 * - **Security Manager (Legacy)**: Legacy role with broad security management permissions
 *
 * ## Best Practices
 *
 * 1. **Prefer specific roles**: Use narrower roles like "Storage Blob Data Contributor" instead of "Contributor"
 * 2. **Time-bound access**: Consider using Privileged Identity Management (PIM) for temporary elevation
 * 3. **Regular audits**: Review privileged role assignments quarterly
 * 4. **Scope limits**: Assign at the narrowest scope possible (resource > resource group > subscription)
 * 5. **Break glass**: Maintain emergency access procedures for production outages
 *
 * @example
 * ```typescript
 * import { PRIVILEGED_ROLES, isPrivilegedRole } from '@/config/privilegedRoles';
 *
 * // Check if a role is privileged
 * if (isPrivilegedRole('Owner')) {
 *   console.warn('Assigning highly privileged role');
 * }
 *
 * // Get all privileged roles from a list
 * const privileged = roles.filter(r => isPrivilegedRole(r.roleName));
 * ```
 */
export const PRIVILEGED_ROLES = [
  // Top-tier privileged roles
  'Owner',
  'Contributor',
  'User Access Administrator',

  // Security-related privileged roles
  'Security Admin',
  'Security Manager (Legacy)',
  'SQL Security Manager'
] as const;

/**
 * Checks if a given role name is in the privileged roles list.
 *
 * @param roleName - The role name to check (case-sensitive)
 * @returns True if the role is privileged, false otherwise
 *
 * @example
 * ```typescript
 * if (isPrivilegedRole('Owner')) {
 *   // Show warning banner
 * }
 * ```
 */
export function isPrivilegedRole(roleName: string): boolean {
  return (PRIVILEGED_ROLES as readonly string[]).includes(roleName);
}

/**
 * Filters a list of roles to return only privileged roles.
 *
 * @param roles - Array of roles with roleName property
 * @returns Array of privileged roles only
 *
 * @example
 * ```typescript
 * const azureRoles = await fetchRoles();
 * const privileged = getPrivilegedRoles(azureRoles);
 * console.log(`Found ${privileged.length} privileged roles`);
 * ```
 */
export function getPrivilegedRoles<T extends { roleName: string }>(roles: T[]): T[] {
  return roles.filter(role => isPrivilegedRole(role.roleName));
}
