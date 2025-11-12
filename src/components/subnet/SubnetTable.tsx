import type { ReactElement } from 'react';
import type { LeafSubnet, SubnetTree } from '@/lib/subnetCalculator';
import {
  NetworkType,
  getNodePath,
  inetNtoa,
  isJoinableNode,
  isUnderVNet,
  subnetLastAddress,
  subnetNetmask,
  usableRange,
  usableRangeByType,
  hostCapacity,
  hostCapacityByType
} from '@/lib/subnetCalculator';

interface RenderableRow extends LeafSubnet {
  isLockedVNetParent: boolean;
}

export interface SubnetTableProps {
  renderRows: RenderableRow[];
  tree: SubnetTree;
  rootId: string;
  leafCounts: Record<string, number>;
  useAzureReservations: boolean;
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;
  activeCommentRow: string | null;
  commentDraft: string;
  isColorModeActive: boolean;
  resetPulse: boolean;
  onSplit: (nodeId: string) => void;
  onJoin: (nodeId: string) => void;
  onToggleNetworkType: (nodeId: string) => void;
  onApplyColor: (rowId: string) => void;
  onOpenCommentEditor: (leafId: string) => void;
  onSaveComment: (leafId: string, value: string) => void;
  onCloseCommentEditor: () => void;
  onCommentDraftChange: (value: string) => void;
  onResetTree: () => void;
}

function formatRange(first: number, last: number): string {
  if (first === last) {
    return inetNtoa(first);
  }
  return `${inetNtoa(first)} - ${inetNtoa(last)}`;
}

function formatPrefix(prefix: number): string {
  return `/${prefix}`;
}

function subnetLabel(subnet: LeafSubnet) {
  return `${inetNtoa(subnet.network)}${formatPrefix(subnet.prefix)}`;
}

/**
 * Main table component for displaying subnet allocations.
 * Renders the complete subnet tree with split/join controls.
 */
