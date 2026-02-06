import { useState, useEffect, useCallback, useRef } from 'react';
import { loadIpDiff } from '@/lib/clientIpDiffService';
import type { IpDiffFile, ModifiedTag, AddedTag, RemovedTag } from '@/types/ipDiff';
import { AzureCloudName } from '@/types/azure';

interface IpDiffPanelProps {
  className?: string;
}

// Cloud labels and styles (matching Results.tsx)
const CLOUD_LABELS: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'Public',
  [AzureCloudName.AzureUSGovernment]: 'Gov',
  [AzureCloudName.AzureChinaCloud]: 'China'
};

const CLOUD_STYLES: Record<AzureCloudName, string> = {
  [AzureCloudName.AzureCloud]: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  [AzureCloudName.AzureUSGovernment]: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  [AzureCloudName.AzureChinaCloud]: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
};

function CloudBadge({ cloud }: { cloud?: AzureCloudName }) {
  if (!cloud) return null;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${CLOUD_STYLES[cloud]}`}>
      {CLOUD_LABELS[cloud]}
    </span>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = getText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getText]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy prefixes'}
      className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-300"
    >
      {copied ? (
        <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function IpDiffPanel({ className = '' }: IpDiffPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diffData, setDiffData] = useState<IpDiffFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const fetchingRef = useRef(false);

  const fetchDiffData = useCallback(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setError(null);
    setIsLoading(true);

    loadIpDiff()
      .then((data) => {
        setDiffData(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load diff data');
      })
      .finally(() => {
        setIsLoading(false);
        fetchingRef.current = false;
      });
  }, []);

  // Preload diff data on mount so summary badge shows immediately
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time data fetch on mount
    fetchDiffData();
  }, [fetchDiffData]);

  const toggleTag = (tagName: string) => {
    setExpandedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagName)) {
        newSet.delete(tagName);
      } else {
        newSet.add(tagName);
      }
      return newSet;
    });
  };

  // Don't render if there's no diff data and we've finished loading
  if (!isExpanded && diffData === null && !isLoading) {
    // Still render collapsed header to allow loading
  }

  const summary = diffData?.meta.summary;
  const hasChanges = summary && (
    summary.totalPrefixesAdded > 0 ||
    summary.totalPrefixesRemoved > 0 ||
    summary.serviceTagsAdded > 0 ||
    summary.serviceTagsRemoved > 0
  );

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium text-slate-900 dark:text-slate-100">Recent Changes</span>
          {summary && hasChanges && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              {summary.totalPrefixesAdded > 0 && `+${summary.totalPrefixesAdded}`}
              {summary.totalPrefixesAdded > 0 && summary.totalPrefixesRemoved > 0 && ', '}
              {summary.totalPrefixesRemoved > 0 && `-${summary.totalPrefixesRemoved}`}
              {' '}prefixes
            </span>
          )}
        </div>
        {diffData && diffData.meta.clouds && Object.keys(diffData.meta.clouds).length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {Object.entries(diffData.meta.clouds).map(([cloud, info]) => (
              <span key={cloud} className="flex items-center gap-1">
                <span className={`inline-block rounded border px-1 py-0.5 text-[10px] font-medium ${CLOUD_STYLES[cloud as AzureCloudName]}`}>
                  {CLOUD_LABELS[cloud as AzureCloudName]}
                </span>
                <span>v{info.fromChangeNumber}→v{info.toChangeNumber}</span>
              </span>
            ))}
          </div>
        )}
        {diffData && (!diffData.meta.clouds || Object.keys(diffData.meta.clouds).length === 0) && diffData.meta.fromChangeNumber && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            v{diffData.meta.fromChangeNumber} → v{diffData.meta.toChangeNumber}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading changes...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
              <span>{error}</span>
              <button
                onClick={fetchDiffData}
                className="rounded px-2 py-0.5 text-xs font-medium text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && !diffData && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No version history available yet. Changes will appear after the next data update.
            </div>
          )}

          {!isLoading && !error && diffData && !hasChanges && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No IP prefix changes between versions.
            </div>
          )}

          {!isLoading && !error && diffData && hasChanges && (
            <div className="space-y-4">
              {/* Version Info */}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Updated {new Date(diffData.meta.generatedAt).toLocaleDateString()}
              </div>

              {/* Added Tags Section */}
              {diffData.addedTags.length > 0 && (
                <TagSection
                  title="New Service Tags"
                  count={diffData.addedTags.length}
                  tags={diffData.addedTags}
                  type="added"
                  expandedTags={expandedTags}
                  onToggleTag={toggleTag}
                />
              )}

              {/* Removed Tags Section */}
              {diffData.removedTags.length > 0 && (
                <TagSection
                  title="Removed Service Tags"
                  count={diffData.removedTags.length}
                  tags={diffData.removedTags}
                  type="removed"
                  expandedTags={expandedTags}
                  onToggleTag={toggleTag}
                />
              )}

              {/* Modified Tags Section */}
              {diffData.modifiedTags.length > 0 && (
                <ModifiedTagSection
                  tags={diffData.modifiedTags}
                  expandedTags={expandedTags}
                  onToggleTag={toggleTag}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TagSectionProps {
  title: string;
  count: number;
  tags: AddedTag[] | RemovedTag[];
  type: 'added' | 'removed';
  expandedTags: Set<string>;
  onToggleTag: (tagName: string) => void;
}

function TagSection({ title, count, tags, type, expandedTags, onToggleTag }: TagSectionProps) {
  const colorClass = type === 'added'
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title} ({count})
      </h4>
      <div className="space-y-1">
        {tags.map((tag) => {
          const tagKey = tag.cloud ? `${tag.cloud}:${tag.name}` : tag.name;
          const isTagExpanded = expandedTags.has(tagKey);
          return (
            <div key={tagKey} className="rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center">
                <button
                  onClick={() => onToggleTag(tagKey)}
                  className="flex flex-1 items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 transition-transform ${isTagExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <CloudBadge cloud={tag.cloud} />
                    <span className={`font-medium ${colorClass}`}>
                      {type === 'added' ? '+' : '-'} {tag.name}
                    </span>
                    {tag.region && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({tag.region})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {tag.prefixCount} prefixes
                  </span>
                </button>
                <div className="pr-2">
                  <CopyButton getText={() => tag.prefixes.join('\n')} />
                </div>
              </div>
              {isTagExpanded && tag.prefixes.length > 0 && (
                <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid gap-0.5">
                      {tag.prefixes.map((prefix, idx) => (
                        <div key={idx} className={`font-mono text-xs ${colorClass}`}>
                          {type === 'added' ? '+' : '-'} {prefix}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ModifiedTagSectionProps {
  tags: ModifiedTag[];
  expandedTags: Set<string>;
  onToggleTag: (tagName: string) => void;
}

function ModifiedTagSection({ tags, expandedTags, onToggleTag }: ModifiedTagSectionProps) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Modified Service Tags ({tags.length})
      </h4>
      <div className="space-y-1">
        {tags.map((tag) => {
          const tagKey = tag.cloud ? `${tag.cloud}:${tag.name}` : tag.name;
          const isTagExpanded = expandedTags.has(tagKey);
          const totalChanges = tag.addedPrefixes.length + tag.removedPrefixes.length;

          return (
            <div key={tagKey} className="rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center">
                <button
                  onClick={() => onToggleTag(tagKey)}
                  className="flex flex-1 items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 transition-transform ${isTagExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <CloudBadge cloud={tag.cloud} />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {tag.name}
                    </span>
                    {tag.region && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({tag.region})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {tag.addedPrefixes.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{tag.addedPrefixes.length}
                      </span>
                    )}
                    {tag.removedPrefixes.length > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        -{tag.removedPrefixes.length}
                      </span>
                    )}
                  </div>
                </button>
                <div className="pr-2">
                  <CopyButton getText={() => [
                    ...tag.addedPrefixes.map(p => `+ ${p}`),
                    ...tag.removedPrefixes.map(p => `- ${p}`)
                  ].join('\n')} />
                </div>
              </div>
              {isTagExpanded && totalChanges > 0 && (
                <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid gap-0.5">
                      {tag.addedPrefixes.map((prefix, idx) => (
                        <div key={`add-${idx}`} className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                          + {prefix}
                        </div>
                      ))}
                      {tag.removedPrefixes.map((prefix, idx) => (
                        <div key={`rem-${idx}`} className="font-mono text-xs text-rose-700 dark:text-rose-400">
                          - {prefix}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
