/**
 * Pattern matching utilities for Azure RBAC actions.
 * Handles wildcard pattern matching for permissions.
 */

/**
 * Check if an action matches a pattern (with wildcard support)
 */
export function matchesPattern(action: string, pattern: string): boolean {
  const actionLower = action.toLowerCase();
  const patternLower = pattern.toLowerCase();

  if (!patternLower.includes('*')) {
    return actionLower === patternLower;
  }

  const regexPattern = patternLower
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);

  return regex.test(actionLower);
}
