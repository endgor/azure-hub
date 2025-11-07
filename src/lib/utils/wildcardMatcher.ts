/**
 * Shared wildcard matching utility for Azure RBAC permissions.
 * Used by both runtime code and build-time scripts to ensure consistent behavior.
 *
 * This utility implements Azure's wildcard matching semantics:
 * - Exact matches are supported
 * - Full wildcard (*) matches everything
 * - Partial wildcards (e.g., Microsoft.Storage/*) match patterns
 * - Case-insensitive matching
 *
 * Performance optimization: Regex patterns are cached to avoid recompilation
 * on repeated calls with the same pattern.
 *
 * @example
 * matchesWildcard('Microsoft.Storage/*', 'Microsoft.Storage/read') // true
 * matchesWildcard('*', 'anything') // true
 * matchesWildcard('Microsoft.Compute/virtualMachines/read', 'Microsoft.Compute/virtualMachines/read') // true
 */

/**
 * Cache for compiled regex patterns to avoid recompilation.
 * Key is the normalized lowercase pattern, value is the compiled RegExp.
 */
const regexCache = new Map<string, RegExp>();

/**
 * Check if a permission action matches a wildcard pattern.
 * Case-insensitive matching with support for Azure RBAC wildcards.
 *
 * @param pattern - The wildcard pattern to match against (e.g., "Microsoft.Storage/*")
 * @param action - The action to check (e.g., "Microsoft.Storage/read")
 * @returns true if the action matches the pattern, false otherwise
 */
export function matchesWildcard(pattern: string, action: string): boolean {
  if (!pattern || !action) return false;

  // Normalize to lowercase for case-insensitive matching
  const normalizedPattern = pattern.toLowerCase();
  const normalizedAction = action.toLowerCase();

  // Exact match
  if (normalizedPattern === normalizedAction) return true;

  // Full wildcard
  if (normalizedPattern === '*') return true;

  // Check cache for compiled regex
  let regex = regexCache.get(normalizedPattern);

  if (!regex) {
    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const regexPattern = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // Replace * with .*

    regex = new RegExp(`^${regexPattern}$`);
    regexCache.set(normalizedPattern, regex);
  }

  return regex.test(normalizedAction);
}
