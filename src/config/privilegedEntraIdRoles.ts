/**
 * Entra ID Privileged Roles Configuration
 *
 * This list defines Entra ID roles that grant extensive permissions across Microsoft Entra ID
 * and should be assigned with caution following the principle of least privilege.
 *
 * @see https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference
 */

/**
 * Highly privileged Entra ID built-in roles that grant broad access to directory objects.
 *
 * These roles should trigger warnings when selected for assignment, as they:
 * - Grant wide-ranging permissions across directory objects (users, groups, applications)
 * - May allow modification or deletion of critical identity configurations
 * - Can impact security boundaries and access control
 * - Should be assigned only when absolutely necessary
 *
 * ## Role Descriptions
 *
 * - **Global Administrator**: Full access to all administrative features in Microsoft Entra ID and services that use Entra ID identities
 * - **Privileged Role Administrator**: Can manage role assignments and all aspects of Privileged Identity Management
 * - **Security Administrator**: Can manage security-related features, read security information and reports
 * - **Application Administrator**: Can create and manage all aspects of app registrations and enterprise apps
 * - **Cloud Application Administrator**: Can create and manage all aspects of app registrations except App Proxy
 * - **Authentication Administrator**: Can set or reset authentication methods for non-administrators
 * - **Privileged Authentication Administrator**: Can set or reset authentication methods for all users including admins
 * - **User Administrator**: Can manage all aspects of users and groups including resetting passwords
 * - **Exchange Administrator**: Full access to Exchange Online
 * - **SharePoint Administrator**: Full access to SharePoint Online
 * - **Teams Administrator**: Full access to Microsoft Teams
 *
 * ## Best Practices
 *
 * 1. **Prefer specific roles**: Use narrower roles like "Groups Administrator" instead of "User Administrator"
 * 2. **Time-bound access**: Use Privileged Identity Management (PIM) for temporary elevation
 * 3. **Regular audits**: Review privileged role assignments quarterly
 * 4. **Break glass**: Maintain emergency access accounts with Global Administrator role
 * 5. **MFA enforcement**: Always require MFA for privileged role assignments
 *
 * @example
 * ```typescript
 * import { PRIVILEGED_ENTRAID_ROLES, isPrivilegedEntraIdRole } from '@/config/privilegedEntraIdRoles';
 *
 * // Check if a role is privileged
 * if (isPrivilegedEntraIdRole('Global Administrator')) {
 *   console.warn('Assigning highly privileged role');
 * }
 *
 * // Get all privileged roles from a list
 * const privileged = roles.filter(r => isPrivilegedEntraIdRole(r.displayName));
 * ```
 */
export const PRIVILEGED_ENTRAID_ROLES = [
  // Top-tier privileged roles
  'Global Administrator',
  'Privileged Role Administrator',
  'Privileged Authentication Administrator',

  // Security-related privileged roles
  'Security Administrator',
  'Compliance Administrator',
  'Security Operator',

  // Identity and access management
  'User Administrator',
  'Authentication Administrator',
  'Password Administrator',
  'Helpdesk Administrator',

  // Application management
  'Application Administrator',
  'Cloud Application Administrator',

  // Service-specific admin roles
  'Exchange Administrator',
  'SharePoint Administrator',
  'Teams Administrator',
  'Intune Administrator',
  'Azure AD Joined Device Local Administrator',

  // Directory and domain management
  'Directory Writers',
  'Domain Name Administrator',
  'Hybrid Identity Administrator',
] as const;

/**
 * Checks if a given Entra ID role name is in the privileged roles list.
 *
 * @param roleName - The role display name to check (case-sensitive)
 * @returns True if the role is privileged, false otherwise
 *
 * @example
 * ```typescript
 * if (isPrivilegedEntraIdRole('Global Administrator')) {
 *   // Show warning banner
 * }
 * ```
 */
export function isPrivilegedEntraIdRole(roleName: string): boolean {
  return (PRIVILEGED_ENTRAID_ROLES as readonly string[]).includes(roleName);
}

/**
 * Filters a list of Entra ID roles to return only privileged roles.
 *
 * @param roles - Array of roles with displayName property
 * @returns Array of privileged roles only
 *
 * @example
 * ```typescript
 * const entraIdRoles = await fetchEntraIdRoles();
 * const privileged = getPrivilegedEntraIdRoles(entraIdRoles);
 * console.log(`Found ${privileged.length} privileged Entra ID roles`);
 * ```
 */
export function getPrivilegedEntraIdRoles<T extends { displayName: string }>(roles: T[]): T[] {
  return roles.filter(role => isPrivilegedEntraIdRole(role.displayName));
}
