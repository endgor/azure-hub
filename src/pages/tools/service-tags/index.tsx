import { useState, useMemo, useEffect } from 'react';
import type { GetStaticProps } from 'next';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import Layout from '@/components/Layout';
import { getAllServiceTagsWithCloud, ServiceTagIndex } from '@/lib/clientIpIndexService';
import { AzureCloudName } from '@/types/azure';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { CLOUD_LABELS_SHORT as CLOUD_LABELS, CLOUD_STYLES } from '@/lib/cloudConstants';
import SearchInput from '@/components/shared/SearchInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import { getServiceTagPath } from '@/lib/serviceTagUrl';

interface ServiceTagsPageProps {
  baseServiceTags: string[];
}

export const getStaticProps: GetStaticProps<ServiceTagsPageProps> = async () => {
  let baseServiceTags: string[] = [];
  try {
    const indexPath = path.join(process.cwd(), 'public', 'data', 'service-tags-index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const tagSet = new Set<string>();
    for (const entry of index) {
      if (!entry.id.includes('.')) {
        tagSet.add(entry.id);
      }
    }
    baseServiceTags = Array.from(tagSet).sort();
  } catch { /* fallback */ }
  return { props: { baseServiceTags } };
};

/** Cloud filter options */
type CloudFilter = 'all' | AzureCloudName;

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

const DEFAULT_VISIBLE_COUNT = 50;

export default function ServiceTags({ baseServiceTags }: ServiceTagsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all');
  const [data, setData] = useState<ServiceTagsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

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

  // Reset "show all" when filters change
  useEffect(() => {
    setShowAll(false);
  }, [searchTerm, cloudFilter]);

  const isSearching = searchTerm.trim().length > 0;
  const visibleServiceTags = (isSearching || showAll)
    ? filteredServiceTags
    : filteredServiceTags.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = !isSearching && !showAll && filteredServiceTags.length > DEFAULT_VISIBLE_COUNT;

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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">Networking</p>
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

          {/* Cloud filter buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { value: 'all' as CloudFilter, label: 'All clouds' },
              { value: AzureCloudName.AzureCloud, label: 'Public' },
              { value: AzureCloudName.AzureChinaCloud, label: 'China' },
              { value: AzureCloudName.AzureUSGovernment, label: 'Government' }
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => setCloudFilter(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  cloudFilter === option.value
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 dark:bg-slate-900">
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleServiceTags.map((serviceTag) => (
                    <Link
                      key={`${serviceTag.id}-${serviceTag.cloud}`}
                      href={`${getServiceTagPath(serviceTag.id)}?cloud=${encodeURIComponent(serviceTag.cloud)}`}
                      className="group rounded-xl bg-white p-4 transition dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 transition group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-200 truncate">
                          {serviceTag.id}
                        </div>
                        <span className={`inline-block flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${CLOUD_STYLES[serviceTag.cloud]}`}>
                          {CLOUD_LABELS[serviceTag.cloud]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowAll(true)}
                      className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Show all {filteredServiceTags.length} service tags
                    </button>
                  </div>
                )}
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
        {/* Static directory of base service tags for SEO — rendered in HTML at build time */}
        {baseServiceTags.length > 0 && !searchTerm && !hasMounted && (
          <nav aria-label="All Azure service tags" className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              All service tags ({baseServiceTags.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <Link href="/tools/ip-lookup/" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline decoration-dotted">Look up a specific IP address</Link>
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 text-sm">
              {baseServiceTags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={getServiceTagPath(tag)}
                    className="text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 underline decoration-dotted underline-offset-2"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
    </Layout>
  );
}
