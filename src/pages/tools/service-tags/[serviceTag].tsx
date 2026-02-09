import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import { AzureIpAddress, AzureCloudName } from '@/types/azure';
import { getServiceTagDetails } from '@/lib/serverIpService';
import ErrorBox from '@/components/shared/ErrorBox';

/** Validates and parses cloud parameter from query string */
function parseCloudParam(cloud: string | string[] | undefined): AzureCloudName | undefined {
  if (!cloud || Array.isArray(cloud)) return undefined;
  const validClouds = Object.values(AzureCloudName) as string[];
  return validClouds.includes(cloud) ? (cloud as AzureCloudName) : undefined;
}

interface ServiceTagDetailProps {
  serviceTag: string;
  ipRanges: AzureIpAddress[];
  notFound: boolean;
  message?: string;
}

const DEFAULT_PAGE_SIZE = 100;

export default function ServiceTagDetail({ serviceTag, ipRanges, notFound, message }: ServiceTagDetailProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAll, setIsAll] = useState(false);

  // Paginate results
  const paginatedResults = useMemo(() => {
    if (!ipRanges || ipRanges.length === 0) return [];
    if (isAll) return ipRanges;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return ipRanges.slice(startIndex, endIndex);
  }, [ipRanges, currentPage, pageSize, isAll]);

  const totalPages = Math.ceil((ipRanges?.length || 0) / pageSize);

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
        "name": serviceTag,
        "item": `https://azurehub.org/tools/service-tags/${encodeURIComponent(serviceTag)}/`
      }
    ]
  };

  return (
    <Layout
      title={`Azure Service Tag: ${serviceTag}`}
      description={`Explore the Azure IP ranges associated with the ${serviceTag} service tag.`}
      canonicalUrl={`https://azurehub.org/tools/service-tags/${encodeURIComponent(serviceTag)}/`}
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

        {/* Not Found State */}
        {notFound && (
          <ErrorBox variant="warning" title="Service tag not found">
            <p>{message || `No data found for service tag "${serviceTag}"`}</p>
            <div className="mt-4">
              <Link href="/tools/service-tags" className="font-semibold text-sky-600 underline-offset-4 hover:underline dark:text-sky-300 dark:hover:text-sky-200">
                ← Back to Service Tags
              </Link>
            </div>
          </ErrorBox>
        )}

        {/* Results */}
        {!notFound && ipRanges && ipRanges.length > 0 && (
          <Results
            results={paginatedResults}
            query={serviceTag}
            total={ipRanges.length}
            hideCloudFilter
            pagination={totalPages > 1 ? {
              currentPage,
              totalPages,
              totalItems: ipRanges.length,
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

/**
 * Server-side data fetching for service tag detail pages.
 * This ensures Google sees actual content on first render instead of a loading spinner,
 * which fixes the "Soft 404" issue in Google Search Console.
 */
export const getServerSideProps: GetServerSideProps<ServiceTagDetailProps> = async (context) => {
  const { serviceTag: serviceTagParam, cloud: cloudParam } = context.query;

  // Handle missing or invalid serviceTag parameter
  if (!serviceTagParam || Array.isArray(serviceTagParam)) {
    return {
      notFound: true
    };
  }

  const serviceTag = decodeURIComponent(serviceTagParam);
  const cloud = parseCloudParam(cloudParam);

  try {
    // Fetch all results for this tag (unfiltered) to check if the tag exists at all
    const allIpRanges = await getServiceTagDetails(serviceTag);

    // If tag has 0 results across ALL clouds → proper HTTP 404
    if (allIpRanges.length === 0) {
      return { notFound: true };
    }

    // Tag exists — set CDN cache headers (24h cache + 12h stale-while-revalidate)
    context.res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=43200'
    );

    // Apply cloud filter if specified
    let ipRanges = cloud
      ? allIpRanges.filter(ip => ip.cloud === cloud)
      : allIpRanges;

    // Tag exists but cloud filter yields 0 results — soft 404 UI (HTTP 200)
    if (ipRanges.length === 0) {
      return {
        props: {
          serviceTag,
          ipRanges: [],
          notFound: true,
          message: `No data found for service tag "${serviceTag}" in the selected cloud`
        }
      };
    }

    return {
      props: {
        serviceTag,
        ipRanges,
        notFound: false
      }
    };
  } catch {
    // On error, return proper HTTP 404
    return { notFound: true };
  }
};
