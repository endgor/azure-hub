/**
 * Entra ID RBAC service - unified exports for backward compatibility.
 *
 * This module re-exports all functions and types from the modular Entra ID library.
 * Existing imports from '@/lib/entraIdRbacService' will continue to work.
 */

// Data service exports
export {
  getEntraIDRolesDataStatus,
  loadEntraIDRoles,
  getEntraIDNamespaces,
  extractActionsFromEntraIDRoles,
  getEntraIDActionsByNamespace,
  searchEntraIDActions,
  preloadEntraIDActionsCache
} from './dataService';

// Permission matcher exports
export { hasEntraIDPermission } from './permissionMatcher';

// Scoring exports
export { calculateEntraIDNamespaceRelevance } from './scoring';

// Calculator exports
export {
  calculateLeastPrivilegedEntraIDRoles,
  calculateLeastPrivilegeEntraID
} from './calculator';
