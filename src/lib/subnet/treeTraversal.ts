/**
 * Tree traversal and navigation utilities.
 * Provides functions for collecting leaves, computing counts, and navigating tree paths.
 */

import { SubnetNode, SubnetTree, LeafSubnet, NetworkType } from './types';

/**
 * Collects all leaf nodes from the subnet tree using depth-first search.
 * Uses stack-based iterative DFS (avoids recursion stack overflow).
 * Returns leaves sorted by network address in ascending order.
 */
export function collectLeaves(tree: SubnetTree, rootId: string): LeafSubnet[] {
  const root = tree[rootId];
  if (!root) {
    return [];
  }

  const leaves: LeafSubnet[] = [];
  const stack: Array<{ node: SubnetNode; depth: number }> = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop() as { node: SubnetNode; depth: number };
    if (!node.children) {
      leaves.push({ ...node, depth });
      continue;
    }

    const [leftId, rightId] = node.children;
    const rightNode = tree[rightId];
    const leftNode = tree[leftId];

    // Push right first so left is processed first (stack LIFO)
    if (rightNode) {
      stack.push({ node: rightNode, depth: depth + 1 });
    }

    if (leftNode) {
      stack.push({ node: leftNode, depth: depth + 1 });
    }
  }

  return leaves.sort((a, b) => a.network - b.network);
}

/**
 * Returns path from root to specified node.
 * Useful for displaying breadcrumb navigation or subnet hierarchy.
 */
export function getNodePath(tree: SubnetTree, nodeId: string): SubnetNode[] {
  const path: SubnetNode[] = [];
  let current: SubnetNode | undefined = tree[nodeId];

  while (current) {
    path.push(current);
    if (!current.parentId) {
      break;
    }
    current = tree[current.parentId];
  }

  return path.reverse(); // Root first, target node last
}

/**
 * Recursively counts leaf nodes under each node in the tree.
 * Returns a map of nodeId -> leaf count.
 * Useful for UI to show subnet count (e.g., "192.168.0.0/24 (4 subnets)").
 */
export function computeLeafCounts(tree: SubnetTree, rootId: string): Record<string, number> {
  const counts: Record<string, number> = {};

  const dfs = (nodeId: string | undefined): number => {
    if (!nodeId) {
      return 0;
    }

    const node = tree[nodeId];
    if (!node) {
      return 0;
    }

    if (!node.children) {
      counts[nodeId] = 1; // Leaf node counts as 1
      return 1;
    }

    const [leftId, rightId] = node.children;
    const leftCount = dfs(leftId);
    const rightCount = dfs(rightId);
    const total = leftCount + rightCount;
    counts[nodeId] = total;
    return total;
  };

  dfs(rootId);
  return counts;
}

/**
 * Finds the nearest parent VNet for a given node.
 * Returns the VNet node if found, or null if none exists in the ancestry.
 */
export function findParentVNet(tree: SubnetTree, nodeId: string): SubnetNode | null {
  const start = tree[nodeId];
  if (!start?.parentId) {
    return null;
  }

  let currentId: string | undefined = start.parentId;

  while (currentId) {
    const current: SubnetNode | undefined = tree[currentId];
    if (!current) {
      break;
    }

    if (current.networkType === NetworkType.VNET) {
      return current;
    }

    if (!current.parentId) {
      break;
    }

    currentId = current.parentId;
  }

  return null;
}

/**
 * Checks if a node is a descendant of a VNet.
 * Used to automatically mark children as subnets when parent is a VNet.
 */
export function isUnderVNet(tree: SubnetTree, nodeId: string): boolean {
  return findParentVNet(tree, nodeId) !== null;
}
