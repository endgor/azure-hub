/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

/**
 * Cache Configuration
 */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
export const CACHE_TTL_HOURS = 6;

/**
 * RBAC Role Relevance Scoring
 * Used in calculateNamespaceRelevance to rank roles by specificity
 */
export const RBAC_SCORING = {
  /** Bonus points for actions matching the exact required namespace */
  NAMESPACE_MATCH_BONUS: 100,

  /** Penalty for overly broad wildcards (asterisk, asterisk/read) */
  BROAD_WILDCARD_PENALTY: 50,

  /** Bonus points if role name mentions the namespace */
  ROLE_NAME_MATCH_BONUS: 200,

  /** Minimum namespace part length to check in role name */
  MIN_NAMESPACE_PART_LENGTH: 3
} as const;

/**
 * Performance Thresholds
 */
export const PERFORMANCE = {
  /** Threshold for considering performance optimization (milliseconds) */
  OPTIMIZATION_THRESHOLD_MS: 200,

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
