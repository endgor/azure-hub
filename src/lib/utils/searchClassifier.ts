/**
 * Search input classification utility for Azure resource lookup.
 * Parses user input and determines whether it's an IP/domain, service, region, or Service.Region format.
 */

/**
 * Known Azure region naming patterns.
 * These patterns help identify region-like inputs.
 */
const REGION_PATTERNS = [
  /^(west|east|north|south|central|australia|brazil|canada|france|germany|india|japan|korea|norway|qatar|sweden|switzerland|uae|uk)/i
];

/**
 * Known Azure service prefixes.
 * These patterns help identify service-like inputs.
 */
const SERVICE_PATTERNS = [
  /^azure/i,
  /^sql/i,
  /^app/i,
  /^storage/i,
  /^key/i,
  /^api/i,
  /^cognitive/i,
  /^event/i
];

/**
 * Query parameters for routing.
 * Uses Record type to ensure compatibility with Next.js router query parameters.
 */
export type SearchQuery = Record<string, string>;

/**
 * Classifies a search input string into query parameters.
 * Determines the type of search based on the input format.
 *
 * @param input - The raw search input from the user
 * @returns Query parameters object for routing
 *
 * @example
 * classifySearchInput('192.168.1.1') // { ipOrDomain: '192.168.1.1' }
 * classifySearchInput('Storage.WestEurope') // { service: 'Storage', region: 'WestEurope' }
 * classifySearchInput('westus') // { region: 'westus' }
 * classifySearchInput('AzureSQL') // { service: 'AzureSQL' }
 */
export function classifySearchInput(input: string): SearchQuery {
  // Clean up the input - standardize spaces
  const cleanedInput = input.trim().replace(/\s+/g, ' ');

  // Check if it's a CIDR notation (has a slash followed by numbers)
  if (/\/\d+$/.test(cleanedInput)) {
    return { ipOrDomain: cleanedInput };
  }

  // Check if input looks like an IP address (at least one number with dots)
  if (/^\d+\.\d+/.test(cleanedInput)) {
    return { ipOrDomain: cleanedInput };
  }

  // Check if input has a dot and might be a domain or Service.Region format
  if (cleanedInput.includes('.')) {
    const parts = cleanedInput.split('.');

    // If it looks like Service.Region (e.g., Storage.WestEurope)
    if (parts.length === 2 && /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[0]) && /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[1])) {
      return { service: parts[0], region: parts[1] };
    }

    // Otherwise treat as a domain name
    return { ipOrDomain: cleanedInput };
  }

  // Check if it matches known region naming pattern (just letters and numbers)
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(cleanedInput)) {
    // This could be either a service tag or region name

    // Check if it matches a region pattern
    const isRegion = REGION_PATTERNS.some(pattern => pattern.test(cleanedInput));

    // Check if it matches a service pattern
    const isService = SERVICE_PATTERNS.some(pattern => pattern.test(cleanedInput));

    if (isRegion && !isService) {
      // Clear region match and not a service
      return { region: cleanedInput };
    }

    if (isService && !isRegion) {
      // Clear service match and not a region
      return { service: cleanedInput };
    }

    // If ambiguous or doesn't match patterns, let the backend handle both options
    // by searching both as service and region
    return { ipOrDomain: cleanedInput };
  }

  // For anything else, just pass it as ipOrDomain
  return { ipOrDomain: cleanedInput };
}
