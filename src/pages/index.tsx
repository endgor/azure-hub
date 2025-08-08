import { useState, useMemo, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import useSWR from 'swr';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import Pagination from '../components/Pagination';
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
  initialPageSize: number | 'all';
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
  initialPage,
  initialPageSize
}: HomeProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Clear error state when query parameters change
  useEffect(() => {
    setError(null);
  }, [initialQuery, initialRegion, initialService, initialPage, initialPageSize]);
  
  // Build API URL with all query parameters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (initialQuery) params.append('ipOrDomain', initialQuery);
    if (initialRegion) params.append('region', initialRegion);
    if (initialService) params.append('service', initialService);
    if (initialPage > 1) params.append('page', initialPage.toString());
    if (initialPageSize === 'all') params.append('pageSize', 'all');

    const queryString = params.toString();
    return queryString ? `/api/ipAddress?${queryString}` : null;
  }, [initialQuery, initialRegion, initialService, initialPage, initialPageSize]);
  
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
  const DEFAULT_PAGE_SIZE = 50;
  const results = data && !isError && data.results ? data.results : [];
  const totalResults = data && !isError ? data.total || 0 : 0;
  const currentPage = data && !isError ? data.page || 1 : 1;
  const apiPageSize = data && !isError ? data.pageSize || DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE;
  const isAll = initialPageSize === 'all' || apiPageSize >= totalResults;
  const totalPages = Math.ceil(totalResults / DEFAULT_PAGE_SIZE);
  
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
      <section className="text-center max-w-3xl mx-auto mb-8">
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
                pageSize={DEFAULT_PAGE_SIZE}
                isAll={isAll}
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
          <section className="max-w-3xl mx-auto mt-16">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">How to Use the Azure IP Lookup Tool</h2>
            <div className="prose prose-blue">
              <p className="text-lg mb-6">
                Enter any of the following search types in the search box above to find Azure IP ranges and service information:
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">IP Address Lookup</h3>
                  <p className="mb-3">Example: <code className="bg-blue-100 px-2 py-1 rounded text-sm">40.112.127.224</code></p>
                  <p className="text-sm text-gray-700">Instantly verify if an IP address belongs to Microsoft Azure and discover which specific services are using it.</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">CIDR Range Search</h3>
                  <p className="mb-3">Example: <code className="bg-blue-100 px-2 py-1 rounded text-sm">74.7.51.32/29</code></p>
                  <p className="text-sm text-gray-700">Find all Azure IP ranges that overlap with or are contained within your specified CIDR block.</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Service Name Search</h3>
                  <p className="mb-3">Example: <code className="bg-blue-100 px-2 py-1 rounded text-sm">Storage</code></p>
                  <p className="text-sm text-gray-700">Browse all IP ranges used by specific Azure services like Storage, SQL, or Compute.</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Regional Search</h3>
                  <p className="mb-3">Example: <code className="bg-blue-100 px-2 py-1 rounded text-sm">WestEurope</code> or <code className="bg-blue-100 px-2 py-1 rounded text-sm">Storage.WestEurope</code></p>
                  <p className="text-sm text-gray-700">View IP ranges for specific Azure regions or service+region combinations.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Why Use Azure IP Lookup?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Security checkmark icon">
                    <title>Network Security</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Network Security</h3>
                <p className="text-sm text-gray-600">Verify IP addresses for firewall rules and security group configurations.</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Lightning bolt icon representing speed">
                    <title>Updated Daily</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Updated Daily</h3>
                <p className="text-sm text-gray-600">Automatically updated with the latest official Microsoft Azure IP ranges.</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Search magnifying glass icon">
                    <title>Easy Search</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Easy Search</h3>
                <p className="text-sm text-gray-600">Simple interface for quick IP lookups and service tag exploration.</p>
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Explore More</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">Browse All Service Tags</h3>
                <p className="text-gray-600 mb-4">
                  Explore the complete directory of Azure Service Tags and their associated IP ranges.
                </p>
                <Link 
                  href="/service-tags"
                  className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800"
                >
                  View Service Tags Directory →
                </Link>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">Learn More About This Tool</h3>
                <p className="text-gray-600 mb-4">
                  Discover how the Azure IP Lookup Tool works, its data sources, and technical details.
                </p>
                <Link 
                  href="/about"
                  className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800"
                >
                  Read About Page →
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const initialQuery = query.ipOrDomain as string || '';
  const initialRegion = query.region as string || '';
  const initialService = query.service as string || '';
  const initialPage = parseInt(query.page as string || '1', 10);
  const initialPageSize = query.pageSize === 'all' ? 'all' : 50;

  return {
    props: {
      initialQuery,
      initialRegion,
      initialService,
      initialPage: isNaN(initialPage) ? 1 : initialPage,
      initialPageSize
    },
  };
};
