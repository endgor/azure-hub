import { useMemo, useState, useCallback, useRef, useEffect, type ReactElement } from 'react';
import type { LeafSubnet } from '@/lib/subnetCalculator';
import { NetworkType, inetNtoa } from '@/lib/subnetCalculator';

interface AddressMapProps {
  basePrefix: number;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;
  onSegmentClick?: (id: string) => void;
}

interface Segment {
  id: string;
  fraction: number;
  type: NetworkType;
  prefix: number;
  network: number;
  color: string | null;
  comment: string | null;
}

interface TooltipState {
  segment: Segment;
  x: number;
  y: number;
}

const MIN_LABEL_WIDTH_PX = 52;

export default function AddressMap({
  basePrefix,
  leaves,
  rowColors,
  rowComments,
  onSegmentClick
}: AddressMapProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { segments, assignedPercent } = useMemo(() => {
    const totalAddresses = Math.pow(2, 32 - basePrefix);

    const segs: Segment[] = leaves.map((leaf) => ({
      id: leaf.id,
      fraction: Math.pow(2, 32 - leaf.prefix) / totalAddresses,
      type: leaf.networkType ?? NetworkType.UNASSIGNED,
      prefix: leaf.prefix,
      network: leaf.network,
      color: rowColors[leaf.id] ?? null,
      comment: rowComments[leaf.id] ?? null
    }));

    const assigned = segs
      .filter((s) => s.type !== NetworkType.UNASSIGNED)
      .reduce((sum, s) => sum + s.fraction, 0);

    return { segments: segs, assignedPercent: Math.round(assigned * 100) };
  }, [basePrefix, leaves, rowColors, rowComments]);

  const handleMouseEnter = useCallback((seg: Segment, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      segment: seg,
      x: e.clientX - rect.left,
      y: rect.top - e.clientY > 0 ? e.clientY - rect.top : 0
    });
  }, []);

  const handleMouseMove = useCallback((seg: Segment, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      segment: seg,
      x: e.clientX - rect.left,
      y: 0
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Address Space</span>
        <span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{assignedPercent}%</span> allocated
        </span>
      </div>

      {/* Interactive strip map */}
      <div
        ref={containerRef}
        className="relative flex h-8 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
      >
        {segments.map((seg) => {
          const widthPx = seg.fraction * containerWidth;
          const showLabel = widthPx >= MIN_LABEL_WIDTH_PX;

          return (
            <button
              key={seg.id}
              type="button"
              className={`${segmentClasses(seg)} relative flex items-center justify-center overflow-hidden border-r border-white/30 text-[10px] font-medium leading-none last:border-r-0 dark:border-slate-900/30`}
              style={{
                width: `${seg.fraction * 100}%`,
                ...(seg.color ? { backgroundColor: seg.color } : {})
              }}
              onClick={() => onSegmentClick?.(seg.id)}
              onMouseEnter={(e) => handleMouseEnter(seg, e)}
              onMouseMove={(e) => handleMouseMove(seg, e)}
              onMouseLeave={handleMouseLeave}
              aria-label={`${inetNtoa(seg.network)}/${seg.prefix} — ${seg.type}`}
            >
              {showLabel && (
                <span className={`truncate px-1 ${labelTextClass(seg)}`}>
                  /{seg.prefix}
                </span>
              )}
            </button>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute bottom-full z-50 mb-2 w-max max-w-xs"
            style={{ left: `${Math.min(Math.max(tooltip.x, 80), containerWidth - 80)}px`, transform: 'translateX(-50%)' }}
          >
            <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs shadow-lg dark:bg-slate-700">
              <div className="font-semibold text-white">
                {inetNtoa(tooltip.segment.network)}/{tooltip.segment.prefix}
              </div>
              <div className="mt-0.5 text-slate-300">
                {typeLabel(tooltip.segment.type)}
                <span className="mx-1.5 text-slate-500">·</span>
                {Math.pow(2, 32 - tooltip.segment.prefix).toLocaleString()} addresses
                <span className="mx-1.5 text-slate-500">·</span>
                {(tooltip.segment.fraction * 100).toFixed(1)}%
              </div>
              {tooltip.segment.comment && (
                <div className="mt-1 text-slate-400 italic">{tooltip.segment.comment}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
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
  if (seg.color) return 'transition-all duration-300 hover:brightness-95 cursor-pointer';

  switch (seg.type) {
    case NetworkType.VNET:
      return 'bg-sky-400 dark:bg-sky-500 transition-all duration-300 hover:bg-sky-500 dark:hover:bg-sky-400 cursor-pointer';
    case NetworkType.SUBNET:
      return 'bg-emerald-400 dark:bg-emerald-500 transition-all duration-300 hover:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer';
    default:
      return 'bg-slate-200 dark:bg-slate-700 transition-all duration-300 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer';
  }
}

function labelTextClass(seg: Segment): string {
  if (seg.color) return 'text-slate-700';

  switch (seg.type) {
    case NetworkType.VNET:
      return 'text-sky-900 dark:text-sky-100';
    case NetworkType.SUBNET:
      return 'text-emerald-900 dark:text-emerald-100';
    default:
      return 'text-slate-500 dark:text-slate-400';
  }
}

function typeLabel(type: NetworkType): string {
  switch (type) {
    case NetworkType.VNET:
      return 'VNet';
    case NetworkType.SUBNET:
      return 'Subnet';
    default:
      return 'Unassigned';
  }
}
