import { useMemo } from 'react';
import {
  PERMISSION_GROUP_META,
  summarizePermissions,
  type PermissionSystem,
} from '@/lib/utils/permissionGrouping';

interface PermissionSummaryBarProps {
  permissions: string[];
  system: PermissionSystem;
  label?: string;
}

/** Verb counts for a permission set, so blast radius reads at a glance. */
export default function PermissionSummaryBar({ permissions, system, label }: PermissionSummaryBarProps) {
  const summary = useMemo(() => summarizePermissions(permissions, system), [permissions, system]);

  if (summary.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && (
        <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">{label}</span>
      )}
      {summary.map(({ group, count }) => (
        <span
          key={group}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] ${PERMISSION_GROUP_META[group].chip}`}
        >
          {PERMISSION_GROUP_META[group].label.toLowerCase()}
          <span className="tabular-nums font-semibold">{count}</span>
        </span>
      ))}
    </div>
  );
}
