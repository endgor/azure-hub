/**
 * Normalizes and validates a domain string.
 * Returns the normalized domain or null if invalid.
 */
export function normalizeDomain(rawDomain: string | null): string | null {
  if (!rawDomain) return null;
  const trimmed = rawDomain.trim().toLowerCase();
  const domainRegex = /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;
  return trimmed && domainRegex.test(trimmed) ? trimmed : null;
}
