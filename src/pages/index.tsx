import { useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import LookupForm from '@/components/LookupForm';
import Results from '@/components/Results';
import Pagination from '../components/Pagination';
import { AzureIpAddress } from '@/types/azure';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
});

interface HomeProps {
  initialQuery: string;
  initialRegion: string;
  initialService: string;
  initialPage: number;
}

interface ApiResponse {
  results: AzureIpAddress[];
  query: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
  total: number;
  page?: number;
  pageSize?: number;
  error?: string;
}

export default function Home({ 
  initialQuery, 
  initialRegion, 
  initialService,
  initialPage 
}: HomeProps) {
  const [error, setError] = useState<string | null>(null);
  
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
  
  const isError = error || (data && 'error' in data);
  const errorMessage = error || (isError && data && 'error' in data ? data.error : null);
  
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
    <Layout>
      <section className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-4 text-blue-800">Azure IP Lookup</h1>
        <p className="text-xl text-gray-600 mb-8">
          Check if an IP address or domain is part of Azure infrastructure
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
        
        {!isLoading && !isError && results.length === 0 && (initialQuery || initialRegion || initialService) && (
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
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">About this tool</h2>
          <div className="prose prose-blue">
            <p>
              This tool helps you identify whether an IP address or domain name belongs to Microsoft Azure services.
              It's useful for network administrators, security professionals, and developers who need to identify Azure traffic.
            </p>
            <p>
              Enter any search term in the search box above - our intelligent search will automatically detect what you're looking for:
            </p>
            <ul className="list-disc ml-5 mb-3">
              <li>IP addresses (e.g., "40.112.127.224")</li>
              <li>CIDR notation (e.g., "10.0.0.0/24")</li>
              <li>Service names (e.g., "Storage", "AzureActiveDirectory")</li>
              <li>Region names (e.g., "WestEurope", "eastus")</li>
              <li>Combined format (e.g., "Storage.WestEurope")</li>
            </ul>
            <h3>Features</h3>
            <ul>
              <li>Check if an IP address belongs to Azure</li>
              <li>Resolve domain names to IP addresses and check Azure ownership</li>
              <li>View Azure region, service tag, and network feature information</li>
              <li>Search by service tags and regions using prefixes (service:, region:)</li>
              <li>IP data automatically updated daily from Microsoft's official sources</li>
            </ul>
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
