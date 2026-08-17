/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

/**
 * Cache Configuration
 */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Performance Thresholds
 */
export const PERFORMANCE = {
  /** Idle callback timeout for non-blocking operations (milliseconds) */
  IDLE_CALLBACK_TIMEOUT_MS: 2000,

  /** Fallback delay for browsers without requestIdleCallback (milliseconds) */
  IDLE_CALLBACK_FALLBACK_MS: 100
} as const;

/**
 * Search and Pagination
 */
export const SEARCH = {
  /** Minimum query length for search operations */
  MIN_QUERY_LENGTH: 2
} as const;
