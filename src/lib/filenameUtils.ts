/**
 * Filename generation utilities
 * Provides consistent filename formatting with timestamps and sanitization
 */

/**
 * Generates ISO date timestamp in YYYY-MM-DD format.
 * Uses local timezone to ensure consistent date regardless of time of day.
 *
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getDateTimestamp() // "2025-11-03"
 */
export function getDateTimestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sanitizes a string for use in filenames by removing special characters.
 * Replaces non-alphanumeric characters with underscores and converts to lowercase.
 *
 * @param input - String to sanitize
 * @returns Sanitized string safe for filenames
 *
 * @example
 * sanitizeForFilename("192.168.0.1") // "192_168_0_1"
 * sanitizeForFilename("My Custom Role!") // "my_custom_role_"
 */
export function sanitizeForFilename(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Returns the singular or plural form of a word based on count.
 *
 * @param count - Number to check
 * @param singular - Singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns Appropriate word form based on count
 *
 * @example
 * pluralize(1, 'role') // "role"
 * pluralize(5, 'role') // "roles"
 * pluralize(0, 'role') // "roles"
 * pluralize(1, 'query', 'queries') // "query"
 * pluralize(2, 'query', 'queries') // "queries"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Generates a descriptive filename with sanitized query and timestamp.
 * Format: prefix_sanitizedQuery_YYYY-MM-DD.extension
 *
 * @param query - Query string to include in filename (will be sanitized)
 * @param format - File extension (e.g., 'csv', 'xlsx', 'json')
 * @param prefix - Optional prefix for the filename (defaults to 'export')
 * @returns Formatted filename with timestamp
 *
 * @example
 * generateQueryFilename("192.168.0.1", "xlsx") // "export_192_168_0_1_2025-11-03.xlsx"
 * generateQueryFilename("Storage", "csv", "azure-ip-ranges") // "azure-ip-ranges_storage_2025-11-03.csv"
 */
export function generateQueryFilename(
  query: string,
  format: string,
  prefix: string = 'export'
): string {
  const sanitizedQuery = sanitizeForFilename(query);
  const timestamp = getDateTimestamp();
  return `${prefix}_${sanitizedQuery}_${timestamp}.${format}`;
}

/**
 * Generates a descriptive filename for role exports with count and pluralization.
 * Format: prefix_count_role(s)_YYYY-MM-DD.extension
 *
 * @param count - Number of roles being exported
 * @param format - File extension (e.g., 'json', 'csv', 'xlsx')
 * @param prefix - Optional prefix for the filename (defaults to 'azure-rbac')
 * @returns Formatted filename with count and timestamp
 *
 * @example
 * generateCountFilename(1, "json") // "azure-rbac_1_role_2025-11-03.json"
 * generateCountFilename(5, "xlsx") // "azure-rbac_5_roles_2025-11-03.xlsx"
 * generateCountFilename(10, "csv", "custom-roles") // "custom-roles_10_roles_2025-11-03.csv"
 */
export function generateCountFilename(
  count: number,
  format: string,
  prefix: string = 'azure-rbac',
  itemName: string = 'role'
): string {
  const timestamp = getDateTimestamp();
  const itemLabel = pluralize(count, itemName);
  return `${prefix}_${count}_${itemLabel}_${timestamp}.${format}`;
}

/**
 * Generates a simple filename with sanitized name and timestamp.
 * Format: sanitizedName_YYYY-MM-DD.extension
 * Useful for custom role names or single-item exports.
 *
 * @param name - Name to include in filename (will be sanitized)
 * @param format - File extension (e.g., 'json', 'xlsx')
 * @param suffix - Optional suffix to append before extension (e.g., 'custom_role')
 * @returns Formatted filename
 *
 * @example
 * generateNameFilename("Storage Contributor", "json") // "storage_contributor_2025-11-03.json"
 * generateNameFilename("My Role", "json", "custom_role") // "my_role_custom_role_2025-11-03.json"
 */
export function generateNameFilename(
  name: string,
  format: string,
  suffix?: string
): string {
  const sanitizedName = sanitizeForFilename(name);
  const timestamp = getDateTimestamp();
  const parts = [sanitizedName];

  if (suffix) {
    parts.push(suffix);
  }

  parts.push(timestamp);

  return `${parts.join('_')}.${format}`;
}
