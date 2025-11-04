import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAllServiceTags } from '@/lib/clientIpService';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import SearchInput from '@/components/shared/SearchInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';

const clientServiceTagsFetcher = async () => {
  try {
    const serviceTags = await getAllServiceTags();
    return { serviceTags };
  } catch (error) {
    throw error;
  }
};

interface ServiceTagsResponse {
  serviceTags: string[];
}

export default function ServiceTags() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<ServiceTagsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Filter service tags based on search term with intelligent sorting
  const filteredServiceTags = useMemo(() => {
    if (!data?.serviceTags) return [];

    if (!searchTerm.trim()) return data.serviceTags;

    // Use intelligent sorting: exact matches first, then starts with, then alphabetical
    return filterAndSortByQuery(data.serviceTags, searchTerm, (tag) => tag);
  }, [data?.serviceTags, searchTerm]);

  return (
    <Layout
      title="Azure Service Tags"
      description="Explore Microsoft Azure service tags, discover associated IP ranges, and research network dependencies by cloud region."
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">Networking</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Azure Service Tags</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Browse all Azure service tags with IP address ranges, regional endpoints, and network features. Essential for firewall rules, NSG configuration, and network security planning.
          </p>
        </div>

        <SearchInput
          type="text"
          placeholder="Search service tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxWidth="sm"
        />

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
                    key={serviceTag}
                    href={`/tools/service-tags/${encodeURIComponent(serviceTag)}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800/60 dark:hover:shadow-lg"
                  >
                    <div className="text-sm font-semibold text-slate-900 transition group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-200">
                      {serviceTag}
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
