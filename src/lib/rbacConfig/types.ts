/**
 * Configuration types for role system calculators
 *
 * Centralizes all system-specific strings, scenarios, and UI configuration
 * to enable config-driven shared components.
 */

export interface Scenario {
  label: string;
  description: string;
  actions: readonly string[];
}

export interface Breadcrumb {
  name: string;
  url: string;
}

export interface RoleSystemConfig {
  /** System identifier */
  systemType: 'azure' | 'entraid';

  /** Display name of the role system */
  systemName: string;

  /** User-facing labels and text */
  labels: {
    /** Main page title */
    heroTitle: string;

    /** Category label (e.g., "Identity & Access") */
    categoryLabel: string;

    /** Service/namespace selection label */
    serviceLabel: string;

    /** Action/permission label */
    actionLabel: string;

    /** Search placeholder for actions */
    searchPlaceholder: string;

    /** Role Explorer mode title */
    roleExplorerTitle: string;

    /** Role Explorer search placeholder */
    roleExplorerPlaceholder: string;

    /** Help text explaining the role system */
    roleSystemHelpText: string;
  };

  /** Available input modes */
  modes: {
    available: ('simple' | 'advanced' | 'roleExplorer' | 'roleCompare' | 'roleCreator')[];
    default: 'simple' | 'advanced' | 'roleExplorer' | 'roleCompare' | 'roleCreator';
  };

  /** Mode-specific descriptions */
  descriptions: {
    simple: string;
    advanced: string;
    roleExplorer: string;
    roleCompare?: string;
    roleCreator?: string;
  };

  /** Example scenarios for quick testing */
  examples: Scenario[];

  /** Placeholder text for input fields */
  placeholders: {
    /** Advanced mode textarea placeholder */
    advancedMode: string;

    /** Wildcard example for help text */
    wildcardExample: string;
  };

  /** SEO and metadata */
  metadata: {
    /** Page title for SEO */
    title: string;

    /** Meta description */
    description: string;

    /** SEO keywords */
    keywords: string[];

    /** Breadcrumb navigation */
    breadcrumbs: Breadcrumb[];

    /** Tool schema name */
    toolSchemaName: string;
  };

  /** Cross-link to the other calculator */
  crossLink?: {
    text: string;
    url: string;
  };

  /** Disclaimer banner content */
  disclaimer: {
    /** Main description paragraph */
    description: string;

    /** List of important points to display */
    points: string[];
  };
}
