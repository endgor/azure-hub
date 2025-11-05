/**
 * Utility functions for merging, deduplicating, and managing Azure RBAC permission arrays.
 * Used by the Role Creator to handle permission manipulation across multiple buckets
 * (actions, notActions, dataActions, notDataActions).
 */

/**
 * Container for all four permission buckets used by Azure RBAC
 */
export interface PermissionBuckets {
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

/**
 * Merges two arrays, removes duplicates, and returns a sorted result.
 * Uses Set for efficient deduplication.
 *
 * @param existing - The existing array of permissions
 * @param incoming - The new array of permissions to merge
 * @returns A sorted array with unique permissions from both inputs
 *
 * @example
 * const current = ['Microsoft.Storage/read', 'Microsoft.Compute/read'];
 * const newPerms = ['Microsoft.Storage/write', 'Microsoft.Storage/read']; // duplicate
 * const merged = mergeAndSortPermissions(current, newPerms);
 * // Result: ['Microsoft.Compute/read', 'Microsoft.Storage/read', 'Microsoft.Storage/write']
 */
export function mergeAndSortPermissions(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming])).sort();
}

/**
 * Removes duplicates from an array and returns a sorted result.
 * Uses Set for efficient deduplication.
 *
 * @param permissions - The array of permissions to deduplicate
 * @returns A sorted array with unique permissions
 *
 * @example
 * const perms = ['Microsoft.Storage/read', 'Microsoft.Compute/read', 'Microsoft.Storage/read'];
 * const deduped = dedupeAndSort(perms);
 * // Result: ['Microsoft.Compute/read', 'Microsoft.Storage/read']
 */
export function dedupeAndSort(permissions: string[]): string[] {
  return Array.from(new Set(permissions)).sort();
}

/**
 * Merges all four permission buckets from two sources, deduplicates, and sorts each bucket.
 *
 * @param current - The current permission buckets
 * @param incoming - The incoming permission buckets to merge
 * @returns Merged and sorted permission buckets
 *
 * @example
 * const current = {
 *   actions: ['Microsoft.Storage/read'],
 *   notActions: [],
 *   dataActions: [],
 *   notDataActions: []
 * };
 * const incoming = {
 *   actions: ['Microsoft.Compute/read'],
 *   notActions: [],
 *   dataActions: ['Microsoft.Storage/blobs/read'],
 *   notDataActions: []
 * };
 * const merged = mergePermissionBuckets(current, incoming);
 * // Result: {
 * //   actions: ['Microsoft.Compute/read', 'Microsoft.Storage/read'],
 * //   notActions: [],
 * //   dataActions: ['Microsoft.Storage/blobs/read'],
 * //   notDataActions: []
 * // }
 */
export function mergePermissionBuckets(
  current: PermissionBuckets,
  incoming: PermissionBuckets
): PermissionBuckets {
  return {
    actions: mergeAndSortPermissions(current.actions, incoming.actions),
    notActions: mergeAndSortPermissions(current.notActions, incoming.notActions),
    dataActions: mergeAndSortPermissions(current.dataActions, incoming.dataActions),
    notDataActions: mergeAndSortPermissions(current.notDataActions, incoming.notDataActions)
  };
}

/**
 * Deduplicates all four permission buckets and sorts each bucket.
 *
 * @param buckets - The permission buckets to deduplicate
 * @returns Deduplicated and sorted permission buckets
 *
 * @example
 * const buckets = {
 *   actions: ['Microsoft.Storage/read', 'Microsoft.Storage/read', 'Microsoft.Compute/read'],
 *   notActions: [],
 *   dataActions: [],
 *   notDataActions: []
 * };
 * const deduped = dedupePermissionBuckets(buckets);
 * // Result: {
 * //   actions: ['Microsoft.Compute/read', 'Microsoft.Storage/read'],
 * //   notActions: [],
 * //   dataActions: [],
 * //   notDataActions: []
 * // }
 */
export function dedupePermissionBuckets(buckets: PermissionBuckets): PermissionBuckets {
  return {
    actions: dedupeAndSort(buckets.actions),
    notActions: dedupeAndSort(buckets.notActions),
    dataActions: dedupeAndSort(buckets.dataActions),
    notDataActions: dedupeAndSort(buckets.notDataActions)
  };
}

/**
 * Filters out specified permissions from all four permission buckets.
 *
 * @param buckets - The permission buckets to filter
 * @param toRemove - The permission buckets containing items to remove
 * @returns Filtered permission buckets
 *
 * @example
 * const buckets = {
 *   actions: ['Microsoft.Storage/read', 'Microsoft.Compute/read'],
 *   notActions: [],
 *   dataActions: [],
 *   notDataActions: []
 * };
 * const toRemove = {
 *   actions: ['Microsoft.Storage/read'],
 *   notActions: [],
 *   dataActions: [],
 *   notDataActions: []
 * };
 * const filtered = filterPermissionBuckets(buckets, toRemove);
 * // Result: {
 * //   actions: ['Microsoft.Compute/read'],
 * //   notActions: [],
 * //   dataActions: [],
 * //   notDataActions: []
 * // }
 */
export function filterPermissionBuckets(
  buckets: PermissionBuckets,
  toRemove: PermissionBuckets
): PermissionBuckets {
  return {
    actions: buckets.actions.filter(action => !toRemove.actions.includes(action)),
    notActions: buckets.notActions.filter(action => !toRemove.notActions.includes(action)),
    dataActions: buckets.dataActions.filter(action => !toRemove.dataActions.includes(action)),
    notDataActions: buckets.notDataActions.filter(action => !toRemove.notDataActions.includes(action))
  };
}
