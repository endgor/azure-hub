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
 * Returns empty string if no query params (useful for conditional URLs)
 */
export function buildUrlWithQuery(basePath: string, params: QueryParams): string {
  const queryString = buildQueryString(params);
  return queryString ? `${basePath}?${queryString}` : '';
}

/**
 * Build a full URL with query string, always including the base path
 * Use this for navigation links where you want the path even without params
 */
export function buildUrlWithQueryOrBasePath(basePath: string, params: QueryParams): string {
  const queryString = buildQueryString(params);
  return queryString ? `${basePath}?${queryString}` : basePath;
}