export default function SubnetTable({
  renderRows,
  tree,
  rootId,
  leafCounts,
  useAzureReservations,
  rowColors,
  rowComments,
  activeCommentRow,
  commentDraft,
  isColorModeActive,
  resetPulse,
  onSplit,
  onJoin,
  onToggleNetworkType,
  onApplyColor,
  onOpenCommentEditor,
  onSaveComment,
  onCloseCommentEditor,
  onCommentDraftChange,
  onResetTree
}: SubnetTableProps): ReactElement {
  const maxDepth = renderRows.reduce((maximum, row) => Math.max(maximum, row.depth), 0);
  const joinColumnCount = Math.max(maxDepth + 1, 1);
  const renderedJoinCells = new Set<string>();

  return (
    <div className="mt-4 overflow-x-auto">
      <table
        className={`min-w-full border-collapse text-sm text-slate-600 dark:text-slate-400 transition ${
          resetPulse ? 'animate-[pulse_0.6s_ease-in-out_1]' : ''
        }`}
      >
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Type</th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Network Address</th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Netmask</th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Range of Addresses</th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">
              Usable IPs{useAzureReservations ? ' (Azure)' : ''}
            </th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">
              Hosts{useAzureReservations ? ' (Azure)' : ''}
            </th>
            <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Comment</th>
            <th
              className="border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-center"
              colSpan={joinColumnCount}
            >
              Split / Join
            </th>
          </tr>
        </thead>
        <tbody>
          {renderRows.map((row, rowIndex) => {
            const node = tree[row.id];
            const networkType = node?.networkType || NetworkType.UNASSIGNED;
            const isUnderVnet = isUnderVNet(tree, row.id);
            const lastAddress = subnetLastAddress(row.network, row.prefix);
            const isLockedVNetParent = row.isLockedVNetParent;

            // Use network type to calculate usable IPs
            const usable = useAzureReservations
              ? usableRangeByType(row.network, row.prefix, networkType)
              : usableRange(row.network, row.prefix);
            const hostCount = useAzureReservations
              ? hostCapacityByType(row.prefix, networkType)
              : hostCapacity(row.prefix);

            const path = getNodePath(tree, row.id);
            const canSplit = !node?.children && row.prefix < 32;
            const segments = [...path].reverse();
            const joinCells: ReactElement[] = [];
            const rowColor = rowColors[row.id];
            const rowBackground = rowColor
              ? ''
              : rowIndex % 2 === 0
                ? 'bg-white dark:bg-slate-900'
                : 'bg-slate-50/40 dark:bg-slate-800/40';
            const highlightStyle = rowColor ? { backgroundColor: rowColor } : undefined;
            const comment = rowComments[row.id] ?? '';
            const isEditingComment = activeCommentRow === row.id;

            // Visual styling for VNets (bold) and subnets under VNets (indented)
            const isVNet = networkType === NetworkType.VNET;
            const isSubnet = networkType === NetworkType.SUBNET;
            const treeIndent = isUnderVnet ? 'pl-6' : '';
            const toggleLocked = isUnderVnet;
            const toggleTitle = toggleLocked
              ? 'Subnets within a VNet share its address space and cannot be promoted to VNet.'
              : `Toggle network type (current: ${networkType})`;
            const toggleClasses = [
              'inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-sky-300',
              toggleLocked ? 'cursor-not-allowed opacity-70' : '',
              isVNet
                ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60'
                : isSubnet
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            ]
              .filter(Boolean)
              .join(' ');

            if (isLockedVNetParent) {
              joinCells.push(
                <td
                  key={`${row.id}-locked`}
                  colSpan={joinColumnCount}
                  className="border border-slate-200 bg-sky-50 px-2.5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-700 dark:border-slate-700 dark:bg-sky-900/10 dark:text-sky-300"
                >
                  Locked VNet – manage splits via child subnets
                </td>
              );
            } else {
              segments.forEach((segment, index) => {
                const isLeafSegment = index === 0;
                const isRootSegment = segment.id === rootId;
                const segmentKey = `${row.id}-${segment.id}`;
                const rowSpan = leafCounts[segment.id] ?? 1;
                const colSpan = isLeafSegment ? Math.max(joinColumnCount - (path.length - 1), 1) : 1;
                const alternateBg =
                  index % 2 === 0
                    ? 'bg-slate-100/80 dark:bg-slate-800/70'
                    : 'bg-slate-200/60 dark:bg-slate-800/60';

                if (isLeafSegment) {
                  const splitContent = canSplit ? (
                    <button
                      type="button"
                      onClick={() => onSplit(row.id)}
                      className="flex h-full w-full items-center justify-center bg-emerald-500 px-1 py-2 text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-1 focus:ring-offset-white"
                      title={`Split ${subnetLabel(row)} into /${row.prefix + 1}`}
                    >
                      <span
                        className="font-mono text-[11px] font-semibold"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        /{segment.prefix}
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-rose-100 px-1 py-2 text-rose-400">
                      <span
                        className="font-mono text-[11px] font-semibold"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        /{segment.prefix}
                      </span>
                    </div>
                  );

                  joinCells.push(
                    <td
                      key={segmentKey}
                      rowSpan={1}
                      colSpan={colSpan}
                      className="border border-slate-200 dark:border-slate-700 p-0 align-middle"
                    >
                      {splitContent}
                    </td>
                  );
                  return;
                }

                if (renderedJoinCells.has(segment.id)) {
                  return;
                }

                const joinable = !isRootSegment && isJoinableNode(tree, segment);
                const isResetCell = isRootSegment;
                const content = joinable ? (
                  <button
                    type="button"
                    onClick={() => onJoin(segment.id)}
                    className="flex h-full w-full items-center justify-center bg-sky-200 px-1 py-2 text-sky-900 transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 focus:ring-offset-white dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60 dark:focus:ring-sky-600 dark:focus:ring-offset-slate-900"
                    title={`Join child subnets into ${inetNtoa(segment.network)}/${segment.prefix}`}
                  >
                    <span
                      className="font-mono text-[11px] font-semibold"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      /{segment.prefix}
                    </span>
                  </button>
                ) : isResetCell ? (
                  <button
                    type="button"
                    onClick={onResetTree}
                    className="flex h-full w-full items-center justify-center bg-slate-200 px-1 py-2 text-slate-700 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 focus:ring-offset-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus:ring-slate-500 dark:focus:ring-offset-slate-900"
                    title="Reset subnet plan to the base network"
                  >
                    <span
                      className="font-mono text-[11px] font-semibold"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      /{segment.prefix}
                    </span>
                  </button>
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center px-1 py-2 text-slate-500 dark:text-slate-300 ${alternateBg}`}
                    title="Join unavailable until child subnets are merged"
                  >
                    <span
                      className="font-mono text-[11px] font-semibold"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      /{segment.prefix}
                    </span>
                  </div>
                );

                joinCells.push(
                  <td
                    key={segmentKey}
                    rowSpan={rowSpan}
                    className="border border-slate-200 dark:border-slate-700 p-0 align-middle"
                  >
                    {content}
                  </td>
                );
                renderedJoinCells.add(segment.id);
              });
            }

            return (
              <tr
                key={row.id}
                className={`transition ${rowBackground} ${
                  isColorModeActive ? 'cursor-pointer select-none' : ''
                }`}
                onClick={(event) => {
                  if (!isColorModeActive) {
                    return;
                  }
                  const target = event.target as HTMLElement;
                  if (
                    target.closest('button') ||
                    target.closest('[data-skip-color]') ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'INPUT'
                  ) {
                    return;
                  }
                  onApplyColor(row.id);
                }}
                title={isColorModeActive ? 'Click to apply selected color' : undefined}
              >
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top text-center"
                  style={highlightStyle}
                  data-skip-color
                >
                  <button
                    type="button"
                    disabled={toggleLocked}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleNetworkType(row.id);
                    }}
                    className={toggleClasses}
                    title={toggleTitle}
                  >
                    {isVNet ? 'VNet' : isSubnet ? 'Subnet' : 'Click'}
                  </button>
                </td>
                <td
                  className={`border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top ${treeIndent}`}
                  style={highlightStyle}
                >
                  <div className="flex items-center gap-2">
                    {isUnderVnet && <span className="text-slate-400 dark:text-slate-600">└</span>}
                    <span
                      className={`${
                        isVNet ? 'font-bold text-sky-700 dark:text-sky-400' : 'font-medium'
                      } text-slate-900 dark:text-slate-100`}
                    >
                      {subnetLabel(row)}
                    </span>
                  </div>
                </td>
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                  style={highlightStyle}
                >
                  {inetNtoa(subnetNetmask(row.prefix))}
                </td>
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                  style={highlightStyle}
                >
                  {formatRange(row.network, lastAddress)}
                </td>
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                  style={highlightStyle}
                >
                  {usable ? formatRange(usable.first, usable.last) : 'Reserved'}
                </td>
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                  style={highlightStyle}
                >
                  {hostCount.toLocaleString()}
                </td>
                <td
                  className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top text-xs text-slate-500 dark:text-slate-400"
                  data-skip-color
                  onClick={(event) => event.stopPropagation()}
                  style={highlightStyle}
                >
                  {isEditingComment ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onSaveComment(row.id, commentDraft);
                        onCloseCommentEditor();
                      }}
                    >
                      <textarea
                        value={commentDraft}
                        onChange={(event) => onCommentDraftChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            onCloseCommentEditor();
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                        rows={3}
                        autoFocus
                        placeholder="Document this subnet..."
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border dark:border-[#363638] dark:bg-slate-800 dark:text-[#0A84FF] dark:hover:border-[#0A84FF]/30 dark:hover:bg-[#0A84FF]/10"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={onCloseCommentEditor}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`max-w-[220px] truncate ${
                          comment
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500 italic'
                        }`}
                        title={comment || undefined}
                      >
                        {comment || 'Add comment'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenCommentEditor(row.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-600 dark:hover:text-sky-400"
                        aria-label={comment ? 'Edit comment' : 'Add comment'}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </td>
                {joinCells}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
