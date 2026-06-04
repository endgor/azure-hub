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
  ipRanges: AzureIpAddress[];
  cloudsCovered: AzureCloudName[];
  regions: string[];
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

// Build-time only. Indexes every BASE service tag to the merged set of its IP prefixes:
// the global entry (e.g. "Storage") plus every regional variant ("Storage.WestEurope").
// Ranges are deduped per (cloud, prefix); a regional entry's region label wins over the
// unlabeled global entry so the region filter works. Cached at module scope so the (large)
// cloud JSON files are read once per build worker. Referenced only from getStaticProps, so
// Next.js strips this function and its fs/path usage from the client bundle.
let serviceTagMapCache: Map<string, AzureIpAddress[]> | null = null;

function baseIdOf(name: string): string {
  return name.split('.')[0];
}

function loadServiceTagMap(): Map<string, AzureIpAddress[]> {
  if (serviceTagMapCache) return serviceTagMapCache;

  // base tag -> ("cloud|prefix" -> range), deduped with regional labels preferred
  const byBase = new Map<string, Map<string, AzureIpAddress>>();

  for (const cloud of ALL_CLOUDS) {
    const filePath = path.join(process.cwd(), 'public', 'data', `${cloud}.json`);
    let data: CloudDataFile;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CloudDataFile;
    } catch {
      continue;
    }

    for (const entry of data.values) {
      const base = baseIdOf(entry.name);
      const isRegional = entry.name.includes('.');

      let deduped = byBase.get(base);
      if (!deduped) {
        deduped = new Map<string, AzureIpAddress>();
        byBase.set(base, deduped);
      }

      for (const prefix of entry.properties.addressPrefixes) {
        const key = `${cloud}|${prefix}`;
        const record: AzureIpAddress = {
          // Keep the full sub-tag name (e.g. "Storage.WestEurope", "AzureFrontDoor.Backend")
          // so the table still shows which sub-tag a prefix belongs to after consolidation.
          serviceTagId: entry.name,
          ipAddressPrefix: prefix,
          region: entry.properties.region || '',
          regionId: entry.properties.regionId || '',
          systemService: entry.properties.systemService || '',
          networkFeatures: (entry.properties.networkFeatures || []).join(', '),
          cloud
        };

        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, record);
        } else if (isRegional && !existing.region) {
          // Upgrade an unlabeled global prefix to its regional label
          deduped.set(key, record);
        }
      }
    }
  }

  serviceTagMapCache = new Map();
  for (const [base, deduped] of byBase) {
    serviceTagMapCache.set(base, Array.from(deduped.values()));
  }
  return serviceTagMapCache;
}

export default function ServiceTagDetail({ serviceTag, ipRanges, cloudsCovered, regions }: ServiceTagDetailProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAll, setIsAll] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Region filter is applied at the page level (before pagination) so it works across
  // the full dataset rather than only the current page.
  const filteredRanges = useMemo(() => {
    if (selectedRegion === 'all') return ipRanges;
    if (selectedRegion === 'global') return ipRanges.filter((r) => !r.region);
    return ipRanges.filter((r) => r.region === selectedRegion);
  }, [ipRanges, selectedRegion]);

  const paginatedResults = useMemo(() => {
    if (filteredRanges.length === 0) return [];
    if (isAll) return filteredRanges;

    const startIndex = (currentPage - 1) * pageSize;
    return filteredRanges.slice(startIndex, startIndex + pageSize);
  }, [filteredRanges, currentPage, pageSize, isAll]);

  const totalPages = Math.ceil(filteredRanges.length / pageSize);

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

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setCurrentPage(1);
    setIsAll(false);
  };

  const canonicalUrl = getServiceTagCanonicalUrl(serviceTag);

  const breadcrumbs = [
    { name: 'Home', url: 'https://azurehub.org/' },
    { name: 'Service Tags', url: 'https://azurehub.org/tools/service-tags/' },
    { name: serviceTag, url: canonicalUrl }
  ];

  const cloudList = cloudsCovered.map((c) => CLOUD_LABELS[c] ?? c).join(', ');
  const summary = ipRanges.length > 0
    ? `The ${serviceTag} service tag includes ${ipRanges.length.toLocaleString()} IP address ${ipRanges.length === 1 ? 'prefix' : 'prefixes'}${cloudList ? ` published across ${cloudList}` : ''}${regions.length > 0 ? `, spanning ${regions.length} Azure ${regions.length === 1 ? 'region' : 'regions'}` : ''}.`
    : 'IP ranges, Azure services, and network features associated with this service tag.';

  return (
    <Layout
      title={`Azure Service Tag: ${serviceTag}`}
      description={`View all IP ranges and CIDR prefixes for the Azure ${serviceTag} service tag, including regional breakdowns and address counts across all clouds.`}
      canonicalUrl={canonicalUrl}
      breadcrumbs={breadcrumbs}
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

        {/* Region filter — regional variants are consolidated here instead of separate pages */}
        {regions.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="region-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Region
            </label>
            <select
              id="region-filter"
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All regions</option>
              <option value="global">Global (unscoped)</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results — rendered from build-time data so the IP ranges are present in the HTML */}
        {filteredRanges.length > 0 ? (
          <Results
            results={paginatedResults}
            query={serviceTag}
            total={filteredRanges.length}
            hideCloudFilter
            pagination={totalPages > 1 ? {
              currentPage,
              totalPages,
              totalItems: filteredRanges.length,
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
            {selectedRegion === 'all'
              ? 'This service tag exists, but no IP ranges are currently published for it.'
              : 'No IP ranges are published for this service tag in the selected region.'}
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
    // Generate one page per distinct base tag (the part before the first dot). Sub-tags
    // (regional variants like Storage.WestEurope, or components like AzureFrontDoor.Backend)
    // are consolidated into their base page and 301-redirect there (see next.config.js).
    // Using split() also covers families like AzureFrontDoor that have no global entry.
    const baseTags = Array.from(new Set(index.map((entry) => entry.id.split('.')[0])));
    const paths = baseTags.map((serviceTag) => ({ params: { serviceTag } }));

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

  // A regional variant should never reach here (redirected at the config level), but guard
  // anyway so a stray dotted path doesn't render an empty page.
  if (serviceTag.includes('.')) {
    return { notFound: true };
  }

  const ipRanges = loadServiceTagMap().get(serviceTag) ?? [];
  const cloudsCovered = ALL_CLOUDS.filter((cloud) => ipRanges.some((range) => range.cloud === cloud));
  const regions = Array.from(new Set(ipRanges.map((range) => range.region).filter(Boolean))).sort();

  return {
    props: {
      serviceTag,
      ipRanges,
      cloudsCovered,
      regions
    }
  };
};
