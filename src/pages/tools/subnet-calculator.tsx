import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import Layout from '@/components/Layout';
import Button from '@/components/shared/Button';
import {
  DEFAULT_NETWORK,
  DEFAULT_PREFIX,
  LeafSubnet,
  NetworkType,
  SubnetNode,
  createInitialTree,
  inetAtov,
  inetNtoa,
  isRfc1918Cidr,
  normaliseNetwork
} from '@/lib/subnetCalculator';
import {
  useSubnetTree,
  useSubnetMetadata,
  useSubnetShare,
  useAzureVNetImport
} from '@/hooks/subnet';
import {
  SubnetTable,
  SubnetToolbar,
  COLOR_SWATCHES,
  CLEAR_COLOR_ID
} from '@/components/subnet';

interface RenderableRow extends LeafSubnet {
  isLockedVNetParent: boolean;
}

const DEFAULT_COLOR_ID = COLOR_SWATCHES[0].id;

/**
 * Collects all renderable rows from the tree, including locked VNet parents.
 */
function collectRenderableRows(tree: Record<string, SubnetNode>, rootId: string): RenderableRow[] {
  const root = tree[rootId];
  if (!root) {
    return [];
  }

  const rows: RenderableRow[] = [];
  const stack: Array<{ node: SubnetNode; depth: number }> = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop() as { node: SubnetNode; depth: number };
    const hasChildren = Boolean(node.children);
    const isLockedVNetParent = hasChildren && node.networkType === NetworkType.VNET;

    if (!hasChildren || isLockedVNetParent) {
      rows.push({
        ...node,
        depth,
        isLockedVNetParent
      });
    }

    if (hasChildren && node.children) {
      const [leftId, rightId] = node.children;
      const rightNode = tree[rightId];
      const leftNode = tree[leftId];

      if (rightNode) {
        stack.push({ node: rightNode, depth: depth + 1 });
      }
      if (leftNode) {
        stack.push({ node: leftNode, depth: depth + 1 });
      }
    }
  }

  return rows;
}

