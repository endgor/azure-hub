/**
 * Binary tree operations for subnet splitting and joining.
 * Handles the creation, splitting, and joining of subnet tree nodes.
 */

import { SubnetNode, SubnetTree, MAX_PREFIX } from './types';
import { subnetAddressCount } from './subnetMath';

/**
 * Ensures a number is treated as an unsigned 32-bit integer.
 */
const toUint32 = (value: number): number => value >>> 0;

/**
 * Creates initial subnet tree with a single root node.
 * This is the starting point for subnet splitting operations.
 */
export function createInitialTree(network: number, prefix: number): {
  rootId: string;
  tree: SubnetTree;
} {
  const root: SubnetNode = {
    id: 'root',
    network,
    prefix
  };
  return {
    rootId: root.id,
    tree: {
      [root.id]: root
    }
  };
}

/**
 * Splits a subnet node into two equal-sized child subnets (binary tree split).
 * Example: Splitting 192.168.0.0/24 creates:
 *   - Left child: 192.168.0.0/25 (IPs .0-.127)
 *   - Right child: 192.168.0.128/25 (IPs .128-.255)
 * Returns unchanged tree if node already has children or is at maximum prefix.
 */
export function splitSubnet(tree: SubnetTree, nodeId: string): SubnetTree {
  const node = tree[nodeId];
  if (!node || node.children || node.prefix >= MAX_PREFIX) {
    return tree; // Cannot split: missing, already split, or at /32
  }

  const nextPrefix = node.prefix + 1;
  const leftId = `${nodeId}-0`;
  const rightId = `${nodeId}-1`;

  const addressesPerChild = subnetAddressCount(nextPrefix);
  const leftNode: SubnetNode = {
    id: leftId,
    network: node.network, // Left child starts at same address
    prefix: nextPrefix,
    parentId: node.id
  };

  const rightNode: SubnetNode = {
    id: rightId,
    network: toUint32(node.network + addressesPerChild), // Right child starts halfway
    prefix: nextPrefix,
    parentId: node.id
  };

  return {
    ...tree,
    [node.id]: {
      ...node,
      children: [leftId, rightId]
    },
    [leftId]: leftNode,
    [rightId]: rightNode
  };
}

/**
 * Joins (merges) two child subnets back into their parent.
 * Only works if both children exist and are leaf nodes (no grandchildren).
 * This is the inverse operation of splitSubnet.
 */
export function joinSubnet(tree: SubnetTree, nodeId: string): SubnetTree {
  const node = tree[nodeId];
  if (!node?.children) {
    return tree; // Node has no children to join
  }

  const [leftId, rightId] = node.children;
  const left = tree[leftId];
  const right = tree[rightId];

  if (!left || !right || left.children || right.children) {
    return tree; // Cannot join: children missing or have their own children
  }

  // Remove children from tree
  const { [leftId]: _removeLeft, [rightId]: _removeRight, ...rest } = tree;
  return {
    ...rest,
    [node.id]: {
      ...node,
      children: undefined
    }
  };
}

/**
 * Checks if a node can be joined (both children are leaves).
 * Used to enable/disable the join button in UI.
 */
export function isJoinableNode(tree: SubnetTree, node: SubnetNode | undefined): boolean {
  if (!node?.children) {
    return false;
  }

  const [leftId, rightId] = node.children;
  const left = tree[leftId];
  const right = tree[rightId];

  return Boolean(left && right && !left.children && !right.children);
}
