import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import fs from 'fs';
import path from 'path';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import { AzureIpAddress, AzureCloudName } from '@/types/azure';
import { getServiceTagCanonicalUrl } from '@/lib/serviceTagUrl';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';

interface ServiceTagDetailProps {
  serviceTag: string;
  initialCloud?: AzureCloudName | null;
}

const DEFAULT_PAGE_SIZE = 100;

interface CloudDataFile {
  values: Array<{
    name: string;
    properties: {
      region?: string;
      regionId?: string;
      systemService?: string;
      networkFeatures?: string[];
      addressPrefixes: string[];
    };
  }>;
}

const ALL_CLOUDS: AzureCloudName[] = [
  AzureCloudName.AzureCloud,
  AzureCloudName.AzureChinaCloud,
  AzureCloudName.AzureUSGovernment
];

async function fetchServiceTagDetailsClient(serviceTag: string): Promise<AzureIpAddress[]> {
  const cloudResults = await Promise.all(
    ALL_CLOUDS.map(async (cloud) => {
      const response = await fetch(`/data/${cloud}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${cloud} service tag data`);
      }

      const data = (await response.json()) as CloudDataFile;
      const matches = data.values.filter((entry) => entry.name === serviceTag);

      return matches.flatMap((entry) =>
        entry.properties.addressPrefixes.map((prefix) => ({
          serviceTagId: entry.name,
          ipAddressPrefix: prefix,
          region: entry.properties.region || '',
          regionId: entry.properties.regionId || '',
          systemService: entry.properties.systemService || '',
          networkFeatures: (entry.properties.networkFeatures || []).join(', '),
          cloud
        } satisfies AzureIpAddress))
      );
    })
  );

  return cloudResults.flat();
}

export default function ServiceTagDetail({ serviceTag, initialCloud }: ServiceTagDetailProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAll, setIsAll] = useState(false);
  const [ipRanges, setIpRanges] = useState<AzureIpAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDetails = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const allRanges = await fetchServiceTagDetailsClient(serviceTag);
        if (!active) return;

        const filteredRanges = initialCloud
          ? allRanges.filter(ip => ip.cloud === initialCloud)
          : allRanges;

        setIpRanges(filteredRanges);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load service tag details');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadDetails();
    return () => {
      active = false;
    };
  }, [serviceTag, initialCloud]);

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

  const canonicalUrl = getServiceTagCanonicalUrl(serviceTag);
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
        "item": canonicalUrl
      }
    ]
  };

  return (
    <Layout
      title={`Azure Service Tag: ${serviceTag}`}
      description={`View all IP ranges and CIDR prefixes for the Azure ${serviceTag} service tag, including regional breakdowns and address counts across all clouds.`}
      canonicalUrl={canonicalUrl}
      noIndex
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
            <Link href="/tools/service-tags/" className="text-sky-600 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">
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

        {/* Results */}
        {isLoading && (
          <div className="rounded-xl bg-white p-8 dark:bg-slate-900">
            <LoadingSpinner size="md" label="Loading service tag details..." centered />
          </div>
        )}

        {!isLoading && loadError && (
          <ErrorBox title="Unable to load service tag details">
            The static service tag page loaded, but the IP range data could not be fetched.
            <br />
            <span className="text-xs opacity-80">{loadError}</span>
          </ErrorBox>
        )}

        {!isLoading && !loadError && ipRanges.length > 0 && (
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

        {!isLoading && !loadError && ipRanges.length === 0 && (
          <ErrorBox title="No results found">
            This service tag exists, but no IP ranges matched the selected cloud filter.
          </ErrorBox>
        )}

        {/* Back Link */}
        <div className="mt-10">
          <Link
            href="/tools/service-tags/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
          >
            <span aria-hidden="true">←</span> Back to Service Tags
          </Link>
        </div>
      </section>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const indexPath = path.join(process.cwd(), 'public', 'data', 'service-tags-index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Array<{ id: string }>;
    const paths = Array.from(new Set(index.map((entry) => entry.id))).map((serviceTag) => ({
      params: { serviceTag }
    }));

    return {
      paths,
      fallback: false
    }
  } catch {
    return { paths: [], fallback: false };
  }
};

export const getStaticProps: GetStaticProps<ServiceTagDetailProps> = async ({ params }) => {
  const serviceTagParam = params?.serviceTag;

  if (!serviceTagParam || Array.isArray(serviceTagParam)) {
    return { notFound: true };
  }

  const serviceTag = decodeURIComponent(serviceTagParam);

  return {
    props: {
      serviceTag,
      initialCloud: null
    }
  };
};
