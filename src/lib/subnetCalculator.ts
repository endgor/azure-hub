export interface SubnetNode {
  id: string;
  network: number;
  prefix: number;
  parentId?: string;
  children?: [string, string];
}

export type SubnetTree = Record<string, SubnetNode>;

export interface LeafSubnet extends SubnetNode {
  depth: number;
}

export const MAX_PREFIX = 32;
export const DEFAULT_NETWORK = '192.168.0.0';
export const DEFAULT_PREFIX = 16;

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

  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function inetNtoa(address: number): string {
  const value = address >>> 0;
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ].join('.');
}

export function normaliseNetwork(address: number, prefix: number): number {
  const mask = prefixToMask(prefix);
  return address & mask;
}

export function prefixToMask(prefix: number): number {
  if (prefix <= 0) {
    return 0;
  }
  return prefix === 32 ? 0xffffffff : (~((1 << (32 - prefix)) - 1)) >>> 0;
}

export function subnetAddressCount(prefix: number): number {
  if (prefix < 0 || prefix > 32) {
    throw new Error('Invalid prefix length');
  }
  return 2 ** (32 - prefix);
}

export function subnetLastAddress(network: number, prefix: number): number {
  return (network + subnetAddressCount(prefix) - 1) >>> 0;
}

export function subnetNetmask(prefix: number): number {
  return prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : (~((1 << (32 - prefix)) - 1)) >>> 0;
}

export function usableRange(network: number, prefix: number): {
  first: number;
  last: number;
} {
  if (prefix >= 31) {
    const last = subnetLastAddress(network, prefix);
    return { first: network, last };
  }

  const first = network + 1;
  const last = subnetLastAddress(network, prefix) - 1;
  return { first, last };
}

export function hostCapacity(prefix: number): number {
  if (prefix === 32) {
    return 1;
  }

  if (prefix === 31) {
    return 2;
  }

  return Math.max(subnetAddressCount(prefix) - 2, 0);
}

export function usableRangeAzure(network: number, prefix: number): {
  first: number;
  last: number;
} | null {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return null;
  }
  const first = network + 4;
  const last = subnetLastAddress(network, prefix) - 1;
  if (first > last) {
    return null;
  }
  return { first, last };
}

export function hostCapacityAzure(prefix: number): number {
  const total = subnetAddressCount(prefix);
  if (total <= 5) {
    return 0;
  }
  return total - 5;
}

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

export function splitSubnet(tree: SubnetTree, nodeId: string): SubnetTree {
  const node = tree[nodeId];
  if (!node || node.children || node.prefix >= MAX_PREFIX) {
    return tree;
  }

  const nextPrefix = node.prefix + 1;
  const leftId = `${nodeId}-0`;
  const rightId = `${nodeId}-1`;

  const addressesPerChild = subnetAddressCount(nextPrefix);
  const leftNode: SubnetNode = {
    id: leftId,
    network: node.network,
    prefix: nextPrefix,
    parentId: node.id
  };

  const rightNode: SubnetNode = {
    id: rightId,
    network: (node.network + addressesPerChild) >>> 0,
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

    if (rightNode) {
      stack.push({ node: rightNode, depth: depth + 1 });
    }

    if (leftNode) {
      stack.push({ node: leftNode, depth: depth + 1 });
    }
  }

  return leaves.sort((a, b) => a.network - b.network);
}

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

  return path.reverse();
}

export function joinSubnet(tree: SubnetTree, nodeId: string): SubnetTree {
  const node = tree[nodeId];
  if (!node?.children) {
    return tree;
  }

  const [leftId, rightId] = node.children;
  const left = tree[leftId];
  const right = tree[rightId];

  if (!left || !right || left.children || right.children) {
    return tree;
  }

  const { [leftId]: _removeLeft, [rightId]: _removeRight, ...rest } = tree;
  return {
    ...rest,
    [node.id]: {
      ...node,
      children: undefined
    }
  };
}

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
      counts[nodeId] = 1;
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

export function isJoinableNode(tree: SubnetTree, node: SubnetNode | undefined): boolean {
  if (!node?.children) {
    return false;
  }

  const [leftId, rightId] = node.children;
  const left = tree[leftId];
  const right = tree[rightId];

  return Boolean(left && right && !left.children && !right.children);
}

export interface LeafDefinition {
  network: number;
  prefix: number;
}

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

function ensureLeafInTree(tree: SubnetTree, rootId: string, targetNetwork: number, targetPrefix: number): SubnetTree {
  let currentTree = tree;
  let currentNodeId = rootId;

  while (true) {
    const node = currentTree[currentNodeId];
    if (!node) {
      break;
    }

    const nodeLastAddress = subnetLastAddress(node.network, node.prefix);
    if (targetNetwork < node.network || targetNetwork > nodeLastAddress) {
      break;
    }

    if (node.prefix === targetPrefix && node.network === targetNetwork) {
      break;
    }

    if (node.prefix >= targetPrefix) {
      break;
    }

    if (!node.children) {
      const updatedTree = splitSubnet(currentTree, currentNodeId);
      if (updatedTree === currentTree) {
        break;
      }
      currentTree = updatedTree;
    }

    const currentNode = currentTree[currentNodeId];
    if (!currentNode.children) {
      break;
    }

    const [leftId, rightId] = currentNode.children;
    const rightNode = currentTree[rightId];

    if (targetNetwork >= rightNode.network) {
      currentNodeId = rightId;
    } else {
      currentNodeId = leftId;
    }
  }

  return currentTree;
}
