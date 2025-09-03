import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import SimplePagination from '@/components/SimplePagination';
import { AzureIpAddress } from '@/types/azure';
import { getServiceTagDetails } from '@/lib/clientIpService';

const clientServiceTagFetcher = async (serviceTagKey: string): Promise<ServiceTagDetailResponse> => {
  if (!serviceTagKey) {
    return {
      serviceTag: '',
      ipRanges: [],
      notFound: true,
      message: 'No service tag provided'
    };
  }
  
  try {
    const ipRanges = await getServiceTagDetails(serviceTagKey);
    
    if (ipRanges.length === 0) {
      return { 
        notFound: true, 
        message: `No data found for service tag "${serviceTagKey}"`,
        serviceTag: serviceTagKey,
        ipRanges: [] 
      };
    }
    
    return {
      serviceTag: serviceTagKey,
      ipRanges
    };
  } catch (error) {
    console.error('Service tag fetch error:', error);
    throw error;
  }
};

interface ServiceTagDetailResponse {
  serviceTag: string;
  ipRanges: AzureIpAddress[];
  notFound?: boolean;
  message?: string;
}

const DEFAULT_PAGE_SIZE = 100;

export default function ServiceTagDetail() {
  const router = useRouter();
  const { serviceTag } = router.query;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAll, setIsAll] = useState(false);
  const [data, setData] = useState<ServiceTagDetailResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch service tag details when serviceTag changes
  useEffect(() => {
    if (!serviceTag) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchServiceTagDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await clientServiceTagFetcher(serviceTag as string);
        setData(result);
      } catch (err) {
        console.error('Service tag fetch error:', err);
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceTagDetails();
  }, [serviceTag]);

  // Paginate results
  const paginatedResults = useMemo(() => {
    if (!data?.ipRanges) return [];
    if (isAll) return data.ipRanges;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.ipRanges.slice(startIndex, endIndex);
  }, [data?.ipRanges, currentPage, pageSize, isAll]);

  const totalPages = Math.ceil((data?.ipRanges?.length || 0) / pageSize);
  
  // Handle page size change
  const handlePageSizeChange = (newPageSize: number | 'all') => {
    if (newPageSize === 'all') {
      setIsAll(true);
      setPageSize(DEFAULT_PAGE_SIZE);
      setCurrentPage(1);
    } else {
      setIsAll(false);
      setPageSize(newPageSize);
      setCurrentPage(1);
    }
  };

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

            {/* Top Pagination */}
            {totalPages > 1 && (
              <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  if (page === 'all') {
                    setIsAll(true);
                    setCurrentPage(1);
                  } else {
                    setIsAll(false);
                    setCurrentPage(page);
                  }
                }}
                totalItems={data.ipRanges.length}
                pageSize={pageSize}
                isAll={isAll}
                position="top"
                onPageSizeChange={handlePageSizeChange}
              />
            )}

            {/* Results Table */}
            <Results 
              results={paginatedResults} 
              query={serviceTag as string}
              total={data.ipRanges.length}
            />

            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  if (page === 'all') {
                    setIsAll(true);
                    setCurrentPage(1);
                  } else {
                    setIsAll(false);
                    setCurrentPage(page);
                  }
                }}
                totalItems={data.ipRanges.length}
                pageSize={pageSize}
                isAll={isAll}
                position="bottom"
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link 
            href="/service-tags"
            className="inline-flex items-center justify-center rounded-lg border border-google-gray-300 px-4 py-2 bg-white text-sm font-medium text-google-gray-700 hover:bg-google-gray-50 hover:shadow-google focus:outline-none focus:ring-2 focus:ring-google-blue-500 transition-all duration-200"
          >
            ← Back to Service Tags List
          </Link>
        </div>
      </div>
    </Layout>
  );
}