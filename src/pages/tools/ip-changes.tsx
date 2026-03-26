import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { loadIpDiff } from '@/lib/clientIpDiffService';
import type { IpDiffFile, ModifiedTag, AddedTag, RemovedTag } from '@/types/ipDiff';
import { AzureCloudName } from '@/types/azure';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Government',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

const CLOUD_ORDER: AzureCloudName[] = [
  AzureCloudName.AzureCloud,
  AzureCloudName.AzureChinaCloud,
  AzureCloudName.AzureUSGovernment
];

type CloudFilter = AzureCloudName | 'all';

export default function IpChangesPage() {
  const router = useRouter();
  const [diffData, setDiffData] = useState<IpDiffFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  const cloudFilter = useMemo<CloudFilter>(() => {
    if (!router.isReady) return 'all';
    const q = router.query.cloud as string | undefined;
    if (q && Object.values(AzureCloudName).includes(q as AzureCloudName)) {
      return q as AzureCloudName;
    }
    return 'all';
  }, [router.isReady, router.query.cloud]);

  const fetchDiffData = useCallback(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    loadIpDiff()
      .then((data) => setDiffData(data))
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        fetchingRef.current = false;
      });
  }, []);

  useEffect(() => {
    fetchDiffData();
  }, [fetchDiffData]);

  const setCloud = useCallback((cloud: CloudFilter) => {
    const query: Record<string, string> = {};
    if (cloud !== 'all') query.cloud = cloud;
    router.replace({ pathname: '/tools/ip-changes', query }, undefined, { shallow: true });
  }, [router]);

  const filtered = useMemo(() => {
    if (!diffData) return { added: [], removed: [], modified: [] };
    const filterByCloud = <T extends { cloud?: AzureCloudName }>(items: T[]) =>
      cloudFilter === 'all' ? items : items.filter((t) => t.cloud === cloudFilter);
    return {
      added: filterByCloud(diffData.addedTags),
      removed: filterByCloud(diffData.removedTags),
      modified: filterByCloud(diffData.modifiedTags)
    };
  }, [diffData, cloudFilter]);

  const totalChanges = filtered.added.length + filtered.removed.length + filtered.modified.length;

  return (
    <Layout
      title="Azure IP Range Changes - Weekly Update Changelog"
      description="View recent changes to Azure IP ranges and service tags across Public, China, and Government clouds."
      keywords={[
        'azure ip changes',
        'azure service tag updates',
        'azure ip range changelog',
        'azure ip weekly update'
      ]}
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'IP Lookup', url: 'https://azurehub.org/tools/ip-lookup/' },
        { name: 'IP Changes', url: 'https://azurehub.org/tools/ip-changes/' }
      ]}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">
            Networking
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            IP Range Changes
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Weekly changelog of Azure IP range additions and removals across all clouds.
          </p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 dark:bg-slate-900">
            <LoadingSpinner size="lg" label="Loading change data..." />
          </div>
        )}

        {!isLoading && !diffData && (
          <div className="rounded-xl bg-white p-6 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            No change data available.
          </div>
        )}

        {!isLoading && diffData && (
          <>
            {/* Version info + cloud filter */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <FilterButton active={cloudFilter === 'all'} onClick={() => setCloud('all')}>
                  All clouds
                </FilterButton>
                {CLOUD_ORDER.filter((c) => diffData.meta.clouds?.[c]).map((cloud) => {
                  const info = diffData.meta.clouds![cloud]!;
                  return (
                    <FilterButton key={cloud} active={cloudFilter === cloud} onClick={() => setCloud(cloud)}>
                      {CLOUD_LABELS[cloud]}{' '}
                      <span className="text-[10px] opacity-60">v{info.fromChangeNumber} → v{info.toChangeNumber}</span>
                    </FilterButton>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>{totalChanges} service tag{totalChanges !== 1 ? 's' : ''} changed</span>
                {diffData.meta.generatedAt && (
                  <span>· Updated {new Date(diffData.meta.generatedAt).toLocaleDateString('sv-SE')}</span>
                )}
                <Link href="/tools/ip-lookup/" className="ml-auto text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-dotted text-xs">
                  ← Back to IP Lookup
                </Link>
              </div>
            </div>

            {/* Added tags */}
            {filtered.added.length > 0 && (
              <TagSection title="New Service Tags" count={filtered.added.length} variant="added">
                {filtered.added.map((tag, i) => (
                  <AddedTagRow key={`${tag.name}-${tag.cloud}-${i}`} tag={tag} />
                ))}
              </TagSection>
            )}

            {/* Removed tags */}
            {filtered.removed.length > 0 && (
              <TagSection title="Removed Service Tags" count={filtered.removed.length} variant="removed">
                {filtered.removed.map((tag, i) => (
                  <RemovedTagRow key={`${tag.name}-${tag.cloud}-${i}`} tag={tag} />
                ))}
              </TagSection>
            )}

            {/* Modified tags */}
            {filtered.modified.length > 0 && (
              <TagSection title="Modified Service Tags" count={filtered.modified.length} variant="modified">
                {filtered.modified.map((tag, i) => (
                  <ModifiedTagRow key={`${tag.name}-${tag.cloud}-${i}`} tag={tag} />
                ))}
              </TagSection>
            )}

            {totalChanges === 0 && (
              <div className="rounded-xl bg-white p-6 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                No changes found for this cloud.
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

/* ── Subcomponents ── */

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function TagSection({ title, count, variant, children }: {
  title: string;
  count: number;
  variant: 'added' | 'removed' | 'modified';
  children: React.ReactNode;
}) {
  const colors = {
    added: 'text-emerald-600 dark:text-emerald-400',
    removed: 'text-rose-500 dark:text-rose-400',
    modified: 'text-blue-500 dark:text-blue-400'
  };
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title} <span className={`${colors[variant]} ml-1`}>({count})</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const CLOUD_STYLES: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  [AzureCloudName.AzureUSGovernment]: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  [AzureCloudName.AzureChinaCloud]: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
};

function CopyButton({ text, label = 'Copy IP addresses' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function CloudBadge({ cloud }: { cloud?: AzureCloudName }) {
  if (!cloud) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CLOUD_STYLES[cloud] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
      {CLOUD_LABELS[cloud] ?? cloud}
    </span>
  );
}

function PrefixList({ prefixes, variant }: { prefixes: string[]; variant: 'added' | 'removed' }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_LIMIT = 5;
  const shown = expanded ? prefixes : prefixes.slice(0, COLLAPSED_LIMIT);
  const remaining = prefixes.length - COLLAPSED_LIMIT;

  const color = variant === 'added'
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-rose-600 dark:text-rose-300';
  const prefix = variant === 'added' ? '+' : '−';

  return (
    <div className="space-y-0.5">
      {shown.map((p) => (
        <div key={p} className={`font-mono text-xs ${color}`}>
          {prefix} {p}
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          +{remaining} more…
        </button>
      )}
    </div>
  );
}

function AddedTagRow({ tag }: { tag: AddedTag }) {
  return (
    <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{tag.name}</span>
        <CloudBadge cloud={tag.cloud} />
        {tag.region && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{tag.region}</span>
        )}
        <span className="ml-auto"><CopyButton text={tag.prefixes.join('\n')} /></span>
      </div>
      {tag.systemService && tag.systemService !== tag.name && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tag.systemService}</p>
      )}
      <div className="mt-2">
        <PrefixList prefixes={tag.prefixes} variant="added" />
      </div>
    </div>
  );
}

function RemovedTagRow({ tag }: { tag: RemovedTag }) {
  return (
    <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-slate-900 line-through dark:text-slate-100">{tag.name}</span>
        <CloudBadge cloud={tag.cloud} />
        {tag.region && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{tag.region}</span>
        )}
        <span className="ml-auto"><CopyButton text={tag.prefixes.join('\n')} /></span>
      </div>
      <div className="mt-2">
        <PrefixList prefixes={tag.prefixes} variant="removed" />
      </div>
    </div>
  );
}

function ModifiedTagRow({ tag }: { tag: ModifiedTag }) {
  const allPrefixes = [
    ...tag.addedPrefixes.map((p) => `+ ${p}`),
    ...tag.removedPrefixes.map((p) => `- ${p}`)
  ].join('\n');
  return (
    <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{tag.name}</span>
        <CloudBadge cloud={tag.cloud} />
        {tag.region && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{tag.region}</span>
        )}
        <span className="ml-auto"><CopyButton text={allPrefixes} /></span>
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {tag.addedPrefixes.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              +{tag.addedPrefixes.length} added
            </p>
            <PrefixList prefixes={tag.addedPrefixes} variant="added" />
          </div>
        )}
        {tag.removedPrefixes.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400">
              −{tag.removedPrefixes.length} removed
            </p>
            <PrefixList prefixes={tag.removedPrefixes} variant="removed" />
          </div>
        )}
      </div>
    </div>
  );
}
