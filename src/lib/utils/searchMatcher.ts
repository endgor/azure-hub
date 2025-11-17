import { getCachedNormalization } from '../normalization';

/**
 * Multi-strategy search term matcher with normalization.
 * Handles:
 * 1. Substring matching (case-insensitive)
 * 2. Normalized matching for camelCase/PascalCase variations
 *    (e.g., "WestEurope" matches "west europe")
 *
 * Uses LRU-cached normalization for performance.
 *
 * @param target - The string to search in
 * @param searchTerm - The search term to look for
 * @returns true if searchTerm matches target, false otherwise
 */
export function matchesSearchTerm(target: string, searchTerm: string): boolean {
  if (!target) return false;

  const targetLower = target.toLowerCase();
  const searchLower = searchTerm.toLowerCase();

  // Strategy 1: Direct substring match
  if (targetLower.includes(searchLower)) return true;

  // Strategy 2: Normalized match (splits camelCase and removes extra spaces)
  const normalizedTarget = getCachedNormalization(target.replace(/([a-z])([A-Z])/g, '$1 $2'));
  const normalizedSearch = getCachedNormalization(searchTerm.replace(/([a-z])([A-Z])/g, '$1 $2'));

  return normalizedTarget.includes(normalizedSearch);
}
