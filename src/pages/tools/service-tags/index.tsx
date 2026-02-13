import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAllServiceTagsWithCloud, ServiceTagIndex } from '@/lib/clientIpIndexService';
import { AzureCloudName } from '@/types/azure';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import SearchInput from '@/components/shared/SearchInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import { useClickOutside } from '@/hooks/useClickOutside';
import { getServiceTagPath } from '@/lib/serviceTagUrl';

/** Cloud filter options */
type CloudFilter = 'all' | AzureCloudName;

const CLOUD_FILTER_OPTIONS: { value: CloudFilter; label: string }[] = [
  { value: 'all', label: 'All Clouds' },
  { value: AzureCloudName.AzureCloud, label: 'Public' },
  { value: AzureCloudName.AzureUSGovernment, label: 'Government' },
  { value: AzureCloudName.AzureChinaCloud, label: 'China' }
];

/** Maps cloud enum to display label */
const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Gov',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

/** Maps cloud enum to badge styling */
const CLOUD_STYLES: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  [AzureCloudName.AzureUSGovernment]: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  [AzureCloudName.AzureChinaCloud]: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
};

/**
 * Fetcher function for service tags list.
 * Uses lightweight index (~400 KB) instead of full data (~3.9 MB) for 10x faster load.
 */
const clientServiceTagsFetcher = async () => {
  try {
    const serviceTags = await getAllServiceTagsWithCloud();
    return { serviceTags };
  } catch (error) {
    throw error;
  }
};

interface ServiceTagsResponse {
  serviceTags: ServiceTagIndex[];
}

export default function ServiceTags() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all');
  const [isCloudFilterOpen, setIsCloudFilterOpen] = useState(false);
  const cloudFilterRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ServiceTagsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useClickOutside(cloudFilterRef as React.RefObject<HTMLElement>, () => setIsCloudFilterOpen(false), isCloudFilterOpen);

  // Fetch service tags on component mount
  useEffect(() => {
    const fetchServiceTags = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await clientServiceTagsFetcher();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceTags();
  }, []);

  // Filter service tags based on search term and cloud filter
  const filteredServiceTags = useMemo(() => {
    if (!data?.serviceTags) return [];

    let filtered = data.serviceTags;

    // Apply cloud filter
    if (cloudFilter !== 'all') {
      filtered = filtered.filter(tag => tag.cloud === cloudFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filterAndSortByQuery(filtered, searchTerm, (tag) => tag.id);
    }

    return filtered;
  }, [data?.serviceTags, searchTerm, cloudFilter]);

  return (
    <Layout
      title="Azure Service Tags - Browse IP Ranges & Network Features"
      description="Explore Microsoft Azure service tags, discover associated IP ranges, and research network dependencies by cloud region."
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'Service Tags', url: 'https://azurehub.org/tools/service-tags/' }
      ]}
      toolSchema={{
        name: 'Azure Service Tags Explorer',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">Networking</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Azure Service Tags</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Browse all Azure service tags with IP address ranges, regional endpoints, and network features. Essential for firewall rules, NSG configuration, and network security planning.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            type="text"
            placeholder="Search service tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            maxWidth="sm"
          />

          {/* Cloud Filter Dropdown */}
          <div className="relative inline-block text-left" ref={cloudFilterRef}>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500"
              onClick={() => setIsCloudFilterOpen(!isCloudFilterOpen)}
              aria-expanded={isCloudFilterOpen}
              aria-haspopup="true"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              {CLOUD_FILTER_OPTIONS.find(o => o.value === cloudFilter)?.label}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCloudFilterOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>

            {isCloudFilterOpen && (
              <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {CLOUD_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setCloudFilter(option.value);
                        setIsCloudFilterOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                        cloudFilter === option.value
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400'
                          : 'text-slate-700 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-sky-900/20 dark:hover:text-sky-400'
                      }`}
                      role="menuitem"
                    >
                      {cloudFilter === option.value && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className={cloudFilter === option.value ? '' : 'ml-7'}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <LoadingSpinner size="lg" label="Loading service tags..." />
          </div>
        )}

        {error && (
          <ErrorBox title="Error loading service tags">
            {error.message}
          </ErrorBox>
        )}

        {data && !isLoading && (
          <div className="space-y-6">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredServiceTags.length}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{data.serviceTags.length}</span> service tags
              {searchTerm && (
                <span className="ml-2 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
                  Match: “{searchTerm}”
                </span>
              )}
            </div>

            {filteredServiceTags.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServiceTags.map((serviceTag) => (
                  <Link
                    key={`${serviceTag.id}-${serviceTag.cloud}`}
                    href={`${getServiceTagPath(serviceTag.id)}?cloud=${encodeURIComponent(serviceTag.cloud)}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800/60 dark:hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 transition group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-200 truncate">
                        {serviceTag.id}
                      </div>
                      <span className={`inline-block flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${CLOUD_STYLES[serviceTag.cloud]}`}>
                        {CLOUD_LABELS[serviceTag.cloud]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                <span>No service tags found matching “{searchTerm}”.</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="underline decoration-dotted text-amber-700 transition hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                No service tags available at the moment.
              </div>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
