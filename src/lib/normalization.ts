const normalizationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

export function getCachedNormalization(str: string): string {
  let normalized = normalizationCache.get(str);
  if (normalized === undefined) {
    normalized = str.replace(/[-\s]/g, '').toLowerCase();

    if (normalizationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = normalizationCache.keys().next().value;
      if (firstKey !== undefined) {
        normalizationCache.delete(firstKey);
      }
    }

    normalizationCache.set(str, normalized);
  } else {
    normalizationCache.delete(str);
    normalizationCache.set(str, normalized);
  }
  return normalized;
}
