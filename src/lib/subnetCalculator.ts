/** Represents a node in the binary subnet tree */
export interface SubnetNode {
  id: string;
  network: number; // IPv4 address as 32-bit unsigned integer
  prefix: number; // CIDR prefix length (0-32)
  parentId?: string;
  children?: [string, string]; // [leftId, rightId] for binary tree
}

/** Dictionary mapping node IDs to subnet nodes */
export type SubnetTree = Record<string, SubnetNode>;

/** Leaf subnet with depth information for rendering */
export interface LeafSubnet extends SubnetNode {
  depth: number; // Tree depth level, 0 = root
}

export const MAX_PREFIX = 32;
export const DEFAULT_NETWORK = '192.168.0.0';
export const DEFAULT_PREFIX = 16;

/**
 * Ensures a number is treated as an unsigned 32-bit integer.
 * The >>> 0 operation converts signed 32-bit integers to unsigned.
 * This is necessary because JavaScript bitwise operations work on signed 32-bit integers.
 */
const toUint32 = (value: number): number => value >>> 0;

/**
 * Converts IPv4 address string to 32-bit unsigned integer.
 * Example: "192.168.1.1" -> 3232235777
 */
export function inetAtov(address: string): number | null {
  const parts = address.trim().split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return NaN;
    }
    return Number(part);
  });

  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  // Combine octets using bitwise shifts: (octet1 << 24) | (octet2 << 16) | (octet3 << 8) | octet4
  return toUint32((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]);
}

/**
 * Converts 32-bit unsigned integer to IPv4 address string.
 * Example: 3232235777 -> "192.168.1.1"
 */
export function inetNtoa(address: number): string {
  const value = toUint32(address);
  return [
    (value >>> 24) & 0xff, // Extract first octet
    (value >>> 16) & 0xff, // Extract second octet
    (value >>> 8) & 0xff,  // Extract third octet
    value & 0xff           // Extract fourth octet
  ].join('.');
}

/**
 * Normalizes IP address to network address by applying subnet mask.
 * Example: normaliseNetwork("192.168.1.100", 24) -> "192.168.1.0"
 */
export function normaliseNetwork(address: number, prefix: number): number {
  const mask = prefixToMask(prefix);
  return address & mask;
}

/**
 * Converts CIDR prefix to subnet mask as 32-bit integer.
 * Example: prefix 24 -> 0xffffff00 (255.255.255.0)
 */
export function prefixToMask(prefix: number): number {
  if (prefix <= 0) {
    return 0;
  }
  // Create mask by inverting a number with (32 - prefix) trailing 1s
  return prefix === 32 ? 0xffffffff : toUint32(~((1 << (32 - prefix)) - 1));
}

/** Returns total number of addresses in subnet (2^(32-prefix)) */
export function subnetAddressCount(prefix: number): number {
  if (prefix < 0 || prefix > 32) {
    throw new Error('Invalid prefix length');
  }
  return 2 ** (32 - prefix);
}

/** Returns the last (broadcast) address in the subnet */
export function subnetLastAddress(network: number, prefix: number): number {
  return toUint32(network + subnetAddressCount(prefix) - 1);
}

/** Alias for prefixToMask - converts prefix to netmask */
export function subnetNetmask(prefix: number): number {
  return prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : toUint32(~((1 << (32 - prefix)) - 1));
}

/**
 * Returns usable IP range (RFC standard).
 * For /31 and /32, all IPs are usable (RFC 3021).
 * Otherwise, excludes network address and broadcast address.
 */
export function usableRange(network: number, prefix: number): {
  first: number;
  last: number;
} {
  if (prefix >= 31) {
    const last = subnetLastAddress(network, prefix);
    return { first: network, last };
  }

  const first = network + 1; // Skip network address
  const last = subnetLastAddress(network, prefix) - 1; // Skip broadcast
  return { first, last };
}

/**
 * Returns usable host count (RFC standard).
 * /32 = 1 host, /31 = 2 hosts, others = total - 2 (network + broadcast)
 */
export function hostCapacity(prefix: number): number {
  if (prefix === 32) {
    return 1;
  }

  if (prefix === 31) {
    return 2;
  }

  return Math.max(subnetAddressCount(prefix) - 2, 0);
}

/**
 * Returns usable IP range for Azure VNets.
 * Azure reserves first 3 IPs (.0, .1, .2, .3) and last IP (broadcast).
 * Minimum usable subnet is /29 (8 IPs total, 3 usable after reservations).
 */
export function usableRangeAzure(network: number, prefix: number): {
  first: number;
  last: number;
} | null {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return null; // Too small for Azure (need at least 6 IPs)
  }
  const first = network + 4; // Skip Azure reserved IPs (.0-.3)
  const last = subnetLastAddress(network, prefix) - 1; // Skip broadcast
  if (first > last) {
    return null;
  }
  return { first, last };
}

/**
 * Returns usable host count for Azure VNets.
 * Azure reserves 5 IPs total (first 4 + broadcast).
 */
export function hostCapacityAzure(prefix: number): number {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return 0;
  }
  return total - 5;
}

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

/** Defines a target subnet to create in the tree */
export interface LeafDefinition {
  network: number;
  prefix: number;
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
function ensureLeafInTree(tree: SubnetTree, rootId: string, targetNetwork: number, targetPrefix: number): SubnetTree {
  let currentTree = tree;
  let currentNodeId = rootId;

  while (true) {
    const node = currentTree[currentNodeId];
    if (!node) {
      break; // Node not found
    }

    const nodeLastAddress = subnetLastAddress(node.network, node.prefix);
    if (targetNetwork < node.network || targetNetwork > nodeLastAddress) {
      break; // Target is outside current node's range
    }

    if (node.prefix === targetPrefix && node.network === targetNetwork) {
      break; // Exact match found
    }

    if (node.prefix >= targetPrefix) {
      break; // Cannot split further (would exceed target prefix)
    }

    // If this is a leaf node, split it to continue navigating
    if (!node.children) {
      const updatedTree = splitSubnet(currentTree, currentNodeId);
      if (updatedTree === currentTree) {
        break; // Split failed (at /32)
      }
      currentTree = updatedTree;
    }

    const currentNode = currentTree[currentNodeId];
    if (!currentNode.children) {
      break; // Still no children after split attempt
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

  return currentTree;
}
