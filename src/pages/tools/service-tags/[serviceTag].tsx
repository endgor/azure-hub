import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import fs from 'fs';
import path from 'path';
import Layout from '@/components/Layout';
import Results from '@/components/Results';
import { AzureIpAddress, AzureCloudName } from '@/types/azure';
import { getServiceTagCanonicalUrl } from '@/lib/serviceTagUrl';
import ErrorBox from '@/components/shared/ErrorBox';

interface ServiceTagDetailProps {
  serviceTag: string;
  isBaseTag: boolean;
  ipRanges: AzureIpAddress[];
  cloudsCovered: AzureCloudName[];
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

const CLOUD_LABELS: Record<string, string> = {
  [AzureCloudName.AzureCloud]: 'Azure Public',
  [AzureCloudName.AzureChinaCloud]: 'Azure China',
  [AzureCloudName.AzureUSGovernment]: 'Azure Government'
};

// Build-time only. Indexes every service tag to its IP prefixes across all clouds,
// cached at module scope so the (large) cloud JSON files are read once per build
// worker instead of once per generated page. Referenced only from getStaticProps,
// so Next.js strips this function and its fs/path usage from the client bundle.
let serviceTagMapCache: Map<string, AzureIpAddress[]> | null = null;

function loadServiceTagMap(): Map<string, AzureIpAddress[]> {
  if (serviceTagMapCache) return serviceTagMapCache;

  const map = new Map<string, AzureIpAddress[]>();

  for (const cloud of ALL_CLOUDS) {
    const filePath = path.join(process.cwd(), 'public', 'data', `${cloud}.json`);
    let data: CloudDataFile;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CloudDataFile;
    } catch {
      continue;
    }

    for (const entry of data.values) {
      const ranges = entry.properties.addressPrefixes.map((prefix) => ({
        serviceTagId: entry.name,
        ipAddressPrefix: prefix,
        region: entry.properties.region || '',
        regionId: entry.properties.regionId || '',
        systemService: entry.properties.systemService || '',
        networkFeatures: (entry.properties.networkFeatures || []).join(', '),
        cloud
      } satisfies AzureIpAddress));

      const existing = map.get(entry.name);
      if (existing) {
        existing.push(...ranges);
      } else {
        map.set(entry.name, ranges);
      }
    }
  }

  serviceTagMapCache = map;
  return map;
}

export default function ServiceTagDetail({ serviceTag, isBaseTag, ipRanges, cloudsCovered }: ServiceTagDetailProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAll, setIsAll] = useState(false);

  // Paginate the build-time data (no client fetch — the ranges ship in the HTML)
  const paginatedResults = useMemo(() => {
    if (ipRanges.length === 0) return [];
    if (isAll) return ipRanges;

    const startIndex = (currentPage - 1) * pageSize;
    return ipRanges.slice(startIndex, startIndex + pageSize);
  }, [ipRanges, currentPage, pageSize, isAll]);

  const totalPages = Math.ceil(ipRanges.length / pageSize);

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

  const breadcrumbs = [
    { name: 'Home', url: 'https://azurehub.org/' },
    { name: 'Service Tags', url: 'https://azurehub.org/tools/service-tags/' },
    { name: serviceTag, url: canonicalUrl }
  ];

  const cloudList = cloudsCovered.map((c) => CLOUD_LABELS[c] ?? c).join(', ');
  const summary = ipRanges.length > 0
    ? `The ${serviceTag} service tag includes ${ipRanges.length.toLocaleString()} IP address ${ipRanges.length === 1 ? 'prefix' : 'prefixes'}${cloudList ? ` published across ${cloudList}` : ''}.`
    : 'IP ranges, Azure services, and network features associated with this service tag.';

  return (
    <Layout
      title={`Azure Service Tag: ${serviceTag}`}
      description={`View all IP ranges and CIDR prefixes for the Azure ${serviceTag} service tag, including regional breakdowns and address counts across all clouds.`}
      canonicalUrl={canonicalUrl}
      breadcrumbs={breadcrumbs}
      noIndex={!isBaseTag}
    >
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
              {summary}
            </p>
          </div>
        </div>

        {/* Results — rendered from build-time data so the IP ranges are present in the HTML */}
        {ipRanges.length > 0 ? (
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
        ) : (
          <ErrorBox title="No results found">
            This service tag exists, but no IP ranges are currently published for it.
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
  const ipRanges = loadServiceTagMap().get(serviceTag) ?? [];
  const cloudsCovered = ALL_CLOUDS.filter((cloud) => ipRanges.some((range) => range.cloud === cloud));

  return {
    props: {
      serviceTag,
      // Base tags (e.g. "Storage") are unique, content-rich reference pages and are indexed.
      // Regional variants (e.g. "Storage.WestEurope") are near-duplicates and stay noindexed.
      isBaseTag: !serviceTag.includes('.'),
      ipRanges,
      cloudsCovered
    }
  };
};
