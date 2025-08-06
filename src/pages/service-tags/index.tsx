import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Layout from '@/components/Layout';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error || res.statusText);
  
  return data;
};

interface ServiceTagsResponse {
  serviceTags: string[];
}

export default function ServiceTags() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, error, isLoading } = useSWR<ServiceTagsResponse>(
    '/api/service-tags',
    fetcher
  );

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
    <Layout title="Azure Service Tags">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Azure Service Tags
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse all available Azure Service Tags. Click on any service tag to view its associated IP ranges and network details.
            You can also <Link href="/" className="text-blue-600 hover:underline">search for specific IP addresses</Link> to find which service tags they belong to.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search service tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pr-10 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading service tags...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading service tags</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Service Tags List */}
        {data && !isLoading && (
          <>
            <div className="mb-4 text-center">
              <p className="text-gray-600">
                Showing {filteredServiceTags.length} of {data.serviceTags.length} service tags
                {searchTerm && (
                  <span className="ml-2 text-blue-600 font-medium">
                    matching &quot;{searchTerm}&quot;
                  </span>
                )}
              </p>
            </div>

            {filteredServiceTags.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredServiceTags.map((serviceTag) => (
                  <Link
                    key={serviceTag}
                    href={`/service-tags/${encodeURIComponent(serviceTag)}`}
                    className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
                  >
                    <div className="text-blue-600 font-medium text-sm lg:text-base break-words hover:text-blue-800">
                      {serviceTag}
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No service tags found matching &quot;{searchTerm}&quot;
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No service tags available</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}