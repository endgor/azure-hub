/**
 * Intelligent sorting comparator for search results.
 * Prioritizes results in the following order:
 * 1. Exact matches (case-insensitive)
 * 2. Items that start with the query (case-insensitive)
 * 3. Remaining items sorted alphabetically
 *
 * This ensures that when searching for "Contributor", it appears at the top
 * even if there are many other results that contain "contributor" in the middle.
 *
 * @param query - The search query string
 * @param getItemText - Function to extract the text to compare from an item
 * @returns A comparator function that can be used with Array.sort()
 *
 * @example
 * // For simple string arrays
 * const roles = ['Storage Account Contributor', 'Contributor', 'Network Contributor'];
 * const sorted = roles.filter(r => r.toLowerCase().includes('contributor'))
 *   .sort(intelligentSearchSort('contributor', (item) => item));
 * // Result: ['Contributor', 'Network Contributor', 'Storage Account Contributor']
 *
 * @example
 * // For object arrays
 * interface Role { roleName: string; }
 * const roles: Role[] = [...];
 * const sorted = roles.filter(r => r.roleName.toLowerCase().includes('contributor'))
 *   .sort(intelligentSearchSort('contributor', (role) => role.roleName));
 */
export function intelligentSearchSort<T>(
  query: string,
  getItemText: (item: T) => string
): (a: T, b: T) => number {
  const queryLower = query.toLowerCase();

  return (a: T, b: T) => {
    const aText = getItemText(a).toLowerCase();
    const bText = getItemText(b).toLowerCase();

    // Exact match gets highest priority
    const aExact = aText === queryLower;
    const bExact = bText === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Items starting with query get second priority
    const aStarts = aText.startsWith(queryLower);
    const bStarts = bText.startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Alphabetical sorting for remaining items
    return aText.localeCompare(bText);
  };
}

/**
 * Filter and sort items based on a search query with intelligent sorting.
 * This is a convenience function that combines filtering and sorting in one call.
 *
 * @param items - The array of items to filter and sort
 * @param query - The search query string
 * @param getItemText - Function to extract the text to search and sort by
 * @param maxResults - Optional maximum number of results to return (default: no limit)
 * @returns Filtered and sorted array of items
 *
 * @example
 * const roles = ['Storage Account Contributor', 'Contributor', 'Network Contributor'];
 * const results = filterAndSortByQuery(roles, 'contributor', (item) => item, 10);
 * // Result: ['Contributor', 'Network Contributor', 'Storage Account Contributor']
 */
export function filterAndSortByQuery<T>(
  items: T[],
  query: string,
  getItemText: (item: T) => string,
  maxResults?: number
): T[] {
  if (!query.trim()) {
    return maxResults ? items.slice(0, maxResults) : items;
  }

  const queryLower = query.toLowerCase();
  const filtered = items.filter(item =>
    getItemText(item).toLowerCase().includes(queryLower)
  );

  const sorted = filtered.sort(intelligentSearchSort(query, getItemText));

  return maxResults ? sorted.slice(0, maxResults) : sorted;
}
