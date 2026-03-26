import { useMemo, type ReactElement } from 'react';
import type { LeafSubnet } from '@/lib/subnetCalculator';
import { NetworkType } from '@/lib/subnetCalculator';

interface UtilizationBarProps {
  basePrefix: number;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>;
}

interface Segment {
  id: string;
  fraction: number;
  type: NetworkType;
  prefix: number;
  color: string | null;
}

export default function UtilizationBar({
  basePrefix,
  leaves,
  rowColors
}: UtilizationBarProps): ReactElement {
  const { segments, assignedPercent } = useMemo(() => {
    const totalAddresses = Math.pow(2, 32 - basePrefix);

    const segs: Segment[] = leaves.map((leaf) => ({
      id: leaf.id,
      fraction: Math.pow(2, 32 - leaf.prefix) / totalAddresses,
      type: leaf.networkType ?? NetworkType.UNASSIGNED,
      prefix: leaf.prefix,
      color: rowColors[leaf.id] ?? null
    }));

    const assigned = segs
      .filter((s) => s.type !== NetworkType.UNASSIGNED)
      .reduce((sum, s) => sum + s.fraction, 0);

    return { segments: segs, assignedPercent: Math.round(assigned * 100) };
  }, [basePrefix, leaves, rowColors]);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Address Space Utilization</span>
        <span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{assignedPercent}%</span> allocated
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={segmentClasses(seg)}
            style={{ width: `${seg.fraction * 100}%`, ...(seg.color ? { backgroundColor: seg.color } : {}) }}
            title={`/${seg.prefix} — ${seg.type}${seg.type === NetworkType.UNASSIGNED ? ' (free)' : ''}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
          VNet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Subnet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />
          Unassigned
        </span>
      </div>
    </div>
  );
}

function segmentClasses(seg: Segment): string {
  if (seg.color) return 'transition-all duration-300';

  switch (seg.type) {
    case NetworkType.VNET:
      return 'bg-sky-400 dark:bg-sky-500 transition-all duration-300';
    case NetworkType.SUBNET:
      return 'bg-emerald-400 dark:bg-emerald-500 transition-all duration-300';
    default:
      return 'bg-slate-200 dark:bg-slate-700 transition-all duration-300';
  }
}
