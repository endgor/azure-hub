import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import { buildUrlWithQuery } from '@/lib/queryUtils';
import type { AzureIpAddress } from '@/types/azure';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';

/**
 * Fetches IP lookup data from the server-side API.
 * This eliminates the 4MB+ download of AzureCloud.json to the browser.
 * All CIDR matching and DNS resolution now happens server-side.
 */
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
    // Build API URL from the key (which contains query parameters)
    const url = new URL(`http://localhost${key}`);
    const params = new URLSearchParams();

    const ipOrDomain = url.searchParams.get('ipOrDomain');
    const region = url.searchParams.get('region');
    const service = url.searchParams.get('service');

    if (ipOrDomain) params.set('ipOrDomain', ipOrDomain);
    if (region) params.set('region', region);
    if (service) params.set('service', service);

    // Call server-side API
    const response = await fetch(`/api/ipLookup?${params.toString()}`);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error('Failed to fetch IP data');
    }

    const data = await response.json() as ApiResponse;
    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded. Please try again later.') {
      throw error;
    }
    throw new Error('Failed to load data. Please check your input and try again.');
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
      } catch {
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
    const url = buildUrlWithQuery('/tools/ip-lookup', {
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
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'IP Lookup', url: 'https://azurehub.org/tools/ip-lookup/' }
      ]}
      toolSchema={{
        name: 'Azure IP Lookup Tool',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Networking
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Azure IP Lookup</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Search Azure public IP ranges across all service tags and regions. Lookup IP addresses, CIDR blocks, or hostnames to identify Azure services and network boundaries.
          </p>
        </div>

        <LookupForm
          initialValue={initialQuery}
          initialRegion={initialRegion}
          initialService={initialService}
        />

        <div className="space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <LoadingSpinner size="lg" label="Looking up Azure IP information..." />
            </div>
          )}

          {isError && errorMessage && (
            <ErrorBox>
              {errorMessage}
            </ErrorBox>
          )}

          {isNotFound && notFoundMessage && (
            <ErrorBox variant="warning">
              {notFoundMessage}
            </ErrorBox>
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
