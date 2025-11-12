/**
 * Tree reconstruction utilities.
 * Handles creating trees from leaf definitions and ensuring specific subnets exist.
 */

import { SubnetTree, LeafDefinition } from './types';
import { createInitialTree, splitSubnet } from './treeOperations';
import { subnetLastAddress } from './subnetMath';

/**
 * Checks if target address is outside the node's address range
 */
function isOutOfRange(targetNetwork: number, nodeNetwork: number, nodePrefix: number): boolean {
  const nodeLastAddress = subnetLastAddress(nodeNetwork, nodePrefix);
  return targetNetwork < nodeNetwork || targetNetwork > nodeLastAddress;
}

/**
 * Checks if node exactly matches the target network/prefix
 */
function isExactMatch(nodeNetwork: number, nodePrefix: number, targetNetwork: number, targetPrefix: number): boolean {
  return nodePrefix === targetPrefix && nodeNetwork === targetNetwork;
}

/**
 * Checks if the node cannot be split further to reach the target
 */
function cannotSplitFurther(nodePrefix: number, targetPrefix: number): boolean {
  return nodePrefix >= targetPrefix;
}

/**
 * Ensures a specific subnet exists as a leaf in the tree by navigating
 * and splitting nodes as needed. This is the core algorithm for tree construction.
 *
 * Algorithm:
 * 1. Start at root and navigate toward target using binary search
 * 2. If current node is a leaf and needs further splitting, split it
 * 3. Choose left or right child based on target network address
 * 4. Repeat until target subnet is reached or cannot proceed
 *
 * Stops when:
 * - Target subnet found (exact match)
 * - Target is outside current node's range
 * - Current node has same or larger prefix than target
 * - Cannot split further (already at /32)
 */
export function ensureLeafInTree(tree: SubnetTree, rootId: string, targetNetwork: number, targetPrefix: number): SubnetTree {
  let currentTree = tree;
  let currentNodeId = rootId;

  while (true) {
    const node = currentTree[currentNodeId];
    if (!node) return currentTree; // Node not found

    if (isOutOfRange(targetNetwork, node.network, node.prefix)) {
      return currentTree; // Target is outside current node's range
    }

    if (isExactMatch(node.network, node.prefix, targetNetwork, targetPrefix)) {
      return currentTree; // Exact match found
    }

    if (cannotSplitFurther(node.prefix, targetPrefix)) {
      return currentTree; // Cannot split further (would exceed target prefix)
    }

    // If this is a leaf node, split it to continue navigating
    if (!node.children) {
      const updatedTree = splitSubnet(currentTree, currentNodeId);
      if (updatedTree === currentTree) {
        return currentTree; // Split failed (at /32)
      }
      currentTree = updatedTree;
    }

    const currentNode = currentTree[currentNodeId];
    if (!currentNode.children) {
      return currentTree; // Still no children after split attempt
    }

    // Navigate to appropriate child using binary search
    const [leftId, rightId] = currentNode.children;
    const rightNode = currentTree[rightId];

    if (targetNetwork >= rightNode.network) {
      currentNodeId = rightId; // Target is in right subtree
    } else {
      currentNodeId = leftId; // Target is in left subtree
    }
  }
}

/**
 * Creates a subnet tree from a list of desired leaf subnets.
 * Automatically splits parent nodes as needed to create the specified leaves.
 * Used for importing subnet plans or reconstructing trees from saved state.
 */
export function createTreeFromLeafDefinitions(
  baseNetwork: number,
  basePrefix: number,
  definitions: LeafDefinition[]
): {
  rootId: string;
  tree: SubnetTree;
} {
  const sortedDefinitions = [...definitions].sort((a, b) => a.network - b.network);
  const initial = createInitialTree(baseNetwork, basePrefix);
  let workingTree = initial.tree;

  sortedDefinitions.forEach(({ network, prefix }) => {
    workingTree = ensureLeafInTree(workingTree, initial.rootId, network, prefix);
  });

  return {
    rootId: initial.rootId,
    tree: workingTree
  };
}
