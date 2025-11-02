import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import { checkIpAddress, searchAzureIpAddresses } from '@/lib/clientIpService';
import { buildUrlWithQuery, buildUrlWithQueryOrBasePath } from '@/lib/queryUtils';
import type { AzureIpAddress } from '@/types/azure';

/**
 * Check if a string is a hostname (not an IP or CIDR)
 */
function isHostname(input: string): boolean {
  // Has dots and doesn't start with a digit (likely hostname)
  // Also check it's not a CIDR notation
  if (!input.includes('.') || input.includes('/')) {
    return false;
  }

  // Check if it looks like an IP address (starts with digit)
  if (/^\d+\.\d+/.test(input)) {
    return false;
  }

  // Likely a hostname
  return true;
}

/**
 * Deduplicate Azure IP address results based on IP prefix and service tag
 */
function deduplicateResults(results: AzureIpAddress[]): AzureIpAddress[] {
  return results.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (t) => t.ipAddressPrefix === item.ipAddressPrefix && t.serviceTagId === item.serviceTagId
      )
  );
}

const clientFetcher = async (key: string): Promise<ApiResponse> => {
  if (!key) {
    return {
      results: [],
      total: 0,
      notFound: true,
      message: 'No query provided'
    };
  }

  try {
    const url = new URL(`http://localhost${key}`);
    const ipOrDomain = url.searchParams.get('ipOrDomain') || undefined;
    const region = url.searchParams.get('region') || undefined;
    const service = url.searchParams.get('service') || undefined;

    let results: AzureIpAddress[] = [];

    if (ipOrDomain) {
      // Check if it's an IP address or CIDR
      if (/^\d+\.\d+/.test(ipOrDomain) || ipOrDomain.includes('/')) {
        results = await checkIpAddress(ipOrDomain);
      }
      // Check if it's a hostname that needs DNS resolution
      else if (isHostname(ipOrDomain)) {
        try {
          // Call DNS lookup API
          const dnsResponse = await fetch(`/api/dnsLookup?hostname=${encodeURIComponent(ipOrDomain)}`);
          const dnsData = await dnsResponse.json();

          if (dnsData.ipAddresses && dnsData.ipAddresses.length > 0) {
            // For each resolved IP, check Azure service tags
            const allMatches: AzureIpAddress[] = [];

            for (const resolvedIp of dnsData.ipAddresses) {
              const matches = await checkIpAddress(resolvedIp);
              // Tag each result with DNS info
              matches.forEach(match => {
                match.resolvedFrom = ipOrDomain;
                match.resolvedIp = resolvedIp;
              });
              allMatches.push(...matches);
            }

            results = allMatches;
          } else if (dnsData.error) {
            // DNS lookup failed, fall back to service/region search
            const serviceResults = await searchAzureIpAddresses({ service: ipOrDomain });
            const regionResults = await searchAzureIpAddresses({ region: ipOrDomain });
            results = deduplicateResults([...serviceResults, ...regionResults]);
          }
        } catch (dnsError) {
          // If DNS lookup fails, fall back to service/region search
          const serviceResults = await searchAzureIpAddresses({ service: ipOrDomain });
          const regionResults = await searchAzureIpAddresses({ region: ipOrDomain });
          results = deduplicateResults([...serviceResults, ...regionResults]);
        }
      }
      // Otherwise treat as service/region search
      else {
        const serviceResults = await searchAzureIpAddresses({ service: ipOrDomain });
        const regionResults = await searchAzureIpAddresses({ region: ipOrDomain });
        results = deduplicateResults([...serviceResults, ...regionResults]);
      }
    } else {
      results = await searchAzureIpAddresses({ region, service });
    }

    if (results.length === 0) {
      return {
        notFound: true,
        message: 'No Azure IP ranges found matching your search criteria',
        results: [],
        total: 0
      };
    }

    return {
      results,
      total: results.length,
      query: { ipOrDomain, region, service }
    };
  } catch (error) {
    throw error;
  }
};

interface ApiResponse {
  results: AzureIpAddress[];
  query?: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
  total: number;
  page?: number;
  pageSize?: number;
  error?: string;
  notFound?: boolean;
  message?: string;
}

const DEFAULT_PAGE_SIZE = 50;

