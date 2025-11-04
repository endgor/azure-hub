import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import { AzureIpAddress } from '@/types/azure';
import { getServiceTagDetails } from '@/lib/clientIpService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';

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
        <section className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Service tag not found</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Select a tag from the catalogue to view its address ranges or try searching for a different name.
            </p>
          </div>
          <Link
            href="/tools/service-tags"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
          >
            <span aria-hidden="true">←</span> Back to Service Tags
          </Link>
        </section>
      </Layout>
    );
  }

  // Generate breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://azurehub.org/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Service Tags",
        "item": "https://azurehub.org/tools/service-tags/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": serviceTag as string,
        "item": `https://azurehub.org/tools/service-tags/${encodeURIComponent(serviceTag as string)}/`
      }
    ]
  };

  return (
    <Layout
      title={`Azure Service Tag: ${serviceTag}`}
      description={`Explore the Azure IP ranges associated with the ${serviceTag as string} service tag.`}
    >
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      </Head>
      <section className="space-y-8">
        <div className="space-y-2 md:space-y-3">
          <nav className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 md:tracking-[0.3em]" aria-label="Breadcrumb">
            <Link href="/tools/service-tags" className="text-sky-600 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">
              Service Tags
            </Link>
            <span className="mx-2 text-slate-400 dark:text-slate-600">/</span>
            <span className="text-slate-500 dark:text-slate-300">{serviceTag}</span>
          </nav>

          <div className="space-y-2 md:space-y-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Service Tag: {serviceTag}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              IP ranges, Azure services, and network features associated with this service tag.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <LoadingSpinner size="lg" label="Loading service tag details..." />
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorBox title="Error loading service tag details">
            <p>{error.message}</p>
            <div className="mt-4">
              <Link href="/tools/service-tags" className="font-semibold text-sky-600 underline-offset-4 hover:underline dark:text-sky-300 dark:hover:text-sky-200">
                ← Back to Service Tags
              </Link>
            </div>
          </ErrorBox>
        )}

        {/* Not Found State */}
        {data?.notFound && (
          <ErrorBox variant="warning" title="Service tag not found">
            <p>{data.message || `No data found for service tag "${serviceTag}"`}</p>
            <div className="mt-4">
              <Link href="/tools/service-tags" className="font-semibold text-sky-600 underline-offset-4 hover:underline dark:text-sky-300 dark:hover:text-sky-200">
                ← Back to Service Tags
              </Link>
            </div>
          </ErrorBox>
        )}

        {/* Results */}
        {data && data.ipRanges && data.ipRanges.length > 0 && (
          <>
            {/* Results Table with integrated pagination */}
            <Results
              results={paginatedResults}
              query={serviceTag as string}
              total={data.ipRanges.length}
              pagination={totalPages > 1 ? {
                currentPage,
                totalPages,
                totalItems: data.ipRanges.length,
                pageSize,
                isAll,
                onPageChange: (page) => {
                  if (page === 'all') {
                    setIsAll(true);
                    setCurrentPage(1);
                  } else {
                    setIsAll(false);
                    setCurrentPage(page);
                  }
                },
                onPageSizeChange: handlePageSizeChange
              } : undefined}
            />
          </>
        )}

        {/* Back Link */}
        <div className="mt-10">
          <Link
            href="/tools/service-tags"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
          >
            <span aria-hidden="true">←</span> Back to Service Tags
          </Link>
        </div>
      </section>
    </Layout>
  );
}
