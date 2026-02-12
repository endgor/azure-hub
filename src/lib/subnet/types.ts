/**
 * Type definitions for subnet calculator.
 */

/** Network classification type */
export enum NetworkType {
  VNET = 'vnet',
  SUBNET = 'subnet',
  UNASSIGNED = 'unassigned' // Default state before user classifies
}

/** Represents a node in the binary subnet tree */
export interface SubnetNode {
  id: string;
  network: number; // IPv4 address as 32-bit unsigned integer
  prefix: number; // CIDR prefix length (0-32)
  parentId?: string;
  children?: [string, string]; // [leftId, rightId] for binary tree
  networkType?: NetworkType; // VNet vs Subnet classification
  singleSubnet?: boolean; // When true on a VNet leaf, the entire range also serves as a single subnet
}

/** Dictionary mapping node IDs to subnet nodes */
export type SubnetTree = Record<string, SubnetNode>;

/** Leaf subnet with depth information for rendering */
export interface LeafSubnet extends SubnetNode {
  depth: number; // Tree depth level, 0 = root
}

/** Defines a target subnet to create in the tree */
export interface LeafDefinition {
  network: number;
  prefix: number;
}

export const MAX_PREFIX = 32;
export const DEFAULT_NETWORK = '192.168.0.0';
export const DEFAULT_PREFIX = 16;
