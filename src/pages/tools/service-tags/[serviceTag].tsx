import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import Pagination from '@/components/Pagination';
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
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800/70 bg-slate-900/60 p-8 text-center text-slate-200">
          <h1 className="text-2xl font-semibold text-slate-100">Service tag not found</h1>
          <p className="mt-2 text-sm text-slate-400">Select a tag from the catalogue to view its address ranges.</p>
          <div className="mt-6">
            <Link
              href="/tools/service-tags"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500/50 hover:text-sky-100"
            >
              ← Back to Service Tags
            </Link>
          </div>
        </div>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <section className="space-y-8 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/30">
        <nav className="text-xs uppercase tracking-[0.3em] text-slate-500" aria-label="Breadcrumb">
          <Link href="/tools/service-tags" className="text-sky-300 transition hover:text-sky-200">
            Service Tags
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-400">{serviceTag}</span>
        </nav>

        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold text-slate-100">Service Tag: {serviceTag}</h1>
          <p className="text-sm text-slate-300">
            IP ranges, Azure services, and network features associated with this service tag.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-8 text-sm text-slate-300">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            Loading service tag details...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-200">
            <h3 className="font-semibold text-rose-100">Error loading service tag details</h3>
            <p className="mt-1 text-rose-200/80">{error.message}</p>
            <div className="mt-4">
              <Link href="/tools/service-tags" className="font-semibold text-sky-200 underline-offset-4 hover:underline">
                ← Back to Service Tags
              </Link>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {data?.notFound && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            <h3 className="font-semibold text-amber-50">Service tag not found</h3>
            <p className="mt-1 text-amber-100/90">
              {data.message || `No data found for service tag "${serviceTag}"`}
            </p>
            <div className="mt-4">
              <Link href="/tools/service-tags" className="font-semibold text-sky-200 underline-offset-4 hover:underline">
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data.ipRanges.length}
                pageSize={pageSize}
                isAll={isAll}
                basePath={`/tools/service-tags/${encodeURIComponent(serviceTag as string)}`}
                position="top"
                onPageSizeChange={handlePageSizeChange}
                onPageChange={(page) => {
                  if (page === 'all') {
                    setIsAll(true);
                    setCurrentPage(1);
                  } else {
                    setIsAll(false);
                    setCurrentPage(page);
                  }
                }}
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data.ipRanges.length}
                pageSize={pageSize}
                isAll={isAll}
                basePath={`/tools/service-tags/${encodeURIComponent(serviceTag as string)}`}
                position="bottom"
                onPageSizeChange={handlePageSizeChange}
                onPageChange={(page) => {
                  if (page === 'all') {
                    setIsAll(true);
                    setCurrentPage(1);
                  } else {
                    setIsAll(false);
                    setCurrentPage(page);
                  }
                }}
              />
            )}
          </>
        )}

        {/* Back Link */}
        <div className="mt-10 text-center">
          <Link
            href="/tools/service-tags"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500/40 hover:text-sky-100"
          >
            ← Back to Service Tags
          </Link>
        </div>
      </section>
    </Layout>
  );
}
