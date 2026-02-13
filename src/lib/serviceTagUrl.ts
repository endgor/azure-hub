/**
 * Next.js treats path segments containing dots as file-like and normalizes them
 * without a trailing slash. Keep URL generation aligned to avoid redirect chains.
 */
export function getServiceTagPath(serviceTag: string): string {
  const encodedTag = encodeURIComponent(serviceTag);
  const hasDot = serviceTag.includes('.');
  return hasDot
    ? `/tools/service-tags/${encodedTag}`
    : `/tools/service-tags/${encodedTag}/`;
}

export function getServiceTagCanonicalUrl(serviceTag: string): string {
  return `https://azurehub.org${getServiceTagPath(serviceTag)}`;
}
