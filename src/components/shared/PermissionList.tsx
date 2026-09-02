import { useMemo, useState } from 'react';
import {
  PERMISSION_GROUP_META,
  PERMISSION_GROUP_ORDER,
  groupPermissions,
  type PermissionGroup,
  type PermissionSystem,
} from '@/lib/utils/permissionGrouping';

export type PermissionTone = 'grant' | 'deny';

interface PermissionListProps {
  permissions: string[];
  /** Buckets by operation verb for the given system; 'none' renders one flat list. */
  grouping?: PermissionSystem | 'none';
  /** Granted patterns that satisfy a requested action - highlighted and sorted first. */
  matched?: Set<string> | null;
  /** Hide everything except the matched patterns. */
  onlyMatching?: boolean;
  /** Rows shown per group before a "Show N more" button; 0 disables collapsing. */
  collapseAfter?: number;
  /** Comparison mode: the other role's permissions, for the shared/unique dot. */
  otherSet?: Set<string> | null;
  uniqueColor?: 'sky' | 'violet';
  showEmptyGroups?: boolean;
  tone?: PermissionTone;
  emptyLabel?: string;
  maxHeightClass?: string;
}

export default function PermissionList({
  permissions,
  grouping = 'azure',
  matched = null,
  onlyMatching = false,
  collapseAfter = 8,
  otherSet = null,
  uniqueColor = 'sky',
  showEmptyGroups = false,
  tone = 'grant',
  emptyLabel = 'None',
  maxHeightClass,
}: PermissionListProps) {
  const visible = useMemo(
    () => (onlyMatching && matched ? permissions.filter(p => matched.has(p)) : permissions),
    [permissions, onlyMatching, matched]
  );

  const grouped = useMemo(
    () => (grouping === 'none'
      ? null
      : { order: PERMISSION_GROUP_ORDER[grouping], groups: groupPermissions(visible, grouping) }),
    [grouping, visible]
  );

  if (visible.length === 0 && !showEmptyGroups) {
    return <span className="text-xs italic text-slate-400 dark:text-slate-500">{emptyLabel}</span>;
  }

  const containerClass = `space-y-3 ${maxHeightClass ? `${maxHeightClass} overflow-y-auto pr-2` : ''}`;

  if (!grouped) {
    return (
      <div className={containerClass}>
        <PermissionRows
          permissions={visible}
          matched={matched}
          collapseAfter={collapseAfter}
          otherSet={otherSet}
          uniqueColor={uniqueColor}
          tone={tone}
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {grouped.order.map((group) => {
        const items = grouped.groups[group];
        if (items.length === 0 && !showEmptyGroups) return null;
        return (
          <PermissionGroupSection
            key={group}
            group={group}
            items={items}
            matched={matched}
            collapseAfter={collapseAfter}
            otherSet={otherSet}
            uniqueColor={uniqueColor}
            tone={tone}
          />
        );
      })}
    </div>
  );
}

function PermissionGroupSection({
  group,
  items,
  matched,
  collapseAfter,
  otherSet,
  uniqueColor,
  tone,
}: {
  group: PermissionGroup;
  items: string[];
  matched: Set<string> | null;
  collapseAfter: number;
  otherSet: Set<string> | null;
  uniqueColor: 'sky' | 'violet';
  tone: PermissionTone;
}) {
  const { label, accent } = PERMISSION_GROUP_META[group];

  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent}`}>
          {label}
        </span>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
          {items.length === 0 ? '—' : items.length}
        </span>
      </div>
      {items.length > 0 && (
        <PermissionRows
          permissions={items}
          matched={matched}
          collapseAfter={collapseAfter}
          otherSet={otherSet}
          uniqueColor={uniqueColor}
          tone={tone}
        />
      )}
    </div>
  );
}

/**
 * Matched permissions are sorted to the front so they stay visible above the
 * "Show N more" fold.
 */
function PermissionRows({
  permissions,
  matched,
  collapseAfter,
  otherSet,
  uniqueColor,
  tone,
}: {
  permissions: string[];
  matched: Set<string> | null;
  collapseAfter: number;
  otherSet: Set<string> | null;
  uniqueColor: 'sky' | 'violet';
  tone: PermissionTone;
}) {
  const [showAll, setShowAll] = useState(false);

  const ordered = useMemo(() => {
    if (!matched || matched.size === 0) return permissions;
    const matchedItems = permissions.filter(p => matched.has(p));
    if (matchedItems.length === 0) return permissions;
    return [...matchedItems, ...permissions.filter(p => !matched.has(p))];
  }, [permissions, matched]);

  const isCollapsible = collapseAfter > 0 && ordered.length > collapseAfter;
  const shown = isCollapsible && !showAll ? ordered.slice(0, collapseAfter) : ordered;
  const hidden = ordered.length - shown.length;

  return (
    <>
      <ul className="space-y-1.5">
        {shown.map((permission, idx) => (
          <PermissionRow
            key={`${permission}-${idx}`}
            permission={permission}
            isShared={otherSet ? otherSet.has(permission) : null}
            isMatched={matched ? matched.has(permission) : false}
            uniqueColor={uniqueColor}
            tone={tone}
          />
        ))}
      </ul>
      {isCollapsible && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-1.5 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {showAll ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </>
  );
}

/**
 * A single permission row. The dot carries comparison state when an `otherSet`
 * is supplied (green = shared, colored = unique to this role).
 */
function PermissionRow({
  permission,
  isShared,
  isMatched,
  uniqueColor,
  tone,
}: {
  permission: string;
  isShared: boolean | null;
  isMatched: boolean;
  uniqueColor: 'sky' | 'violet';
  tone: PermissionTone;
}) {
  const dotColor = isShared === null
    ? tone === 'deny'
      ? 'bg-rose-400 dark:bg-rose-500'
      : isMatched
        ? 'bg-emerald-500'
        : 'bg-slate-300 dark:bg-slate-600'
    : isShared
      ? 'bg-emerald-500'
      : uniqueColor === 'sky'
        ? 'bg-sky-500'
        : 'bg-violet-500';

  const textColor = tone === 'deny'
    ? 'text-rose-700 dark:text-rose-400'
    : 'text-slate-700 dark:text-slate-300';

  return (
    <li className="flex items-start gap-2.5 leading-snug">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} mt-[7px] flex-shrink-0`}></span>
      <code
        className={`font-mono text-xs break-words ${textColor} ${
          isMatched ? 'rounded bg-emerald-50 px-1 dark:bg-emerald-500/10' : ''
        }`}
      >
        {renderPermissionWithBreakHints(permission)}
      </code>
      {isMatched && (
        <span className="mt-[1px] text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex-shrink-0">
          match
        </span>
      )}
    </li>
  );
}

/**
 * Inserts <wbr> after each "/" so long permission paths prefer to wrap at
 * segment boundaries instead of breaking mid-word. The original string is
 * preserved for copy/paste because <wbr> is zero-width.
 */
function renderPermissionWithBreakHints(permission: string) {
  const parts = permission.split('/');
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          {'/'}
          <wbr />
        </>
      )}
    </span>
  ));
}