export default function SubnetCalculatorPage(): ReactElement {
  // Form state
  const [formFields, setFormFields] = useState({
    network: DEFAULT_NETWORK,
    prefix: DEFAULT_PREFIX.toString()
  });
  const [formError, setFormError] = useState<{ message: string; field: 'network' | 'prefix' } | null>(null);
  const [shaking, setShaking] = useState(false);

  // Tree state
  const initialNetwork = useMemo(() => inetAtov(DEFAULT_NETWORK) ?? 0, []);
  const treeHook = useSubnetTree(initialNetwork, DEFAULT_PREFIX);
  const { state, setState, leaves, leafCounts, handleSplit, handleJoin, handleToggleNetworkType, resetTree } = treeHook;

  // Computed values
  const renderRows = useMemo(
    () => collectRenderableRows(state.tree, state.rootId),
    [state.tree, state.rootId]
  );
  const visibleRowIds = useMemo(() => new Set(renderRows.map((row) => row.id)), [renderRows]);

  // Metadata state (colors, comments)
  const metadataHook = useSubnetMetadata(visibleRowIds);
  const {
    rowColors,
    setRowColors,
    rowComments,
    setRowComments,
    activeCommentRow,
    commentDraft,
    setCommentDraft,
    openCommentEditor,
    closeCommentEditor,
    saveComment,
    handleSplitMetadata,
    handleJoinMetadata,
    resetMetadata
  } = metadataHook;

  // Azure settings
  const azureHook = useAzureVNetImport();
  const {
    isAzureMenuOpen,
    setIsAzureMenuOpen,
    azureMenuRef,
    useAzureReservations,
    setUseAzureReservations
  } = azureHook;

  // Share link
  const shareHook = useSubnetShare({
    baseNetwork: state.baseNetwork,
    basePrefix: state.basePrefix,
    useAzureReservations,
    leaves,
    rowColors,
    rowComments,
    tree: state.tree
  });
  const { isGeneratingShare, shareStatus, handleShare, restoreFromUrl } = shareHook;

  // Color mode
  const [isColorModeActive, setIsColorModeActive] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string>(DEFAULT_COLOR_ID);
  const activeColorHex = useMemo(() => {
    if (selectedColorId === CLEAR_COLOR_ID) {
      return null;
    }
    return COLOR_SWATCHES.find((option) => option.id === selectedColorId)?.hex ?? null;
  }, [selectedColorId]);

  // Reset pulse animation
  const [resetPulse, setResetPulse] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  // Clear shake animation class after it plays so it can retrigger
  useEffect(() => {
    if (!shaking) return;
    const timer = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(timer);
  }, [shaking]);

  // Restore state from URL on mount
  useEffect(() => {
    const reconstructed = restoreFromUrl();
    if (!reconstructed) {
      return;
    }

    setState({
      rootId: reconstructed.rootId,
      tree: reconstructed.tree,
      baseNetwork: reconstructed.baseNetwork,
      basePrefix: reconstructed.basePrefix
    });

    setFormFields({
      network: inetNtoa(reconstructed.baseNetwork),
      prefix: reconstructed.basePrefix.toString()
    });
    setUseAzureReservations(reconstructed.useAzureReservations);
    setRowColors(reconstructed.colors);
    setRowComments(reconstructed.comments);
    setIsColorModeActive(false);
    setSelectedColorId(DEFAULT_COLOR_ID);
    closeCommentEditor();
  }, [restoreFromUrl, setState, setRowColors, setRowComments, setUseAzureReservations, closeCommentEditor]);

  // Event handlers
  const handleFieldChange = (field: 'network' | 'prefix') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormFields((current) => ({
      ...current,
      [field]: value
    }));
    if (formError) setFormError(null);
  };

  const handleApplyNetwork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const ipValue = inetAtov(formFields.network);
    if (ipValue === null) {
      setFormError({ message: 'Please provide a valid IPv4 network address.', field: 'network' });
      setShaking(true);
      return;
    }

    const parsedPrefix = Number(formFields.prefix);
    if (!Number.isInteger(parsedPrefix) || parsedPrefix < 0 || parsedPrefix > 32) {
      setFormError({ message: 'Mask bits must be a number between 0 and 32.', field: 'prefix' });
      setShaking(true);
      return;
    }

    const normalisedNetwork = normaliseNetwork(ipValue, parsedPrefix);

    if (!isRfc1918Cidr(normalisedNetwork, parsedPrefix)) {
      setFormError({
        message: 'Only RFC 1918 private ranges are supported: 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16.',
        field: 'network'
      });
      setShaking(true);
      return;
    }
    const { rootId, tree } = createInitialTree(normalisedNetwork, parsedPrefix);

    setState({
      rootId,
      tree,
      baseNetwork: normalisedNetwork,
      basePrefix: parsedPrefix
    });
    resetMetadata();
    setIsColorModeActive(false);
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
    resetMetadata();
    setIsColorModeActive(false);

    const normalised = normaliseNetwork(inetAtov(DEFAULT_NETWORK)!, DEFAULT_PREFIX);
    const { rootId, tree } = createInitialTree(normalised, DEFAULT_PREFIX);
    setState({
      rootId,
      tree,
      baseNetwork: normalised,
      basePrefix: DEFAULT_PREFIX
    });
  };

  const handleSplitWithMetadata = (nodeId: string) => {
    const { canSplit, preserveMetadata } = handleSplit(nodeId);
    if (canSplit) {
      handleSplitMetadata(nodeId, preserveMetadata);
    }
  };

  const handleJoinWithMetadata = (nodeId: string) => {
    const { childIds } = handleJoin(nodeId);
    if (childIds) {
      handleJoinMetadata(childIds, nodeId);
    }
  };

  const handleApplyColor = (rowId: string) => {
    setRowColors((current) => {
      if (!activeColorHex) {
        if (!(rowId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[rowId];
        return next;
      }
      if (current[rowId] === activeColorHex) {
        return current;
      }
      return {
        ...current,
        [rowId]: activeColorHex
      };
    });
  };

  const handleResetTree = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setResetPulse(true);
    resetTimerRef.current = setTimeout(() => setResetPulse(false), 500);
    resetTree();
  };

  const handleShareClick = async () => {
    setIsColorModeActive(false);
    await handleShare();
  };

  const handleToggleColorMode = () => {
    setIsColorModeActive((current) => !current);
  };

  return (
    <Layout
      title="Azure Subnet Calculator - Plan & Split CIDR Networks"
      description="Plan Azure address spaces, model subnet splits, and export allocation charts with the Azure Hub subnet calculator."
      keywords={[
        'azure subnet calculator',
        'subnet calculator',
        'Azure VNet planning',
        'CIDR calculator',
        'IP subnet calculator',
        'Azure networking',
        'subnet planning',
        'address space calculator',
        'Azure virtual network',
        'subnet split calculator'
      ]}
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
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Networking
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            Azure Subnet Calculator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Plan and visualize Azure virtual network subnets with CIDR notation. Split address spaces, calculate
            usable IPs, and export subnet configurations for your VNet deployment.
          </p>
        </div>

        {/* Network Input Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <form
            onSubmit={handleApplyNetwork}
            className="grid w-full grid-cols-1 gap-4 sm:grid-cols-[240px_160px_minmax(0,1fr)] sm:items-end"
          >
            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Network Address</span>
              <div className="relative">
                <input
                  value={formFields.network}
                  onChange={handleFieldChange('network')}
                  className={`h-10 w-full rounded-lg border bg-white text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
                    formError?.field === 'network'
                      ? 'border-rose-400 pl-4 pr-9 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-400'
                      : 'border-slate-300 px-4 focus:border-sky-500 focus:ring-sky-500/20 dark:border-slate-600 dark:focus:border-sky-400'
                  } ${shaking && formError?.field === 'network' ? 'animate-shake' : ''}`}
                  placeholder="10.0.0.0"
                  autoComplete="off"
                />
                {formError?.field === 'network' && (
                  <div className="group absolute right-3 top-1/2 -translate-y-1/2 cursor-help">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-rose-500 dark:text-rose-400">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                      <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-slate-700">
                        {formError.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200 sm:w-auto">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Network Size</span>
              <div className={`flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3 shadow-sm transition dark:bg-slate-800 ${
                formError?.field === 'prefix'
                  ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 dark:border-rose-400'
                  : 'border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-slate-600'
              } ${shaking && formError?.field === 'prefix' ? 'animate-shake' : ''}`}>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/</span>
                <input
                  value={formFields.prefix}
                  onChange={handleFieldChange('prefix')}
                  className="w-12 bg-transparent text-center text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                  placeholder="16"
                  inputMode="numeric"
                />
                {formError?.field === 'prefix' && (
                  <div className="group relative cursor-help">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-rose-500 dark:text-rose-400">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                      <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-slate-700">
                        {formError.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" size="md">
                Go
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </div>

        {/* Subnet Plan Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                Current Plan
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {inetNtoa(state.baseNetwork)}
                  </span>
                  <span className="ml-1 text-slate-400 dark:text-slate-500">/{state.basePrefix}</span>
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <span>
                    {leaves.length} subnet{leaves.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <SubnetToolbar
                  isColorModeActive={isColorModeActive}
                  selectedColorId={selectedColorId}
                  onToggleColorMode={handleToggleColorMode}
                  onSelectColor={setSelectedColorId}
                  isAzureMenuOpen={isAzureMenuOpen}
                  useAzureReservations={useAzureReservations}
                  azureMenuRef={azureMenuRef}
                  onToggleAzureMenu={() => {
                    setIsColorModeActive(false);
                    setIsAzureMenuOpen((current) => !current);
                  }}
                  onToggleReservations={setUseAzureReservations}
                  onCloseAzureMenu={() => setIsAzureMenuOpen(false)}
                  renderRows={renderRows}
                  baseNetwork={state.baseNetwork}
                  basePrefix={state.basePrefix}
                  rowColors={rowColors}
                  rowComments={rowComments}
                  shareStatus={shareStatus}
                  isGeneratingShare={isGeneratingShare}
                  onShare={handleShareClick}
                />
              </div>
            </div>
          </header>

          <SubnetTable
            renderRows={renderRows}
            tree={state.tree}
            rootId={state.rootId}
            leafCounts={leafCounts}
            useAzureReservations={useAzureReservations}
            rowColors={rowColors}
            rowComments={rowComments}
            activeCommentRow={activeCommentRow}
            commentDraft={commentDraft}
            isColorModeActive={isColorModeActive}
            resetPulse={resetPulse}
            onSplit={handleSplitWithMetadata}
            onJoin={handleJoinWithMetadata}
            onToggleNetworkType={handleToggleNetworkType}
            onApplyColor={handleApplyColor}
            onOpenCommentEditor={openCommentEditor}
            onSaveComment={saveComment}
            onCloseCommentEditor={closeCommentEditor}
            onCommentDraftChange={setCommentDraft}
            onResetTree={handleResetTree}
          />
        </div>
      </section>
    </Layout>
  );
}
