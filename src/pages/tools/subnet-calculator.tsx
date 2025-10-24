import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SubnetExportButton from '@/components/SubnetExportButton';
import {
  DEFAULT_NETWORK,
  DEFAULT_PREFIX,
  LeafSubnet,
  SubnetTree,
  collectLeaves,
  computeLeafCounts,
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

export default function SubnetCalculatorPage(): JSX.Element {
  const [formFields, setFormFields] = useState({
    network: DEFAULT_NETWORK,
    prefix: DEFAULT_PREFIX.toString()
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [useAzureReservations, setUseAzureReservations] = useState(false);
  const [rowColors, setRowColors] = useState<Record<string, string>>({});
  const [isColorModeActive, setIsColorModeActive] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string>(DEFAULT_COLOR_ID);
  const [rowComments, setRowComments] = useState<Record<string, string>>({});
  const [activeCommentRow, setActiveCommentRow] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
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
  const router = useRouter();
  const [hasRestoredShare, setHasRestoredShare] = useState(false);
  const shareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isAzureMenuOpen, setIsAzureMenuOpen] = useState(false);
  const azureMenuRef = useRef<HTMLDivElement | null>(null);
  const colorMenuRef = useRef<HTMLDivElement | null>(null);

  const leaves = useMemo(() => collectLeaves(state.tree, state.rootId), [state.tree, state.rootId]);
  const maxDepth = useMemo(() => leaves.reduce((maximum, leaf) => Math.max(maximum, leaf.depth), 0), [leaves]);
  const leafCounts = useMemo(() => computeLeafCounts(state.tree, state.rootId), [state.tree, state.rootId]);
  const joinColumnCount = Math.max(maxDepth + 1, 1);
  const renderedJoinCells = new Set<string>();
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
    setIsColorModeActive(false);
    setSelectedColorId(DEFAULT_COLOR_ID);
    closeCommentEditor();
    setHasRestoredShare(true);
  }, [router.isReady, router.query.state, hasRestoredShare]);

  useEffect(() => {
    const leafIds = new Set(leaves.map((leaf) => leaf.id));

    setRowColors((current) => {
      let mutated = false;
      const next: Record<string, string> = {};

      Object.entries(current).forEach(([leafId, color]) => {
        if (leafIds.has(leafId)) {
          next[leafId] = color;
        } else {
          mutated = true;
        }
      });

      return mutated ? next : current;
    });

    setRowComments((current) => {
      let mutated = false;
      const next: Record<string, string> = {};

      Object.entries(current).forEach(([leafId, comment]) => {
        if (leafIds.has(leafId)) {
          next[leafId] = comment;
        } else {
          mutated = true;
        }
      });

      return mutated ? next : current;
    });

    if (activeCommentRow && !leafIds.has(activeCommentRow)) {
      setActiveCommentRow(null);
      setCommentDraft('');
    }
  }, [leaves, activeCommentRow]);

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
      const sharePlan = buildShareableSubnetPlan({
        baseNetwork: state.baseNetwork,
        basePrefix: state.basePrefix,
        useAzureReservations,
        leaves,
        rowColors,
        rowComments
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
    closeCommentEditor();
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
    setRowColors({});
    setIsColorModeActive(false);
    setRowComments({});
    closeCommentEditor();
    setState({
      rootId,
      tree,
      baseNetwork: normalised,
      basePrefix: DEFAULT_PREFIX
    });
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
          next[`${nodeId}-1`] = color;
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
          next[`${nodeId}-1`] = comment;
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
      setRowColors((current) => {
        const next = { ...current };
        let mutated = false;

        const leftColor = next[childIds[0]];
        const rightColor = next[childIds[1]];

        if (childIds[0] in next) {
          delete next[childIds[0]];
          mutated = true;
        }
        if (childIds[1] in next) {
          delete next[childIds[1]];
          mutated = true;
        }

        const mergedColor =
          leftColor && rightColor
            ? leftColor === rightColor
              ? leftColor
              : undefined
            : leftColor || rightColor;

        if (mergedColor) {
          if (next[nodeId] !== mergedColor) {
            next[nodeId] = mergedColor;
            mutated = true;
          }
        } else if (nodeId in next) {
          delete next[nodeId];
          mutated = true;
        }

        return mutated ? next : current;
      });
    }

    if (canJoinNode && childIds) {
      setRowComments((current) => {
        const leftComment = current[childIds[0]];
        const rightComment = current[childIds[1]];
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

        const mergedComment =
          leftComment && rightComment
            ? leftComment === rightComment
              ? leftComment
              : ''
            : leftComment || rightComment || '';

        if (mergedComment) {
          if (next[nodeId] !== mergedComment) {
            next[nodeId] = mergedComment;
            mutated = true;
          }
        } else if (nodeId in next) {
          delete next[nodeId];
          mutated = true;
        }

        return mutated ? next : current;
      });

      if (activeCommentRow && (childIds.includes(activeCommentRow) || activeCommentRow === nodeId)) {
        closeCommentEditor();
      }
    }
  };

  return (
    <Layout
      title="Subnet Calculator"
      description="Plan Azure address spaces, model subnet splits, and export allocation charts with the Azure Hub subnet calculator."
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

        <div className="relative rounded-[26px] bg-white/95 p-6 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)] ring-1 ring-white/60 backdrop-blur">
          <div className="absolute inset-0 rounded-3xl border border-slate-100/40" aria-hidden />
          <form onSubmit={handleApplyNetwork} className="relative z-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-[240px_160px_minmax(0,1fr)] sm:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="text-sm font-semibold text-slate-900">Network Address</span>
              <input
                value={formFields.network}
                onChange={handleFieldChange('network')}
                className="h-10 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder:text-slate-400"
                placeholder="10.0.0.0"
                inputMode="decimal"
                autoComplete="off"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700 sm:w-auto">
              <span className="text-sm font-semibold text-slate-900">Network Size</span>
              <div className="flex h-10 items-center gap-1.5 rounded-[18px] border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-200">
                <span className="text-xs font-semibold text-slate-400">/</span>
                <input
                  value={formFields.prefix}
                  onChange={handleFieldChange('prefix')}
                  className="w-12 bg-transparent text-center text-sm font-semibold text-slate-900 focus:outline-none"
                  placeholder="16"
                  inputMode="numeric"
                />
              </div>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-[18px] bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-white"
              >
                Go
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-10 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 focus:ring-offset-white"
              >
                Reset
              </button>
            </div>

            {formError && (
              <div className="ml-auto max-w-xs rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 shadow-sm">
                {formError}
              </div>
            )}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-[0_16px_36px_-26px_rgba(15,23,42,0.4)]">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Current Plan</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{inetNtoa(state.baseNetwork)}</span>
                  <span className="ml-1 text-slate-400">{formatPrefix(state.basePrefix)}</span>
                  <span className="mx-2 text-slate-300">·</span>
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
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                          isColorModeActive ? 'border-sky-300 text-sky-600' : 'border-slate-200 hover:border-slate-300'
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
                        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 flex-col items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 py-2 shadow-lg">
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
                                : 'border-transparent hover:border-slate-300'
                            }`}
                            style={{ backgroundColor: '#ffffff' }}
                            aria-label="Clear highlight"
                          />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
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
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sky-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                          isAzureMenuOpen ? 'border-sky-300' : 'border-slate-200 hover:border-sky-300'
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
                        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-lg">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={useAzureReservations}
                              onChange={(event) => setUseAzureReservations(event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="whitespace-nowrap text-[10px] font-semibold tracking-[0.25em] text-slate-600">
                              Use Azure Reserved IPs
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAzureMenuOpen(false)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                        shareStatus === 'copied'
                          ? 'border-emerald-300 text-emerald-600'
                          : shareStatus === 'error'
                            ? 'border-rose-300 text-rose-500'
                            : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600'
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
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Link copied!</span>
                    )}
                    {shareStatus === 'error' && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Copy failed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
                  <th className="border border-slate-200 px-2.5 py-2">Comment</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-center" colSpan={joinColumnCount}>
                    Split / Join
                  </th>
                </tr>
              </thead>
              <tbody>
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
              const rowColor = rowColors[leaf.id];
              const rowBackground = rowColor
                ? ''
                : rowIndex % 2 === 0
                ? 'bg-white dark:bg-slate-900'
                : 'bg-slate-50/40 dark:bg-slate-900';
                  const highlightStyle = rowColor ? { backgroundColor: rowColor } : undefined;
                  const comment = rowComments[leaf.id] ?? '';
                  const isEditingComment = activeCommentRow === leaf.id;

                  segments.forEach((segment, index) => {
                    const isLeafSegment = index === 0;
                    const isRootSegment = segment.id === state.rootId;
                    const segmentKey = `${leaf.id}-${segment.id}`;
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
                          onClick={() => handleSplit(leaf.id)}
                          className="flex h-full w-full items-center justify-center bg-emerald-500 px-1 py-2 text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-1 focus:ring-offset-white"
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
                      <td key={segmentKey} rowSpan={rowSpan} className="border border-slate-200 p-0 align-middle">
                        {content}
                      </td>
                    );
                    renderedJoinCells.add(segment.id);
                  });

                  return (
                    <tr
                      key={leaf.id}
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
                            if (!(leaf.id in current)) {
                              return current;
                            }
                            const next = { ...current };
                            delete next[leaf.id];
                            return next;
                          }
                          if (current[leaf.id] === activeColorHex) {
                            return current;
                          }
                          return {
                            ...current,
                            [leaf.id]: activeColorHex
                          };
                        });
                      }}
                      title={isColorModeActive ? 'Click to apply selected color' : undefined}
                    >
                      <td className="border border-slate-200 px-2.5 py-1.5 align-top" style={highlightStyle}>
                        <span className="font-medium text-slate-900">{subnetLabel(leaf)}</span>
                      </td>
                      <td
                        className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500"
                        style={highlightStyle}
                      >
                        {inetNtoa(subnetNetmask(leaf.prefix))}
                      </td>
                      <td
                        className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500"
                        style={highlightStyle}
                      >
                        {formatRange(leaf.network, lastAddress)}
                      </td>
                      <td
                        className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500"
                        style={highlightStyle}
                      >
                        {usable ? formatRange(usable.first, usable.last) : 'Reserved'}
                      </td>
                      <td
                        className="border border-slate-200 px-2.5 py-1.5 align-top font-mono text-[11px] text-slate-500"
                        style={highlightStyle}
                      >
                        {hostCount.toLocaleString()}
                      </td>
                      <td
                        className="border border-slate-200 px-2.5 py-1.5 align-top text-xs text-slate-500"
                        data-skip-color
                        onClick={(event) => event.stopPropagation()}
                        style={highlightStyle}
                      >
                        {isEditingComment ? (
                          <form
                            className="space-y-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              saveComment(leaf.id, commentDraft);
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
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              rows={3}
                              autoFocus
                              placeholder="Document this subnet..."
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-[12px] bg-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={closeCommentEditor}
                                className="inline-flex items-center justify-center rounded-[12px] border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`max-w-[220px] truncate ${
                                comment ? 'text-slate-600' : 'text-slate-400 italic'
                              }`}
                              title={comment || undefined}
                            >
                              {comment || 'Add comment'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openCommentEditor(leaf.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