export default function IpLookupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryParams, setQueryParams] = useState({
    initialQuery: '',
    initialRegion: '',
    initialService: '',
    initialPage: 1,
    initialPageSize: 50 as number | 'all'
  });

  useEffect(() => {
    if (router.isReady) {
      setQueryParams({
        initialQuery: (router.query.ipOrDomain as string) || '',
        initialRegion: (router.query.region as string) || '',
        initialService: (router.query.service as string) || '',
        initialPage: parseInt((router.query.page as string) || '1', 10),
        initialPageSize:
          router.query.pageSize === 'all'
            ? 'all'
            : parseInt((router.query.pageSize as string) || '50', 10)
      });
    }
  }, [router.isReady, router.query]);

  const { initialQuery, initialRegion, initialService, initialPage, initialPageSize } = queryParams;

  useEffect(() => {
    setError(null);
  }, [initialQuery, initialRegion, initialService, initialPage, initialPageSize]);

  const apiUrl = useMemo(() => {
    if (!router.isReady) return null;

    // Don't fetch if there are no search parameters
    if (!initialQuery && !initialRegion && !initialService) {
      return null;
    }

    return buildUrlWithQuery('/client/ipAddress', {
      ipOrDomain: initialQuery,
      region: initialRegion,
      service: initialService,
      page: initialPage,
      // Only include pageSize if it's 'all' (numeric sizes are handled client-side)
      pageSize: initialPageSize === 'all' ? 'all' : undefined
    });
  }, [router.isReady, initialQuery, initialRegion, initialService, initialPage, initialPageSize]);

  useEffect(() => {
    if (!apiUrl) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await clientFetcher(apiUrl);
        setData(result);
      } catch (err) {
        setError('Failed to load data. Please check your input and try again.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const isError = error || (data && 'error' in data && !data.notFound);
  const isNotFound = data?.notFound === true;
  const errorMessage = error || (isError && data && 'error' in data ? data.error : null);
  const notFoundMessage = isNotFound && data?.message ? data.message : null;
  const results = data && !isError && data.results ? data.results : [];
  const totalResults = data && !isError ? data.total || 0 : 0;
  const currentPage = data && !isError ? data.page || 1 : 1;
  const apiPageSize = data && !isError ? data.pageSize || DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE;
  const isAll = initialPageSize === 'all' || apiPageSize >= totalResults;
  const effectivePageSize =
    initialPageSize === 'all' ? totalResults : typeof initialPageSize === 'number' ? initialPageSize : DEFAULT_PAGE_SIZE;
  const totalPages = Math.ceil(totalResults / (effectivePageSize || DEFAULT_PAGE_SIZE));

  const handlePageSizeChange = useCallback((newPageSize: number | 'all') => {
    const url = buildUrlWithQueryOrBasePath('/tools/ip-lookup', {
      ipOrDomain: initialQuery,
      region: initialRegion,
      service: initialService,
      pageSize: newPageSize === DEFAULT_PAGE_SIZE ? undefined : newPageSize
    });
    router.push(url);
  }, [router, initialQuery, initialRegion, initialService]);

  const pageTitle = useMemo(() => {
    const parts = [];
    if (initialQuery) parts.push(`IP/Domain: ${initialQuery}`);
    if (initialService) parts.push(`Service: ${initialService}`);
    if (initialRegion) parts.push(`Region: ${initialRegion}`);
    return parts.join(', ') || 'All Results';
  }, [initialQuery, initialService, initialRegion]);

  return (
    <Layout
      title="Azure IP Lookup"
      description="Search Microsoft Azure IP ranges, CIDR prefixes, and service tags with the Azure Hub IP lookup tool."
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Networking
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl lg:text-4xl">Azure IP Lookup</h1>
        </div>

        <LookupForm
          initialValue={initialQuery}
          initialRegion={initialRegion}
          initialService={initialService}
        />

        <div className="space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
              <p className="text-slate-600 dark:text-slate-300">Looking up Azure IP information...</p>
            </div>
          )}

          {isError && errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {isNotFound && notFoundMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
              {notFoundMessage}
            </div>
          )}

          {!isLoading && !isError && results.length > 0 && (
            <Results
              results={results}
              query={pageTitle}
              total={totalResults}
              pagination={totalPages > 1 ? {
                currentPage,
                totalPages,
                totalItems: totalResults,
                pageSize: effectivePageSize,
                isAll,
                onPageSizeChange: handlePageSizeChange,
                basePath: '/tools/ip-lookup',
                query: {
                  ipOrDomain: initialQuery,
                  region: initialRegion,
                  service: initialService
                }
              } : undefined}
            />
          )}

          {!isLoading && !isNotFound && !isError && results.length === 0 && (initialQuery || initialRegion || initialService) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
              No Azure IP ranges found matching your search criteria.
            </div>
          )}
        </div>

        {!initialQuery && !initialRegion && !initialService && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sample queries</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Use IP addresses, CIDR notations, hostnames (with DNS lookup), service tags, or Azure regions to explore the dataset.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {SAMPLE_QUERIES.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="break-all font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.example}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </Layout>
  );
}

const SAMPLE_QUERIES = [
  {
    label: 'IP Address',
    example: '40.112.127.224',
    description: 'Verify if an IPv4 address belongs to Azure.'
  },
  {
    label: 'CIDR Range',
    example: '74.7.51.32/29',
    description: 'Find Azure IP ranges overlapping with your block.'
  },
  {
    label: 'Hostname (DNS)',
    example: 'myaccount.blob.core.windows.net',
    description: 'Resolve hostname to IP and find matching service tags.'
  },
  {
    label: 'Service Tag',
    example: 'Storage',
    description: 'Explore addresses assigned to a specific service tag.'
  },
  {
    label: 'Region',
    example: 'WestEurope',
    description: 'List ranges available in an Azure region.'
  }
] as const;
