import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { loadIpDiff } from '@/lib/clientIpDiffService';
import type { IpDiffFile } from '@/types/ipDiff';
import { AzureCloudName } from '@/types/azure';
import { CLOUD_LABELS } from '@/lib/cloudConstants';

export default function RecentChangesCard() {
  const [diffData, setDiffData] = useState<IpDiffFile | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchDiffData = useCallback(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    Promise.all([
      loadIpDiff(),
      fetch('/data/file-metadata.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([diff, metadata]) => {
        setDiffData(diff);
        if (Array.isArray(metadata) && metadata.length > 0 && metadata[0].lastRetrieved) {
          setLastUpdated(metadata[0].lastRetrieved);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        fetchingRef.current = false;
      });
  }, []);

  useEffect(() => {
    fetchDiffData();
  }, [fetchDiffData]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-5 dark:bg-slate-900">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!diffData) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <Link href="/tools/ip-changes/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition">
            Recent Changes
          </Link>
          <Link href="/tools/ip-changes/" className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
        </div>
        <div className="px-5 pb-4 pt-1">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">No changes since last update</p>
          {lastUpdated && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Last update: {lastUpdated}
            </p>
          )}
        </div>
      </div>
    );
  }

  const summary = diffData.meta.summary;
  const clouds = diffData.meta.clouds;
  const hasChanges = summary && (
    summary.totalPrefixesAdded > 0 ||
    summary.totalPrefixesRemoved > 0
  );

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Link href="/tools/ip-changes/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition">
          Recent Changes
        </Link>
        <Link href="/tools/ip-changes/" className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>
      </div>

      {/* Summary badges */}
      {hasChanges && (
        <div className="flex items-center gap-4 px-5 pb-3">
          {summary.totalPrefixesAdded > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              +{summary.totalPrefixesAdded} added
            </span>
          )}
          {summary.totalPrefixesRemoved > 0 && (
            <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
              -{summary.totalPrefixesRemoved} removed
            </span>
          )}
        </div>
      )}

      {/* Cloud version rows */}
      {clouds && Object.keys(clouds).length > 0 && (
        <div className="mx-4 space-y-1.5 pb-3">
          {Object.entries(clouds).map(([cloud, info]) => (
            <Link
              key={cloud}
              href={`/tools/ip-changes?cloud=${cloud}`}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {CLOUD_LABELS[cloud as AzureCloudName] ?? cloud}
              </span>
              <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                v{info!.fromChangeNumber} &nbsp;→&nbsp; v{info!.toChangeNumber}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="px-5 pb-4 pt-1">
        {summary && summary.serviceTagsAdded === 0 && summary.serviceTagsRemoved === 0 && summary.serviceTagsModified === 0 && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Version updated, but no IP prefix changes were published in this update.
          </p>
        )}
        {summary && (summary.serviceTagsAdded > 0 || summary.serviceTagsModified > 0) && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {summary.serviceTagsAdded > 0 && <>{summary.serviceTagsAdded} new service tags</>}
            {summary.serviceTagsAdded > 0 && summary.serviceTagsModified > 0 && <>&nbsp;&nbsp;&nbsp;</>}
            {summary.serviceTagsModified > 0 && <>{summary.serviceTagsModified} modified service tags</>}
          </p>
        )}
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Last update: {lastUpdated ?? new Date(diffData.meta.generatedAt).toLocaleDateString('sv-SE')}
        </p>
      </div>
    </div>
  );
}
