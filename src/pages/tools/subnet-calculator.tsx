import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SubnetExportButton from '@/components/SubnetExportButton';
import ErrorBox from '@/components/shared/ErrorBox';
import Button from '@/components/shared/Button';
import {
  DEFAULT_NETWORK,
  DEFAULT_PREFIX,
  LeafSubnet,
  SubnetTree,
  collectLeaves,
  collectDisplayNodes,
  createInitialTree,
  createTreeFromLeafDefinitions,
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
import {
  buildShareableSubnetPlan,
  parseShareableSubnetPlan,
  serialiseShareableSubnetPlan
} from '@/lib/shareSubnetPlan';

interface State {
  rootId: string;
  baseNetwork: number;
  basePrefix: number;
  tree: SubnetTree;
}

const COLOR_SWATCHES = [
  { id: 'mint', label: 'Mint', hex: '#d1fae5' },
  { id: 'sky', label: 'Sky', hex: '#dbeafe' },
  { id: 'rose', label: 'Rose', hex: '#fce7f3' },
  { id: 'amber', label: 'Amber', hex: '#fef3c7' },
  { id: 'violet', label: 'Violet', hex: '#ede9fe' }
] as const;

const CLEAR_COLOR_ID = 'clear';
const DEFAULT_COLOR_ID = COLOR_SWATCHES[0].id;

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

function mergeChildProperties<T>(
  current: Record<string, T>,
  childIds: [string, string],
  parentId: string,
  conflictValue: T | undefined
): Record<string, T> {
  const leftValue = current[childIds[0]];
  const rightValue = current[childIds[1]];
  const next = { ...current };
  let mutated = false;

  if (childIds[0] in next) {
    delete next[childIds[0]];
    mutated = true;
  }
  if (childIds[1] in next) {
    delete next[childIds[1]];
    mutated = true;
  }

  const mergedValue =
    leftValue && rightValue
      ? leftValue === rightValue
        ? leftValue
        : conflictValue
      : leftValue || rightValue || conflictValue;

  if (mergedValue) {
    if (next[parentId] !== mergedValue) {
      next[parentId] = mergedValue;
      mutated = true;
    }
  } else if (parentId in next) {
    delete next[parentId];
    mutated = true;
  }

  return mutated ? next : current;
}

function cleanupRemovedLeaves<T>(
  current: Record<string, T>,
  validLeafIds: Set<string>
): Record<string, T> {
  let mutated = false;
  const next: Record<string, T> = {};

  Object.entries(current).forEach(([leafId, value]) => {
    if (validLeafIds.has(leafId)) {
      next[leafId] = value;
    } else {
      mutated = true;
    }
  });

  return mutated ? next : current;
}

function createSubnetState(network: string, prefix: number): State;
function createSubnetState(network: number, prefix: number): State;
function createSubnetState(network: string | number, prefix: number): State {
  const ipValue = typeof network === 'string' ? inetAtov(network)! : network;
  const normalised = normaliseNetwork(ipValue, prefix);
  const { rootId, tree } = createInitialTree(normalised, prefix);
  return {
    rootId,
    tree,
    baseNetwork: normalised,
    basePrefix: prefix
  };
}

export default function SubnetCalculatorPage(): ReactElement {
  const [formFields, setFormFields] = useState({
    network: DEFAULT_NETWORK,
    prefix: DEFAULT_PREFIX.toString()
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [useAzureReservations, setUseAzureReservations] = useState(true);
  const [rowColors, setRowColors] = useState<Record<string, string>>({});
  const [isColorModeActive, setIsColorModeActive] = useState(false);
  const [vnetFlags, setVnetFlags] = useState<Record<string, boolean>>({});
  const [selectedColorId, setSelectedColorId] = useState<string>(DEFAULT_COLOR_ID);
  const [rowComments, setRowComments] = useState<Record<string, string>>({});
  const [activeCommentRow, setActiveCommentRow] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [state, setState] = useState<State>(() => createSubnetState(DEFAULT_NETWORK, DEFAULT_PREFIX));
  const router = useRouter();
  const [hasRestoredShare, setHasRestoredShare] = useState(false);
  const shareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isAzureMenuOpen, setIsAzureMenuOpen] = useState(false);
  const azureMenuRef = useRef<HTMLDivElement | null>(null);
  const colorMenuRef = useRef<HTMLDivElement | null>(null);

  const leaves = useMemo(() => collectLeaves(state.tree, state.rootId), [state.tree, state.rootId]);
  const displayNodes = useMemo(() => collectDisplayNodes(state.tree, state.rootId, vnetFlags), [state.tree, state.rootId, vnetFlags]);
  const activeColorHex = useMemo(() => {
    if (selectedColorId === CLEAR_COLOR_ID) {
      return null;
    }
    return COLOR_SWATCHES.find((option) => option.id === selectedColorId)?.hex ?? null;
  }, [selectedColorId]);
  const [resetPulse, setResetPulse] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAzureMenuOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!azureMenuRef.current) {
        return;
      }
      if (!azureMenuRef.current.contains(event.target as Node)) {
        setIsAzureMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isAzureMenuOpen]);


  useEffect(() => {
    if (!router.isReady || hasRestoredShare) {
      return;
    }

    const stateParam = router.query.state;
    if (typeof stateParam !== 'string') {
      setHasRestoredShare(true);
      return;
    }

    const decodedState = parseShareableSubnetPlan(stateParam);
    if (!decodedState) {
      setHasRestoredShare(true);
      return;
    }

    const shareLeaves = decodedState.leaves;
    const { rootId, tree: rebuiltTree } = createTreeFromLeafDefinitions(
      decodedState.net,
      decodedState.pre,
      shareLeaves.map((leaf) => ({
        network: leaf.n,
        prefix: leaf.p
      }))
    );

    const colorByKey = new Map<string, string>();
    const commentByKey = new Map<string, string>();
    shareLeaves.forEach((leaf) => {
      if (leaf.c) {
        colorByKey.set(`${leaf.n}/${leaf.p}`, leaf.c);
      }
      if (leaf.m) {
        commentByKey.set(`${leaf.n}/${leaf.p}`, leaf.m);
      }
    });

    const rebuiltLeaves = collectLeaves(rebuiltTree, rootId);
    const nextColors: Record<string, string> = {};
    const nextComments: Record<string, string> = {};
    const nextVnetFlags: Record<string, boolean> = {};

    rebuiltLeaves.forEach((leaf) => {
      const mapKey = `${leaf.network}/${leaf.prefix}`;
      const mappedColor = colorByKey.get(mapKey);
      if (mappedColor) {
        nextColors[leaf.id] = mappedColor;
      }
      const mappedComment = commentByKey.get(mapKey);
      if (mappedComment) {
        nextComments[leaf.id] = mappedComment;
      }
    });

    // Restore vnet flags by matching network/prefix tuples to rebuilt tree nodes
    if (decodedState.vn && Array.isArray(decodedState.vn)) {
      decodedState.vn.forEach(([network, prefix]) => {
        // Find node with matching network and prefix
        Object.entries(rebuiltTree).forEach(([nodeId, node]) => {
          if (node.network === network && node.prefix === prefix) {
            nextVnetFlags[nodeId] = true;
          }
        });
      });
    }

    setState({
      rootId,
      tree: rebuiltTree,
      baseNetwork: decodedState.net,
      basePrefix: decodedState.pre
    });

    setFormFields({
      network: inetNtoa(decodedState.net),
      prefix: decodedState.pre.toString()
    });
    setUseAzureReservations(Boolean(decodedState.az));
    setRowColors(nextColors);
    setRowComments(nextComments);
    setVnetFlags(nextVnetFlags);
    setIsColorModeActive(false);
    setSelectedColorId(DEFAULT_COLOR_ID);
    closeCommentEditor();
    setHasRestoredShare(true);
  }, [router.isReady, router.query.state, hasRestoredShare]);

  useEffect(() => {
    const leafIds = new Set(leaves.map((leaf) => leaf.id));
    const allNodeIds = new Set(Object.keys(state.tree));

    setRowColors((current) => cleanupRemovedLeaves(current, leafIds));
    setRowComments((current) => cleanupRemovedLeaves(current, leafIds));
    setVnetFlags((current) => cleanupRemovedLeaves(current, allNodeIds));

    if (activeCommentRow && !leafIds.has(activeCommentRow)) {
      setActiveCommentRow(null);
      setCommentDraft('');
    }
  }, [leaves, activeCommentRow, state.tree]);

  const handleFieldChange = (field: 'network' | 'prefix') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormFields((current) => ({
      ...current,
      [field]: value
    }));
  };

  const openCommentEditor = (leafId: string) => {
    setActiveCommentRow(leafId);
    setCommentDraft(rowComments[leafId] ?? '');
  };

  const closeCommentEditor = () => {
    setActiveCommentRow(null);
    setCommentDraft('');
  };

  const saveComment = (leafId: string, value: string) => {
    const trimmed = value.trim();

    setRowComments((current) => {
      if (!trimmed) {
        if (!(leafId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[leafId];
        return next;
      }

      if (current[leafId] === trimmed) {
        return current;
      }

      return {
        ...current,
        [leafId]: trimmed
      };
    });
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!successful) {
      throw new Error('Copy to clipboard failed');
    }
  };

  const handleShare = async () => {
    setIsColorModeActive(false);
    if (typeof window === 'undefined' || isGeneratingShare) {
      return;
    }

    setIsGeneratingShare(true);
    try {
      // Convert tree to simple format for sharing
      const allNodes: Record<string, { network: number; prefix: number }> = {};
      Object.entries(state.tree).forEach(([nodeId, node]) => {
        allNodes[nodeId] = { network: node.network, prefix: node.prefix };
      });

      const sharePlan = buildShareableSubnetPlan({
        baseNetwork: state.baseNetwork,
        basePrefix: state.basePrefix,
        useAzureReservations,
        leaves,
        rowColors,
        rowComments,
        vnetFlags,
        allNodes
      });
      const encodedState = serialiseShareableSubnetPlan(sharePlan);
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('state', encodedState);

      await copyToClipboard(shareUrl.toString());
      setShareStatus('copied');
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = setTimeout(() => setShareStatus('idle'), 2400);
    } catch (error) {
      console.error('Failed to copy share link', error);
      setShareStatus('error');
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = setTimeout(() => setShareStatus('idle'), 3200);
    } finally {
      setIsGeneratingShare(false);
    }
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
    setRowColors({});
    setIsColorModeActive(false);
    setRowComments({});
    setVnetFlags({});
    closeCommentEditor();
    setFormFields({
      network: inetNtoa(normalisedNetwork),
      prefix: parsedPrefix.toString()
    });
  };

  const handleReset = () => {
    setFormFields({
      network: DEFAULT_NETWORK,
      prefix: DEFAULT_PREFIX.toString()
    });
    setFormError(null);
    setRowColors({});
    setIsColorModeActive(false);
    setRowComments({});
    setVnetFlags({});
    closeCommentEditor();
    setState(createSubnetState(DEFAULT_NETWORK, DEFAULT_PREFIX));
  };

  const handleSplit = (nodeId: string) => {
    const node = state.tree[nodeId];
    const canSplitNode = node && !node.children && node.prefix < 32;

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

    if (canSplitNode) {
      setRowColors((current) => {
        if (!(nodeId in current)) {
          return current;
        }
        const color = current[nodeId];
        const next = { ...current };
        delete next[nodeId];
        if (color) {
          next[`${nodeId}-0`] = color;
        }
        return next;
      });

      setRowComments((current) => {
        if (!(nodeId in current)) {
          return current;
        }
        const comment = current[nodeId];
        const next = { ...current };
        delete next[nodeId];
        if (comment) {
          next[`${nodeId}-0`] = comment;
        }
        return next;
      });

      if (activeCommentRow === nodeId) {
        closeCommentEditor();
      }
    }
  };

  const handleJoin = (nodeId: string) => {
    const node = state.tree[nodeId];
    const childIds = node?.children;
    const canJoinNode = !!node && !!childIds && isJoinableNode(state.tree, node);

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

    if (canJoinNode && childIds) {
      setRowColors((current) => mergeChildProperties(current, childIds, nodeId, undefined));
      setRowComments((current) => mergeChildProperties(current, childIds, nodeId, ''));

      if (activeCommentRow && (childIds.includes(activeCommentRow) || activeCommentRow === nodeId)) {
        closeCommentEditor();
      }
    }
  };

  const toggleVnetFlag = (nodeId: string) => {
    setVnetFlags((current) => {
      const isCurrentlyVnet = current[nodeId] === true;

      if (isCurrentlyVnet) {
        // Remove vnet flag
        const next = { ...current };
        delete next[nodeId];
        return next;
      }

      // Add vnet flag
      return {
        ...current,
        [nodeId]: true
      };
    });
  };

  return (
    <Layout
      title="Azure Subnet Calculator"
      description="Plan Azure address spaces, model subnet splits, and export allocation charts with the Azure Hub subnet calculator."
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'Subnet Calculator', url: 'https://azurehub.org/tools/subnet-calculator/' }
      ]}
      toolSchema={{
        name: 'Azure Subnet Calculator',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-6">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">Networking</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Azure Subnet Calculator</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Plan and visualize Azure virtual network subnets with CIDR notation. Split address spaces, calculate usable IPs, and export subnet configurations for your VNet deployment.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <form onSubmit={handleApplyNetwork} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-[240px_160px_minmax(0,1fr)] sm:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Network Address</span>
              <input
                value={formFields.network}
                onChange={handleFieldChange('network')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
                placeholder="10.0.0.0"
                inputMode="decimal"
                autoComplete="off"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200 sm:w-auto">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Network Size</span>
              <div className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/</span>
                <input
                  value={formFields.prefix}
                  onChange={handleFieldChange('prefix')}
                  className="w-12 bg-transparent text-center text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                  placeholder="16"
                  inputMode="numeric"
                />
              </div>
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" size="md">
                Go
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>

            {formError && (
              <ErrorBox className="ml-auto max-w-xs">
                {formError}
              </ErrorBox>
            )}
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Current Plan</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{inetNtoa(state.baseNetwork)}</span>
                  <span className="ml-1 text-slate-400 dark:text-slate-500">{formatPrefix(state.basePrefix)}</span>
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <span>
                    {leaves.length} subnet{leaves.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={colorMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsColorModeActive((current) => !current)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-slate-400 ${
                          isColorModeActive ? 'border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                        aria-pressed={isColorModeActive}
                        title={isColorModeActive ? 'Color mode enabled' : 'Toggle color mode'}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3.5c-4.694 0-8.5 3.206-8.5 7.25 0 1.502.414 2.878 1.318 3.999a3.5 3.5 0 002.682 1.251h1.75a1.5 1.5 0 011.5 1.5v.25a2.5 2.5 0 002.5 2.5h.25a3.75 3.75 0 003.75-3.75c0-1.1-.9-2-2-2h-.75a1.5 1.5 0 01-1.5-1.5c0-.828.672-1.5 1.5-1.5H15a3.5 3.5 0 000-7c-.552 0-1 .448-1 1s-.448 1-1 1-1-.448-1-1-.448-1-1-1z"
                          />
                          <circle cx="8.6" cy="10.3" r="0.85" fill="currentColor" />
                          <circle cx="10.6" cy="7.4" r="0.85" fill="currentColor" />
                          <circle cx="13.4" cy="8.2" r="0.85" fill="currentColor" />
                          <circle cx="9.4" cy="13.1" r="0.85" fill="currentColor" />
                        </svg>
                      </button>

                      {isColorModeActive && (
                        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-center gap-1.5">
                          {COLOR_SWATCHES.map((option) => {
                            const isSelected = selectedColorId === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedColorId(option.id)}
                                className={`h-5 w-5 rounded-full border-2 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                                  isSelected ? 'border-sky-500' : 'border-transparent hover:border-slate-300'
                                }`}
                                style={{ backgroundColor: option.hex }}
                                aria-label={`Select ${option.label} highlight`}
                              />
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setSelectedColorId(CLEAR_COLOR_ID)}
                            className={`h-5 w-5 rounded-full border-2 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                              selectedColorId === CLEAR_COLOR_ID
                                ? 'border-sky-500'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                            style={{ backgroundColor: '#ffffff' }}
                            aria-label="Clear highlight"
                          />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                            Click a row to paint
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative" ref={azureMenuRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsColorModeActive(false);
                          setIsAzureMenuOpen((current) => !current);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sky-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-sky-400 ${
                          isAzureMenuOpen ? 'border-sky-300 dark:border-sky-700' : 'border-slate-200 hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-600'
                        }`}
                        title="Azure Reserved IPs"
                        aria-expanded={isAzureMenuOpen}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
                          <path fill="currentColor" fillOpacity="0.92" d="M8 37L22.5 7H32L16 37H8z" />
                          <path fill="currentColor" fillOpacity="0.66" d="M21.5 37H33l7-12-7-5.5L21.5 37z" />
                        </svg>
                      </button>

                      {isAzureMenuOpen && (
                        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={useAzureReservations}
                              onChange={(event) => setUseAzureReservations(event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                            />
                            <span className="whitespace-nowrap text-[10px] font-semibold tracking-[0.25em] text-slate-600 dark:text-slate-400">
                              Use Azure Reserved IPs
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAzureMenuOpen(false)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
                            aria-label="Collapse Azure Reserved IPs toggle"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    <SubnetExportButton
                      leaves={leaves}
                      useAzureReservations={useAzureReservations}
                      baseNetwork={state.baseNetwork}
                      basePrefix={state.basePrefix}
                      rowColors={rowColors}
                      rowComments={rowComments}
                      variant="icon"
                      onTrigger={() => setIsColorModeActive(false)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 ${
                        shareStatus === 'copied'
                          ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                          : shareStatus === 'error'
                            ? 'border-rose-300 text-rose-500 dark:border-rose-700 dark:text-rose-400'
                            : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-600 dark:hover:text-sky-400'
                      }`}
                      disabled={isGeneratingShare}
                      title={
                        shareStatus === 'copied'
                          ? 'Link copied'
                          : shareStatus === 'error'
                            ? 'Copy failed'
                            : 'Copy shareable link'
                      }
                    >
                      {shareStatus === 'copied' ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : shareStatus === 'error' ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 7.5l3-3a3 3 0 114.243 4.243l-3 3M10.5 16.5l-3 3a3 3 0 11-4.243-4.243l3-3M8.25 15.75l7.5-7.5"
                          />
                        </svg>
                      )}
                    </button>
                    {shareStatus === 'copied' && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Link copied!</span>
                    )}
                    {shareStatus === 'error' && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400">Copy failed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-4 overflow-x-auto">
            <table
              className={`min-w-full border-collapse text-sm text-slate-600 dark:text-slate-400 transition ${resetPulse ? 'animate-[pulse_0.6s_ease-in-out_1]' : ''}`}
            >
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Type</th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Subnet Address</th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Netmask</th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Range of Addresses</th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">
                    Usable IPs{useAzureReservations ? ' (Azure)' : ''}
                  </th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">
                    Hosts{useAzureReservations ? ' (Azure)' : ''}
                  </th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2">Comment</th>
                  <th className="border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayNodes.map((node, rowIndex) => {
                  const lastAddress = subnetLastAddress(node.network, node.prefix);
                  const usable = useAzureReservations
                    ? usableRangeAzure(node.network, node.prefix)
                    : usableRange(node.network, node.prefix);
                  const hostCount = useAzureReservations
                    ? hostCapacityAzure(node.prefix)
                    : hostCapacity(node.prefix);
                  const canSplit = !node.children && node.prefix < 32;
                  const canJoin = node.children && isJoinableNode(state.tree, node);
                  const isRoot = node.id === state.rootId;

                  // Get path to show ancestor join buttons
                  const path = getNodePath(state.tree, node.id);
                  const joinableAncestors = path.filter(
                    (ancestor) => ancestor.id !== node.id && isJoinableNode(state.tree, ancestor)
                  );
              const rowColor = rowColors[node.id];
              const rowBackground = rowColor
                ? ''
                : node.isVnet
                ? 'bg-sky-50/60 dark:bg-sky-950/30'
                : rowIndex % 2 === 0
                ? 'bg-white dark:bg-slate-900'
                : 'bg-slate-50/40 dark:bg-slate-800/40';
                  const highlightStyle = rowColor ? { backgroundColor: rowColor } : undefined;
                  const comment = rowComments[node.id] ?? '';
                  const isEditingComment = activeCommentRow === node.id;
                  const indentPx = node.hierarchyLevel * 24;

                  return (
                    <tr
                      key={node.id}
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
                        setRowColors((current) => {
                          if (!activeColorHex) {
                            if (!(node.id in current)) {
                              return current;
                            }
                            const next = { ...current };
                            delete next[node.id];
                            return next;
                          }
                          if (current[node.id] === activeColorHex) {
                            return current;
                          }
                          return {
                            ...current,
                            [node.id]: activeColorHex
                          };
                        });
                      }}
                      title={isColorModeActive ? 'Click to apply selected color' : undefined}
                    >
                      <td className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top" style={highlightStyle}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVnetFlag(node.id);
                          }}
                          className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                            node.isVnet
                              ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title={node.isVnet ? 'Click to unmark as VNet' : 'Click to mark as VNet'}
                        >
                          {node.isVnet ? 'VNet' : 'Subnet'}
                        </button>
                      </td>
                      <td className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top" style={highlightStyle}>
                        <div style={{ paddingLeft: `${indentPx}px` }} className="flex items-center gap-1.5">
                          {node.hierarchyLevel > 0 && (
                            <span className="text-slate-400 dark:text-slate-600">└</span>
                          )}
                          <span className={node.isVnet ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-900 dark:text-slate-100'}>
                            {subnetLabel(node)}
                          </span>
                        </div>
                      </td>
                      <td
                        className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                        style={highlightStyle}
                      >
                        {inetNtoa(subnetNetmask(node.prefix))}
                      </td>
                      <td
                        className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400"
                        style={highlightStyle}
                      >
                        {formatRange(node.network, lastAddress)}
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
                              saveComment(node.id, commentDraft);
                              closeCommentEditor();
                            }}
                          >
                            <textarea
                              value={commentDraft}
                              onChange={(event) => setCommentDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  closeCommentEditor();
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
                                onClick={closeCommentEditor}
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
                                comment ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'
                              }`}
                              title={comment || undefined}
                            >
                              {comment || 'Add comment'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openCommentEditor(node.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-600 dark:hover:text-sky-400"
                              aria-label={comment ? 'Edit comment' : 'Add comment'}
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
                      <td
                        className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 align-middle text-center"
                        style={highlightStyle}
                        onClick={(event) => event.stopPropagation()}
                        data-skip-color
                      >
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Current node: split button for leaf nodes */}
                          {!node.children && (
                            <button
                              type="button"
                              onClick={() => handleSplit(node.id)}
                              disabled={!canSplit}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                canSplit
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                              }`}
                              title={canSplit ? `Split ${subnetLabel(node)} into /${node.prefix + 1}` : 'Cannot split /32 subnet'}
                              aria-label={canSplit ? `Split subnet into /${node.prefix + 1}` : 'Split disabled'}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                <path strokeLinecap="round" d="M12 8v8M8 12h8" />
                              </svg>
                            </button>
                          )}

                          {/* Current node: join button if it has children */}
                          {node.children && (
                            <button
                              type="button"
                              onClick={() => handleJoin(node.id)}
                              disabled={!canJoin}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                canJoin
                                  ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-300 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-400 dark:hover:bg-sky-950/60'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                              }`}
                              title={canJoin ? `Join child subnets back into ${subnetLabel(node)}` : 'Cannot join - children are subdivided'}
                              aria-label={canJoin ? 'Join child subnets' : 'Join disabled'}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                <path strokeLinecap="round" d="M8 12h8" />
                              </svg>
                            </button>
                          )}

                          {/* Ancestor join buttons - always joinable if in the list */}
                          {joinableAncestors.map((ancestor) => (
                            <button
                              key={ancestor.id}
                              type="button"
                              onClick={() => handleJoin(ancestor.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 transition focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-400 dark:hover:bg-sky-950/60"
                              title={`Join parent subnets into ${inetNtoa(ancestor.network)}/${ancestor.prefix}`}
                              aria-label={`Join parent /${ancestor.prefix}`}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                <path strokeLinecap="round" d="M8 12h8" />
                              </svg>
                            </button>
                          ))}

                          {/* Root node reset button */}
                          {isRoot && (
                            <button
                              type="button"
                              onClick={() => {
                                if (resetTimerRef.current) {
                                  clearTimeout(resetTimerRef.current);
                                }
                                setResetPulse(true);
                                resetTimerRef.current = setTimeout(() => setResetPulse(false), 500);
                                setState(createSubnetState(state.baseNetwork, state.basePrefix));
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                              title="Reset subnet plan to base network"
                              aria-label="Reset plan"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
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
