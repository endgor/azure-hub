import { useState, useMemo, useCallback } from 'react';
import type { SubnetTree, LeafSubnet } from '@/lib/subnetCalculator';
import {
  NetworkType,
  collectLeaves,
  computeLeafCounts,
  createInitialTree,
  findParentVNet,
  joinSubnet,
  normaliseNetwork,
  splitSubnet
} from '@/lib/subnetCalculator';

export interface SubnetTreeState {
  rootId: string;
  baseNetwork: number;
  basePrefix: number;
  tree: SubnetTree;
}

export interface UseSubnetTreeReturn {
  state: SubnetTreeState;
  setState: React.Dispatch<React.SetStateAction<SubnetTreeState>>;
  leaves: LeafSubnet[];
  leafCounts: Record<string, number>;
  handleSplit: (nodeId: string) => { preserveMetadata: boolean; canSplit: boolean };
  handleJoin: (nodeId: string) => { childIds: [string, string] | null };
  handleToggleNetworkType: (nodeId: string) => void;
  resetTree: () => void;
}

/**
 * Hook for managing subnet tree state and operations.
 * Handles tree structure, split/join operations, and network type toggling.
 */
export function useSubnetTree(
  initialNetwork: number,
  initialPrefix: number
): UseSubnetTreeReturn {
  const [state, setState] = useState<SubnetTreeState>(() => {
    const normalised = normaliseNetwork(initialNetwork, initialPrefix);
    const { rootId, tree } = createInitialTree(normalised, initialPrefix);
    return {
      rootId,
      tree,
      baseNetwork: normalised,
      basePrefix: initialPrefix
    };
  });

  const leaves = useMemo(() => collectLeaves(state.tree, state.rootId), [state.tree, state.rootId]);

  const leafCounts = useMemo(
    () => computeLeafCounts(state.tree, state.rootId),
    [state.tree, state.rootId]
  );

  const handleSplit = useCallback(
    (nodeId: string) => {
      const node = state.tree[nodeId];
      const canSplit = node && !node.children && node.prefix < 32;
      const preserveMetadata = node?.networkType === NetworkType.VNET;

      setState((current) => {
        const nodeToSplit = current.tree[nodeId];
        if (!nodeToSplit || nodeToSplit.children || nodeToSplit.prefix >= 32) {
          return current;
        }

        let updatedTree = splitSubnet(current.tree, nodeId);
        if (updatedTree === current.tree) {
          return current;
        }

        const childIds = updatedTree[nodeId]?.children;
        if (childIds && nodeToSplit.networkType) {
          const [leftId, rightId] = childIds;
          const childNetworkType =
            nodeToSplit.networkType === NetworkType.VNET
              ? NetworkType.SUBNET
              : nodeToSplit.networkType;

          updatedTree = {
            ...updatedTree,
            [leftId]: {
              ...updatedTree[leftId],
              networkType: childNetworkType
            },
            [rightId]: {
              ...updatedTree[rightId],
              networkType: childNetworkType
            }
          };
        }

        return {
          ...current,
          tree: updatedTree
        };
      });

      return { canSplit, preserveMetadata };
    },
    [state.tree]
  );

  const handleJoin = useCallback(
    (nodeId: string) => {
      const node = state.tree[nodeId];
      const childIds = node?.children ?? null;

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

      return { childIds };
    },
    [state.tree]
  );

  const handleToggleNetworkType = useCallback((nodeId: string) => {
    setState((current) => {
      const node = current.tree[nodeId];
      if (!node) {
        return current;
      }

      const currentType = node.networkType || NetworkType.UNASSIGNED;
      const ancestorVNet = findParentVNet(current.tree, nodeId);

      if (ancestorVNet) {
        if (currentType === NetworkType.SUBNET) {
          return current; // Locked to subnet, nothing to change
        }

        return {
          ...current,
          tree: {
            ...current.tree,
            [nodeId]: {
              ...node,
              networkType: NetworkType.SUBNET
            }
          }
        };
      }

      let newType: NetworkType;
      if (currentType === NetworkType.UNASSIGNED || currentType === NetworkType.SUBNET) {
        newType = NetworkType.VNET;
      } else {
        newType = NetworkType.SUBNET;
      }

      // Update the node's network type
      const updatedTree = {
        ...current.tree,
        [nodeId]: {
          ...node,
          networkType: newType
        }
      };

      // If marking as VNET, automatically mark all descendants as SUBNET
      if (newType === NetworkType.VNET && node.children) {
        const markDescendantsAsSubnet = (tree: SubnetTree, childId: string): SubnetTree => {
          const child = tree[childId];
          if (!child) {
            return tree;
          }

          let result = {
            ...tree,
            [childId]: {
              ...child,
              networkType: NetworkType.SUBNET
            }
          };

          if (child.children) {
            result = markDescendantsAsSubnet(result, child.children[0]);
            result = markDescendantsAsSubnet(result, child.children[1]);
          }

          return result;
        };

        const [leftId, rightId] = node.children;
        let finalTree = markDescendantsAsSubnet(updatedTree, leftId);
        finalTree = markDescendantsAsSubnet(finalTree, rightId);

        return {
          ...current,
          tree: finalTree
        };
      }

      return {
        ...current,
        tree: updatedTree
      };
    });
  }, []);

  const resetTree = useCallback(() => {
    const { rootId, tree } = createInitialTree(state.baseNetwork, state.basePrefix);
    setState((current) => ({
      ...current,
      rootId,
      tree
    }));
  }, [state.baseNetwork, state.basePrefix]);

  return {
    state,
    setState,
    leaves,
    leafCounts,
    handleSplit,
    handleJoin,
    handleToggleNetworkType,
    resetTree
  };
}
