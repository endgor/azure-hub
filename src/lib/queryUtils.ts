/**
 * Query string building utilities
 */

export interface QueryParams {
  ipOrDomain?: string;
  region?: string;
  service?: string;
  page?: number;
  pageSize?: number | 'all';
}

/**
 * Build a query string from params object
 * Omits undefined/null values and default values (page=1)
 */
export function buildQueryString(params: QueryParams): string {
  const urlParams = new URLSearchParams();

  if (params.ipOrDomain) {
    urlParams.append('ipOrDomain', params.ipOrDomain);
  }

  if (params.region) {
    urlParams.append('region', params.region);
  }

  if (params.service) {
    urlParams.append('service', params.service);
  }

  if (params.page && params.page > 1) {
    urlParams.append('page', params.page.toString());
  }

  if (params.pageSize) {
    urlParams.append('pageSize', params.pageSize.toString());
  }

  return urlParams.toString();
}

/**
 * Build a full URL with query string
 * Returns base path if no query params
 */
export function buildUrlWithQuery(basePath: string, params: QueryParams): string {
  const queryString = buildQueryString(params);
  const normalizedPath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}
