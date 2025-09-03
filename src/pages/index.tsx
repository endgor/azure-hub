import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import Pagination from '../components/Pagination';
import { AzureIpAddress } from '@/types/azure';
import { checkIpAddress, searchAzureIpAddresses } from '@/lib/clientIpService';

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
    // Parse the query parameters from the key
    const url = new URL(`http://localhost${key}`);
    const ipOrDomain = url.searchParams.get('ipOrDomain') || undefined;
    const region = url.searchParams.get('region') || undefined;
    const service = url.searchParams.get('service') || undefined;
    
    let results: AzureIpAddress[] = [];
    
    // Handle IP/Domain lookups
    if (ipOrDomain) {
      // Check if it's an IP address or CIDR
      if (/^\d+\.\d+/.test(ipOrDomain) || ipOrDomain.includes('/')) {
        results = await checkIpAddress(ipOrDomain);
      } else {
        // For other cases, try as both service and region search
        const serviceResults = await searchAzureIpAddresses({ service: ipOrDomain });
        const regionResults = await searchAzureIpAddresses({ region: ipOrDomain });
        
        // Combine and deduplicate results
        const combinedResults = [...serviceResults, ...regionResults];
        const uniqueResults = combinedResults.filter((item, index, array) => 
          index === array.findIndex(t => t.ipAddressPrefix === item.ipAddressPrefix && t.serviceTagId === item.serviceTagId)
        );
        results = uniqueResults;
      }
    } else {
      // Handle region/service search
      results = await searchAzureIpAddresses({ region, service });
    }
    
    if (results.length === 0) {
      return { 
        notFound: true, 
        message: `No Azure IP ranges found matching your search criteria`, 
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
    console.error('Client fetch error:', error);
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

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Extract query parameters from router - use useState to track them separately
  const [queryParams, setQueryParams] = useState({
    initialQuery: '',
    initialRegion: '',
    initialService: '',
    initialPage: 1,
    initialPageSize: 50 as number | 'all'
  });
  
  // Update query params when router is ready
  useEffect(() => {
    if (router.isReady) {
      setQueryParams({
        initialQuery: (router.query.ipOrDomain as string) || '',
        initialRegion: (router.query.region as string) || '',
        initialService: (router.query.service as string) || '',
        initialPage: parseInt((router.query.page as string) || '1', 10),
        initialPageSize: router.query.pageSize === 'all' ? 'all' : parseInt((router.query.pageSize as string) || '50', 10)
      });
    }
  }, [router.isReady, router.query]);
  
  const { initialQuery, initialRegion, initialService, initialPage, initialPageSize } = queryParams;
  
  // Clear error state when query parameters change
  useEffect(() => {
    setError(null);
  }, [initialQuery, initialRegion, initialService, initialPage, initialPageSize]);
  
  // Build client query URL with all query parameters
  const apiUrl = useMemo(() => {
    // Don't make requests until router is ready
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
  
  // Fetch data when apiUrl changes
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
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please check your input and try again.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);
  
  // Handle different response types
  const isError = error || (data && 'error' in data && !data.notFound);
  const isNotFound = data?.notFound === true;
  const errorMessage = error || (isError && data && 'error' in data ? data.error : null);
  const notFoundMessage = isNotFound && data?.message ? data.message : null;
  
  // Process the results
  const DEFAULT_PAGE_SIZE = 50;
  const results = data && !isError && data.results ? data.results : [];
  const totalResults = data && !isError ? data.total || 0 : 0;
  const currentPage = data && !isError ? data.page || 1 : 1;
  const apiPageSize = data && !isError ? data.pageSize || DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE;
  const isAll = initialPageSize === 'all' || apiPageSize >= totalResults;
  const effectivePageSize = initialPageSize === 'all' ? totalResults : (typeof initialPageSize === 'number' ? initialPageSize : DEFAULT_PAGE_SIZE);
  const totalPages = Math.ceil(totalResults / effectivePageSize);
  
  // Handle page size change
  const handlePageSizeChange = (newPageSize: number | 'all') => {
    const params = new URLSearchParams();
    if (initialQuery) params.append('ipOrDomain', initialQuery);
    if (initialRegion) params.append('region', initialRegion);
    if (initialService) params.append('service', initialService);
    if (newPageSize === 'all') {
      params.append('pageSize', 'all');
    } else if (newPageSize !== DEFAULT_PAGE_SIZE) {
      // Only add pageSize param if it's different from default
      params.append('pageSize', newPageSize.toString());
    }
    
    router.push(`/?${params.toString()}`);
  };
  
  // Generate page title based on query parameters
  const pageTitle = useMemo(() => {
    const parts = [];
    if (initialQuery) parts.push(`IP/Domain: ${initialQuery}`);
    if (initialService) parts.push(`Service: ${initialService}`);
    if (initialRegion) parts.push(`Region: ${initialRegion}`);
    return parts.join(', ') || 'All Results';
  }, [initialQuery, initialService, initialRegion]);
  
  return (
    <Layout title="Azure IP Lookup">
      <section className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-4 text-google-gray-800">Azure IP Address & Service Tag Lookup</h1>
      </section>
      
      <LookupForm 
        initialValue={initialQuery} 
        initialRegion={initialRegion}
        initialService={initialService}
      />
      
      <div className="max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Looking up IP information...</p>
          </div>
        )}
        
        {/* Show technical errors with red styling */}
        {isError && errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Show "not found" results with yellow styling */}
        {isNotFound && notFoundMessage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v5a1 1 0 01-2 0V9zm1-1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{notFoundMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && !isError && results.length > 0 && (
          <>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalResults}
                pageSize={effectivePageSize}
                isAll={isAll}
                position="top"
                onPageSizeChange={handlePageSizeChange}
                query={{
                  ipOrDomain: initialQuery,
                  region: initialRegion,
                  service: initialService
                }}
              />
            )}
            
            <Results 
              results={results} 
              query={pageTitle}
              total={totalResults}
            />
            
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalResults}
                pageSize={effectivePageSize}
                isAll={isAll}
                position="bottom"
                onPageSizeChange={handlePageSizeChange}
                query={{
                  ipOrDomain: initialQuery,
                  region: initialRegion,
                  service: initialService
                }}
              />
            )}
          </>
        )}
        
        {!isLoading && !isNotFound && !isError && results.length === 0 && (initialQuery || initialRegion || initialService) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v5a1 1 0 01-2 0V9zm1-1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No Azure IP ranges found matching your search criteria
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {!initialQuery && !initialRegion && !initialService && (
        <>
          <section className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-google-gray-800 text-center">Examples</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-google-gray-200 rounded-lg shadow-google p-6 hover:shadow-google-lg transition-shadow">
                <h3 className="text-lg font-semibold text-google-blue-600 mb-2">IP Address</h3>
                <p className="mb-2">Example:</p>
                <p className="mb-2"><code className="bg-google-gray-100 px-2 py-1 rounded text-sm text-google-gray-800">40.112.127.224</code></p>
                <p className="text-google-gray-600">Verify if an IP belongs to Azure and discover which services are using it.</p>
              </div>
              <div className="bg-white border border-google-gray-200 rounded-lg shadow-google p-6 hover:shadow-google-lg transition-shadow">
                <h3 className="text-lg font-semibold text-google-blue-600 mb-2">CIDR Range</h3>
                <p className="mb-2">Example:</p>
                <p className="mb-2"><code className="bg-google-gray-100 px-2 py-1 rounded text-sm text-google-gray-800">74.7.51.32/29</code></p>
                <p className="text-google-gray-600">Find Azure IP ranges that overlap with your specified CIDR block.</p>
              </div>
              <div className="bg-white border border-google-gray-200 rounded-lg shadow-google p-6 hover:shadow-google-lg transition-shadow">
                <h3 className="text-lg font-semibold text-google-blue-600 mb-2">Service Name</h3>
                <p className="mb-2">Example:</p>
                <p className="mb-2"><code className="bg-google-gray-100 px-2 py-1 rounded text-sm text-google-gray-800">Storage</code></p>
                <p className="text-google-gray-600">Browse IP ranges for specific Azure services like Storage or SQL.</p>
              </div>
              <div className="bg-white border border-google-gray-200 rounded-lg shadow-google p-6 hover:shadow-google-lg transition-shadow">
                <h3 className="text-lg font-semibold text-google-blue-600 mb-2">Region</h3>
                <p className="mb-2">Example:</p>
                <p className="mb-2"><code className="bg-google-gray-100 px-2 py-1 rounded text-sm text-google-gray-800">WestEurope</code></p>
                <p className="text-google-gray-600">View IP ranges for specific regions or service+region combinations.</p>
              </div>
            </div>
          </section>

        </>
      )}
    </Layout>
  );
}

