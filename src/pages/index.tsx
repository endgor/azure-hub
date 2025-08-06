import { useState, useMemo, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import useSWR from 'swr';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import Pagination from '../components/Pagination';
import VersionDisplay from '@/components/VersionDisplay';
import { AzureIpAddress } from '@/types/azure';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  
  // If we get a 404 status, it means "not found" rather than an error
  if (res.status === 404) {
    return { notFound: true, message: data.error, results: [], total: 0 };
  }
  
  // For other error statuses, throw an error
  if (!res.ok) throw new Error(data.error || res.statusText);
  
  return data;
};

interface HomeProps {
  initialQuery: string;
  initialRegion: string;
  initialService: string;
  initialPage: number;
}

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

export default function Home({ 
  initialQuery, 
  initialRegion, 
  initialService,
  initialPage 
}: HomeProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Clear error state when query parameters change
  useEffect(() => {
    setError(null);
  }, [initialQuery, initialRegion, initialService, initialPage]);
  
  // Build API URL with all query parameters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (initialQuery) params.append('ipOrDomain', initialQuery);
    if (initialRegion) params.append('region', initialRegion);
    if (initialService) params.append('service', initialService);
    if (initialPage > 1) params.append('page', initialPage.toString());
    
    const queryString = params.toString();
    return queryString ? `/api/ipAddress?${queryString}` : null;
  }, [initialQuery, initialRegion, initialService, initialPage]);
  
  const { data, isLoading } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      onError: (err) => {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please check your input and try again.');
      },
      revalidateOnFocus: false,
    }
  );
  
  // Handle different response types
  const isError = error || (data && 'error' in data && !data.notFound);
  const isNotFound = data?.notFound === true;
  const errorMessage = error || (isError && data && 'error' in data ? data.error : null);
  const notFoundMessage = isNotFound && data?.message ? data.message : null;
  
  // Process the results
  const results = data && !isError && data.results ? data.results : [];
  const totalResults = data && !isError ? data.total || 0 : 0;
  const currentPage = data && !isError ? data.page || 1 : 1;
  const pageSize = data && !isError ? data.pageSize || 50 : 50;
  const totalPages = Math.ceil(totalResults / pageSize);
  
  // Generate page title based on query parameters
  const pageTitle = useMemo(() => {
    const parts = [];
    if (initialQuery) parts.push(`IP/Domain: ${initialQuery}`);
    if (initialService) parts.push(`Service: ${initialService}`);
    if (initialRegion) parts.push(`Region: ${initialRegion}`);
    return parts.join(', ') || 'All Results';
  }, [initialQuery, initialService, initialRegion]);
  
  return (
    <Layout title="Azure IP Range Finder & Service Tag Lookup Tool">
      <section className="text-center max-w-3xl mx-auto mb-8 relative">
        <div className="absolute top-0 right-0">
          <VersionDisplay />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-blue-800">Azure IP Address & Service Tag Lookup</h1>
        <p className="text-xl text-gray-600 mb-8">
          Find IP ranges for Azure services and verify if an IP address belongs to Azure infrastructure
        </p>
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
                pageSize={pageSize}
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
        <section className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">How to use this tool</h2>
          <div className="prose prose-blue">
            <p>
              Enter any of the following in the search box above:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-blue-800 mb-2">IP Address</h3>
                <p className="mb-2">Example: <code className="bg-blue-100 px-1 rounded">40.112.127.224</code></p>
                <p className="text-sm">Discover which Azure services are using this IP address</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-blue-800 mb-2">CIDR Range</h3>
                <p className="mb-2">Example: <code className="bg-blue-100 px-1 rounded">74.7.51.32/29</code></p>
                <p className="text-sm">Find Azure IP ranges that are within this block</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-blue-800 mb-2">Service Name</h3>
                <p className="mb-2">Example: <code className="bg-blue-100 px-1 rounded">Storage</code></p>
                <p className="text-sm">See all IP ranges used by specific Azure services</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-blue-800 mb-2">Region or Service.Region</h3>
                <p className="mb-2">Example: <code className="bg-blue-100 px-1 rounded">WestEurope</code> or <code className="bg-blue-100 px-1 rounded">Storage.WestEurope</code></p>
                <p className="text-sm">View IP ranges for specific regions or service+region combinations</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const initialQuery = query.ipOrDomain as string || '';
  const initialRegion = query.region as string || '';
  const initialService = query.service as string || '';
  const initialPage = parseInt(query.page as string || '1', 10);
  
  return {
    props: {
      initialQuery,
      initialRegion,
      initialService,
      initialPage: isNaN(initialPage) ? 1 : initialPage
    },
  };
};
