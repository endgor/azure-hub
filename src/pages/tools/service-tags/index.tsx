import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAllServiceTags } from '@/lib/clientIpService';

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

  // Filter service tags based on search term
  const filteredServiceTags = useMemo(() => {
    if (!data?.serviceTags) return [];
    
    if (!searchTerm.trim()) return data.serviceTags;
    
    const searchLower = searchTerm.toLowerCase();
    return data.serviceTags.filter(tag => 
      tag.toLowerCase().includes(searchLower)
    );
  }, [data?.serviceTags, searchTerm]);

  return (
    <Layout
      title="Azure Service Tags"
      description="Browse the Microsoft Azure service tag catalogue and drill into each tag's address ranges."
    >
      <section className="space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600/80">Networking</p>
          <h1 className="text-3xl font-semibold text-slate-900">Azure Service Tags</h1>
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">
            Browse the complete catalogue of Azure service tags and jump directly into the IP ranges assigned to each tag.
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search service tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 21l-5.2-5.2m0 0A6 6 0 1010 16a6 6 0 005.8-4.2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {isLoading && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            <p className="text-sm text-slate-600">Loading service tags...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <h3 className="font-semibold text-rose-700">Error loading service tags</h3>
            <p className="mt-1 text-rose-600">{error.message}</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredServiceTags.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{data.serviceTags.length}</span> service tags
              {searchTerm && (
                <span className="ml-2 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-700">
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
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                  >
                    <div className="text-sm font-semibold text-slate-900 transition group-hover:text-sky-700">
                      {serviceTag}
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
                <span>No service tags found matching “{searchTerm}”.</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="underline decoration-dotted text-amber-700 transition hover:text-amber-800"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No service tags available at the moment.
              </div>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
