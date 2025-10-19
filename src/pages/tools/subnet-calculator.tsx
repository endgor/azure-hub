import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Layout from '@/components/Layout';
import {
  DEFAULT_NETWORK,
  DEFAULT_PREFIX,
  LeafSubnet,
  SubnetTree,
  collectLeaves,
  computeLeafCounts,
  createInitialTree,
  getNodePath,
  hostCapacity,
  hostCapacityAzure,
  inetAtov,
  inetNtoa,
  isJoinableNode,
  joinSubnet,
  normaliseNetwork,
  splitSubnet,
  subnetLastAddress,
  subnetNetmask,
  usableRange,
  usableRangeAzure
} from '@/lib/subnetCalculator';

interface State {
  rootId: string;
  baseNetwork: number;
  basePrefix: number;
  tree: SubnetTree;
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

export default function SubnetCalculatorPage(): JSX.Element {
  const [formFields, setFormFields] = useState({
    network: DEFAULT_NETWORK,
    prefix: DEFAULT_PREFIX.toString()
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [useAzureReservations, setUseAzureReservations] = useState(false);
  const [state, setState] = useState<State>(() => {
    const ipValue = inetAtov(DEFAULT_NETWORK)!;
    const normalised = normaliseNetwork(ipValue, DEFAULT_PREFIX);
    const { rootId, tree } = createInitialTree(normalised, DEFAULT_PREFIX);
    return {
      rootId,
      tree,
      baseNetwork: normalised,
      basePrefix: DEFAULT_PREFIX
    };
  });

  const leaves = useMemo(() => collectLeaves(state.tree, state.rootId), [state.tree, state.rootId]);
  const maxDepth = useMemo(() => leaves.reduce((maximum, leaf) => Math.max(maximum, leaf.depth), 0), [leaves]);
  const leafCounts = useMemo(() => computeLeafCounts(state.tree, state.rootId), [state.tree, state.rootId]);
  const joinColumnCount = Math.max(maxDepth + 1, 1);
  const renderedJoinCells = new Set<string>();
  const [resetPulse, setResetPulse] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleFieldChange = (field: 'network' | 'prefix') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormFields((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleApplyNetwork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const ipValue = inetAtov(formFields.network);
    if (ipValue === null) {
      setFormError('Please provide a valid IPv4 network address.');
      return;
    }

    const parsedPrefix = Number(formFields.prefix);
    if (!Number.isInteger(parsedPrefix) || parsedPrefix < 0 || parsedPrefix > 32) {
      setFormError('Mask bits must be a number between 0 and 32.');
      return;
    }

    const normalisedNetwork = normaliseNetwork(ipValue, parsedPrefix);
    const { rootId, tree } = createInitialTree(normalisedNetwork, parsedPrefix);

    setState({
      rootId,
      tree,
      baseNetwork: normalisedNetwork,
      basePrefix: parsedPrefix
    });
    setFormFields({
      network: inetNtoa(normalisedNetwork),
      prefix: parsedPrefix.toString()
    });
  };

  const handleReset = () => {
    const ipValue = inetAtov(DEFAULT_NETWORK)!;
    const normalised = normaliseNetwork(ipValue, DEFAULT_PREFIX);
    const { rootId, tree } = createInitialTree(normalised, DEFAULT_PREFIX);
    setFormFields({
      network: DEFAULT_NETWORK,
      prefix: DEFAULT_PREFIX.toString()
    });
    setFormError(null);
    setState({
      rootId,
      tree,
      baseNetwork: normalised,
      basePrefix: DEFAULT_PREFIX
    });
  };

  const handleSplit = (nodeId: string) => {
    setState((current) => {
      const updatedTree = splitSubnet(current.tree, nodeId);
      if (updatedTree === current.tree) {
        return current;
      }

      return {
        ...current,
        tree: updatedTree
      };
    });
  };

  const handleJoin = (nodeId: string) => {
    setState((current) => {
      const updatedTree = joinSubnet(current.tree, nodeId);
      if (updatedTree === current.tree) {
        return current;
      }

      return {
        ...current,
        tree: updatedTree
      };
    });
  };

  return (
    <Layout
      title="Subnet Calculator"
      description="Interactive subnetting tool inspired by the classic Visual Subnet Calculator, refreshed with Azure Hub styling."
    >
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600/80">Networking</p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-[34px]">Subnet Calculator</h1>
          <p className="max-w-3xl text-sm text-slate-600 md:text-base">
            Inspect CIDR blocks, plan subnet splits, and visualise mergeable ranges while keeping everything aligned with Azure
            hub-and-spoke design conventions.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[26px] bg-white/95 p-6 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)] ring-1 ring-white/60 backdrop-blur">
          <div className="absolute inset-0 rounded-3xl border border-slate-100/40" aria-hidden />
          <form onSubmit={handleApplyNetwork} className="relative z-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-[240px_160px_minmax(0,1fr)_auto] sm:items-end">
            <label className="flex flex-col text-sm text-slate-700">
              <span className="text-sm font-semibold text-slate-900">Network Address</span>
              <input
                value={formFields.network}
                onChange={handleFieldChange('network')}
                className="mt-1.5 h-11 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-900 shadow-[inset_0_1px_1px_rgba(15,23,42,0.08)] placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="10.0.0.0"
                inputMode="decimal"
                autoComplete="off"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700 sm:w-auto">
              <span className="text-sm font-semibold text-slate-900">Network Size</span>
              <div className="mt-1.5 flex h-11 items-center gap-1.5 rounded-[18px] border border-slate-200 bg-slate-50 px-3.5 shadow-[inset_0_1px_1px_rgba(15,23,42,0.08)]">
                <span className="text-xs font-semibold text-slate-400">/</span>
                <input
                  value={formFields.prefix}
                  onChange={handleFieldChange('prefix')}
                  className="w-12 bg-transparent text-center text-base font-semibold text-slate-900 focus:outline-none"
                  placeholder="16"
                  inputMode="numeric"
                />
              </div>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-[18px] bg-emerald-500 px-5 text-sm font-semibold text-white shadow-[0_10px_22px_-14px_rgba(16,185,129,0.65)] transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-white"
              >
                Go
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-[0_6px_18px_-15px_rgba(15,23,42,0.55)] transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 focus:ring-offset-white"
              >
                Reset
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:col-start-4 sm:inline-flex sm:h-11 sm:justify-self-end sm:rounded-[18px] sm:border sm:border-slate-200 sm:bg-white sm:px-4 sm:text-slate-600 sm:shadow-[0_6px_18px_-15px_rgba(15,23,42,0.55)]">
              <input
                type="checkbox"
                checked={useAzureReservations}
                onChange={(event) => setUseAzureReservations(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Azure Reserved IPs</span>
            </label>

            {formError && (
              <div className="ml-auto max-w-xs rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 shadow-sm">
                {formError}
              </div>
            )}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-[0_16px_36px_-26px_rgba(15,23,42,0.4)]">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Current Plan</p>
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{inetNtoa(state.baseNetwork)}</span>
                <span className="ml-1 text-slate-400">{formatPrefix(state.basePrefix)}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span>{leaves.length} subnet{leaves.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Normalised to network boundary:{' '}
              <span className="font-semibold text-slate-600">{inetNtoa(state.baseNetwork)}</span>
            </p>
          </header>

          <div className="mt-4 overflow-x-auto">
            <table
              className={`min-w-full border-collapse text-sm text-slate-600 transition ${resetPulse ? 'animate-[pulse_0.6s_ease-in-out_1]' : ''}`}
            >
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <th className="border border-slate-200 px-2.5 py-2">Subnet Address</th>
                  <th className="border border-slate-200 px-2.5 py-2">Netmask</th>
                  <th className="border border-slate-200 px-2.5 py-2">Range of Addresses</th>
                  <th className="border border-slate-200 px-2.5 py-2">
                    Usable IPs{useAzureReservations ? ' (Azure)' : ''}
                  </th>
                  <th className="border border-slate-200 px-2.5 py-2">
                    Hosts{useAzureReservations ? ' (Azure)' : ''}
                  </th>
                  <th className="border border-slate-200 px-2.5 py-2 text-center" colSpan={joinColumnCount}>
                    Split / Join
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderedJoinCells.clear()}
                {leaves.map((leaf, rowIndex) => {
                  const lastAddress = subnetLastAddress(leaf.network, leaf.prefix);
                  const usable = useAzureReservations
                    ? usableRangeAzure(leaf.network, leaf.prefix)
                    : usableRange(leaf.network, leaf.prefix);
                  const hostCount = useAzureReservations
                    ? hostCapacityAzure(leaf.prefix)
                    : hostCapacity(leaf.prefix);
                  const path = getNodePath(state.tree, leaf.id);
                  const canSplit = leaf.prefix < 32;
                  const segments = [...path].reverse();
                  const joinCells: JSX.Element[] = [];
                  const rowBackground = rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';

                  segments.forEach((segment, index) => {
                    const isLeafSegment = index === 0;
                    const isRootSegment = segment.id === state.rootId;
                    const segmentKey = `${leaf.id}-${segment.id}`;
                    const rowSpan = leafCounts[segment.id] ?? 1;
                    const colSpan = isLeafSegment ? Math.max(joinColumnCount - (path.length - 1), 1) : 1;
                    const alternateBg = index % 2 === 0 ? 'bg-slate-100/80' : 'bg-slate-200/60';

                    if (isLeafSegment) {
                      const splitContent = canSplit ? (
                        <button
                          type="button"
                          onClick={() => handleSplit(leaf.id)}
                          className="flex h-full w-full items-center justify-center bg-gradient-to-b from-rose-200/85 to-rose-300/85 px-1 py-2 text-rose-900 transition hover:from-rose-300/90 hover:to-rose-400/90 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-1 focus:ring-offset-white"
                          title={`Split ${subnetLabel(leaf)} into /${leaf.prefix + 1}`}
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
                          className="border border-slate-200 p-0 align-middle"
                        >
                          {splitContent}
                        </td>
                      );
                      return;
                    }

                    if (renderedJoinCells.has(segment.id)) {
                      return;
                    }

                    const joinable = !isRootSegment && isJoinableNode(state.tree, segment);
                    const isResetCell = isRootSegment;
                    const content = joinable ? (
                      <button
                        type="button"
                        onClick={() => handleJoin(segment.id)}
                        className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-200/90 to-sky-300/90 px-1 py-2 text-sky-900 transition hover:from-sky-300/95 hover:to-sky-400/90 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 focus:ring-offset-white"
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
                        onClick={() => {
                          if (resetTimerRef.current) {
                            clearTimeout(resetTimerRef.current);
                          }
                          setResetPulse(true);
                          resetTimerRef.current = setTimeout(() => setResetPulse(false), 500);
                          const { rootId, tree } = createInitialTree(state.baseNetwork, state.basePrefix);
                          setState({
                            rootId,
                            tree,
                            baseNetwork: state.baseNetwork,
                            basePrefix: state.basePrefix
                          });
                        }}
                        className="flex h-full w-full items-center justify-center bg-slate-200 px-1 py-2 text-slate-700 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 focus:ring-offset-white"
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
                        className={`flex h-full w-full items-center justify-center px-1 py-2 text-slate-500 ${alternateBg}`}
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
                      <td key={segmentKey} rowSpan={rowSpan} className="border border-slate-200 p-0 align-middle">
                        {content}
                      </td>
                    );
                    renderedJoinCells.add(segment.id);
                  });

                  return (
                    <tr key={leaf.id} className={`transition ${rowBackground}`}>
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top">
                        <span className="font-medium text-slate-900">{subnetLabel(leaf)}</span>
                      </td>
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500">
                        {inetNtoa(subnetNetmask(leaf.prefix))}
                      </td>
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500">
                        {formatRange(leaf.network, lastAddress)}
                      </td>
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500">
                        {usable ? formatRange(usable.first, usable.last) : 'Reserved'}
                      </td>
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500">
                        {hostCount.toLocaleString()}
                      </td>
                      {joinCells}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Layout>
  );
}
