import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import Pagination from '@/components/Pagination';
import { checkIpAddress, searchAzureIpAddresses } from '@/lib/clientIpService';
import type { AzureIpAddress } from '@/types/azure';

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
      if (/^\d+\.\d+/.test(ipOrDomain) || ipOrDomain.includes('/')) {
        results = await checkIpAddress(ipOrDomain);
      } else {
        const serviceResults = await searchAzureIpAddresses({ service: ipOrDomain });
        const regionResults = await searchAzureIpAddresses({ region: ipOrDomain });
        const combinedResults = [...serviceResults, ...regionResults];
        const uniqueResults = combinedResults.filter(
          (item, index, array) =>
            index ===
            array.findIndex(
              (t) => t.ipAddressPrefix === item.ipAddressPrefix && t.serviceTagId === item.serviceTagId
            )
        );
        results = uniqueResults;
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

    const params = new URLSearchParams();
    if (initialQuery) params.append('ipOrDomain', initialQuery);
    if (initialRegion) params.append('region', initialRegion);
    if (initialService) params.append('service', initialService);
    if (initialPage > 1) params.append('page', initialPage.toString());
    if (initialPageSize === 'all') params.append('pageSize', 'all');

    const queryString = params.toString();
    return queryString ? `/client/ipAddress?${queryString}` : null;
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

  const handlePageSizeChange = (newPageSize: number | 'all') => {
    const params = new URLSearchParams();
    if (initialQuery) params.append('ipOrDomain', initialQuery);
    if (initialRegion) params.append('region', initialRegion);
    if (initialService) params.append('service', initialService);
    if (newPageSize === 'all') {
      params.append('pageSize', 'all');
    } else if (newPageSize !== DEFAULT_PAGE_SIZE) {
      params.append('pageSize', newPageSize.toString());
    }

    const queryString = params.toString();
    router.push(queryString ? `/tools/ip-lookup?${queryString}` : '/tools/ip-lookup');
  };

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
          <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Search by IP, CIDR, service tag, or region to quickly verify whether an address belongs to Azure infrastructure.
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
            <div className="space-y-6">
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalResults}
                  pageSize={effectivePageSize}
                  isAll={isAll}
                  basePath="/tools/ip-lookup"
                  position="top"
                  onPageSizeChange={handlePageSizeChange}
                  query={{
                    ipOrDomain: initialQuery,
                    region: initialRegion,
                    service: initialService
                  }}
                />
              )}

              <Results results={results} query={pageTitle} total={totalResults} />

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalResults}
                  pageSize={effectivePageSize}
                  isAll={isAll}
                  basePath="/tools/ip-lookup"
                  position="bottom"
                  onPageSizeChange={handlePageSizeChange}
                  query={{
                    ipOrDomain: initialQuery,
                    region: initialRegion,
                    service: initialService
                  }}
                />
              )}
            </div>
          )}

          {!isLoading && !isNotFound && !isError && results.length === 0 && (initialQuery || initialRegion || initialService) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
              No Azure IP ranges found matching your search criteria.
            </div>
          )}
        </div>

        {!initialQuery && !initialRegion && !initialService && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sample queries</h2>
            <p className="text-sm text-slate-600">
              Use IP addresses, CIDR notations, service tags, or Azure regions to explore the dataset.
            </p>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {SAMPLE_QUERIES.map((item) => (
                <div key={item.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="font-mono text-sm text-slate-900">{item.example}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
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
