import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import SimplePagination from '@/components/SimplePagination';
import { AzureIpAddress } from '@/types/azure';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  
  if (res.status === 404) {
    return { notFound: true, message: data.error, ipRanges: [] };
  }
  
  if (!res.ok) throw new Error(data.error || res.statusText);
  
  return data;
};

interface ServiceTagDetailResponse {
  serviceTag: string;
  ipRanges: AzureIpAddress[];
  notFound?: boolean;
  message?: string;
}

const PAGE_SIZE = 100;

export default function ServiceTagDetail() {
  const router = useRouter();
  const { serviceTag } = router.query;
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data, error, isLoading } = useSWR<ServiceTagDetailResponse>(
    serviceTag ? `/api/service-tags?serviceTag=${encodeURIComponent(serviceTag as string)}` : null,
    fetcher
  );

  // Paginate results
  const paginatedResults = useMemo(() => {
    if (!data?.ipRanges) return [];
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return data.ipRanges.slice(startIndex, endIndex);
  }, [data?.ipRanges, currentPage]);

  const totalPages = Math.ceil((data?.ipRanges?.length || 0) / PAGE_SIZE);

  if (!serviceTag) {
    return (
      <Layout title="Service Tag Not Found">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Service Tag Not Found</h1>
          <Link href="/service-tags" className="text-blue-600 hover:underline">
            ← Back to Service Tags
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Azure Service Tag: ${serviceTag}`}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/service-tags" className="hover:text-blue-600">
              Service Tags
            </Link>
            <span>›</span>
            <span className="font-medium text-gray-900">{serviceTag}</span>
          </div>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Service Tag: {serviceTag}
          </h1>
          <p className="text-lg text-gray-600">
            IP ranges and network details for this Azure service tag
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading service tag details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading service tag details</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/service-tags" className="text-blue-600 hover:underline">
                ← Back to Service Tags
              </Link>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {data?.notFound && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Service tag not found</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {data.message || `No data found for service tag "${serviceTag}"`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/service-tags" className="text-blue-600 hover:underline">
                ← Back to Service Tags
              </Link>
            </div>
          </div>
        )}

        {/* Results */}
        {data && data.ipRanges && data.ipRanges.length > 0 && (
          <>
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="font-medium text-blue-900 mb-2">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total IP Ranges:</span>
                  <span className="ml-2 text-blue-900">{data.ipRanges.length}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Unique Regions:</span>
                  <span className="ml-2 text-blue-900">
                    {new Set(data.ipRanges.map(ip => ip.region).filter(Boolean)).size}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">System Services:</span>
                  <span className="ml-2 text-blue-900">
                    {new Set(data.ipRanges.map(ip => ip.systemService).filter(Boolean)).size}
                  </span>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <Results 
              results={paginatedResults} 
              query={serviceTag as string}
              total={data.ipRanges.length}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={data.ipRanges.length}
                pageSize={PAGE_SIZE}
              />
            )}
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link 
            href="/service-tags"
            className="inline-flex items-center px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            ← Back to Service Tags List
          </Link>
        </div>
      </div>
    </Layout>
  );
}