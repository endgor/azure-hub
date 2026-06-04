/**
 * Regional service-tag variants (e.g. "Storage.WestEurope") no longer have their own
 * pages. They are consolidated into the base tag page ("Storage") as a region filter,
 * so every tag ID — base or regional — resolves to its base page URL. Base tag names
 * never contain a dot, so the URL always carries a trailing slash (matching the global
 * trailingSlash config and avoiding redirect chains).
 */
export function getServiceTagBaseId(serviceTag: string): string {
  return serviceTag.split('.')[0];
}

export function getServiceTagPath(serviceTag: string): string {
  const baseId = getServiceTagBaseId(serviceTag);
  return `/tools/service-tags/${encodeURIComponent(baseId)}/`;
}

export function getServiceTagCanonicalUrl(serviceTag: string): string {
  return `https://azurehub.org${getServiceTagPath(serviceTag)}`;
}
