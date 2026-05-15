import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import RecentChangesCard from '@/components/RecentChangesCard';
import IpLookupResults from '@/components/IpLookupResults';
import { buildUrlWithQuery } from '@/lib/queryUtils';
import { classifySearchInput } from '@/lib/utils/searchClassifier';
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

  const pageTitle = useMemo(() => {
    const parts = [];
    if (initialQuery) parts.push(`IP/Domain: ${initialQuery}`);
    if (initialService) parts.push(`Service: ${initialService}`);
    if (initialRegion) parts.push(`Region: ${initialRegion}`);
    return parts.join(', ') || 'All Results';
  }, [initialQuery, initialService, initialRegion]);

  return (
    <Layout
      title="Azure IP Lookup - Verify IP Addresses & Service Tags"
      description="Check if an IP address, CIDR range, or hostname belongs to Microsoft Azure. Search across all public, government, and China cloud regions with service tag filtering."
      keywords={[
        'azure ip lookup',
        'azure ip checker',
        'azure ip ranges',
        'azure ip address lookup',
        'azure service tags',
        'azure cidr lookup',
        'microsoft azure ip',
        'azure networking tools',
        'verify azure ip',
        'azure ip verification'
      ]}
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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">
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
          variant="full-width"
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 dark:bg-slate-900">
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
              <IpLookupResults
                results={results}
                query={pageTitle}
              />
            )}

            {!isLoading && !isNotFound && !isError && results.length === 0 && (initialQuery || initialRegion || initialService) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
                No Azure IP ranges found matching your search criteria.
              </div>
            )}

            {!initialQuery && !initialRegion && !initialService && (
              <section className="rounded-xl bg-white dark:bg-slate-900">
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Try an example</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Click any value to run the lookup — IPs, CIDRs, hostnames, service tags, or Azure regions.
                  </p>
                </div>
                <ul className="divide-y divide-slate-200/70 p-2 dark:divide-slate-700/60">
                  {SAMPLE_QUERIES.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={{ pathname: '/tools/ip-lookup', query: classifySearchInput(item.example) }}
                        className="group flex items-center gap-4 rounded-md px-2 py-3.5 transition hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                          {item.icon}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {item.label}
                          </span>
                          <span className="break-all font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                            {item.example}
                          </span>
                          <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {item.description}
                          </span>
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 flex-shrink-0 -translate-x-2 text-slate-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-blue-500 group-hover:opacity-100 dark:group-hover:text-blue-400"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside>
            <RecentChangesCard />
          </aside>
        </div>
      </section>
    </Layout>
  );
}

const SAMPLE_QUERIES = [
  {
    label: 'IP Address',
    example: '40.112.127.224',
    description: 'Verify if an IPv4 address belongs to Azure.',
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  },
  {
    label: 'CIDR Range',
    example: '74.7.51.32/29',
    description: 'Find Azure service tags covering a CIDR block.',
    accent: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M15 4 9 20" />
        <path d="M5 8.5h3M5 15.5h3M16 8.5h3M16 15.5h3" />
      </svg>
    )
  },
  {
    label: 'Hostname (DNS)',
    example: 'management.azure.com',
    description: 'Resolve hostname to IP and find matching service tags.',
    accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="9" ry="4" />
        <path d="M3 12h18M12 3v18" />
      </svg>
    )
  },
  {
    label: 'Service Tag',
    example: 'Storage',
    description: 'Explore addresses assigned to a specific service tag.',
    accent: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    label: 'Region',
    example: 'WestEurope',
    description: 'List ranges available in an Azure region.',
    accent: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    )
  }
];
