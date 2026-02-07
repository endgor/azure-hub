/**
 * Subnet calculator module - unified exports for backward compatibility.
 *
 * This module re-exports all functions and types from the modular subnet library.
 * Existing imports from '@/lib/subnetCalculator' will continue to work.
 */

// Types and constants
export type {
  SubnetNode,
  SubnetTree,
  LeafSubnet,
  LeafDefinition
} from './types';

export {
  NetworkType,
  MAX_PREFIX,
  DEFAULT_NETWORK,
  DEFAULT_PREFIX
} from './types';

// IP address utilities
export {
  inetAtov,
  inetNtoa,
  prefixToMask,
  normaliseNetwork,
  isRfc1918Cidr
} from './ipUtils';

// Subnet math operations
export {
  subnetAddressCount,
  subnetLastAddress,
  subnetNetmask,
  usableRange,
  hostCapacity,
  usableRangeAzure,
  hostCapacityAzure,
  usableRangeByType,
  hostCapacityByType
} from './subnetMath';

// Tree operations
export {
  createInitialTree,
  splitSubnet,
  joinSubnet,
  isJoinableNode
} from './treeOperations';

// Tree traversal
export {
  collectLeaves,
  getNodePath,
  computeLeafCounts,
  findParentVNet,
  isUnderVNet
} from './treeTraversal';

// Tree builder
export {
  createTreeFromLeafDefinitions,
  ensureLeafInTree
} from './treeBuilder';

// Existing subnet module exports (already in this directory)
export * from './treeReconstruction';
export * from './shareLinkCodec';
