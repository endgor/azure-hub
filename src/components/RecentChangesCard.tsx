import { useState, useEffect, useCallback, useRef } from 'react';
import { loadIpDiff } from '@/lib/clientIpDiffService';
import type { IpDiffFile } from '@/types/ipDiff';
import { AzureCloudName } from '@/types/azure';

const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Government',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

interface RecentChangesCardProps {
  serviceCount?: number;
}

export default function RecentChangesCard({ serviceCount }: RecentChangesCardProps) {
  const [diffData, setDiffData] = useState<IpDiffFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

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

  if (!diffData) return null;

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
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Recent Changes</h3>
        <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
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
            <div
              key={cloud}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 dark:bg-slate-800/60"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {CLOUD_LABELS[cloud as AzureCloudName] ?? cloud}
              </span>
              <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                v{info!.fromChangeNumber} &nbsp;→&nbsp; v{info!.toChangeNumber}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="px-5 pb-4 pt-1">
        {summary && (summary.serviceTagsAdded > 0 || summary.serviceTagsModified > 0) && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {summary.serviceTagsAdded > 0 && <>{summary.serviceTagsAdded} new tags</>}
            {summary.serviceTagsAdded > 0 && summary.serviceTagsModified > 0 && <>&nbsp;&nbsp;&nbsp;</>}
            {summary.serviceTagsModified > 0 && <>{summary.serviceTagsModified} modified</>}
          </p>
        )}
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Last update: {new Date(diffData.meta.generatedAt).toLocaleDateString('sv-SE')}
          {serviceCount != null && serviceCount > 0 && <> · {serviceCount} services</>}
        </p>
      </div>
    </div>
  );
}
