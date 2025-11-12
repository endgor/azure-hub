/**
 * Server-side RBAC service - unified exports for backward compatibility.
 *
 * This module re-exports all functions from the modular server RBAC library.
 * Existing imports from '@/lib/serverRbacService' will continue to work.
 *
 * Benefits over client-side approach:
 * - Keeps 2MB+ of role data on server
 * - Returns only requested data (typically < 50KB)
 * - Shared cache across all users
 * - Faster wildcard matching on server
 */

// Data loader exports
export {
  loadRoleDefinitions,
  loadActionsCache,
  getRoleById,
  searchRoles
} from './rbacDataLoader';

// Pattern matcher exports
export { matchesPattern } from './rbacPatternMatcher';

// Calculator exports
export { calculateLeastPrivilege } from './rbacCalculator';

// Search exports
export {
  searchOperations,
  getServiceNamespaces,
  getActionsByService
} from './rbacSearch';
