import type { SubnetTree, NetworkType } from './types';
import {
  createTreeFromLeafDefinitions
} from './treeBuilder';
import type { ShareableSubnetPlan } from '@/lib/shareSubnetPlan';

export interface ReconstructedState {
  rootId: string;
  tree: SubnetTree;
  colors: Record<string, string>;
  comments: Record<string, string>;
  baseNetwork: number;
  basePrefix: number;
  useAzureReservations: boolean;
}

/**
 * Reconstructs a complete subnet tree state from a shareable plan.
 * This pure function handles URL state restoration including:
 * - Tree structure from leaf definitions
 * - Color assignments
 * - Comments
 * - Network type classifications (VNet/Subnet)
 */
export function reconstructTreeFromSharePlan(
  decodedState: ShareableSubnetPlan
): ReconstructedState {
  const shareLeaves = decodedState.leaves;

  // Rebuild tree structure from leaf definitions
  const { rootId, tree: rebuiltTree } = createTreeFromLeafDefinitions(
    decodedState.net,
    decodedState.pre,
    shareLeaves.map((leaf) => ({
      network: leaf.n,
      prefix: leaf.p
    }))
  );

  // Build lookup maps for metadata
  const colorByKey = new Map<string, string>();
  const commentByKey = new Map<string, string>();
  const typeByKey = new Map<string, NetworkType>();
  const singleSubnetByKey = new Set<string>();

  shareLeaves.forEach((leaf) => {
    const key = `${leaf.n}/${leaf.p}`;
    if (leaf.c) {
      colorByKey.set(key, leaf.c);
    }
    if (leaf.m) {
      commentByKey.set(key, leaf.m);
    }
    if (leaf.t === 'v') {
      typeByKey.set(key, 'vnet' as NetworkType);
      if (leaf.f === 1) {
        singleSubnetByKey.add(key);
      }
    } else if (leaf.t === 's') {
      typeByKey.set(key, 'subnet' as NetworkType);
    }
  });

  const nextColors: Record<string, string> = {};
  const nextComments: Record<string, string> = {};

  // Apply metadata to rebuilt tree
  let updatedTree = rebuiltTree;

  // First apply metadata to all nodes (including VNet parents)
  Object.values(rebuiltTree).forEach((node) => {
    const mapKey = `${node.network}/${node.prefix}`;

    const mappedColor = colorByKey.get(mapKey);
    if (mappedColor) {
      nextColors[node.id] = mappedColor;
    }

    const mappedComment = commentByKey.get(mapKey);
    if (mappedComment) {
      nextComments[node.id] = mappedComment;
    }

    const mappedType = typeByKey.get(mapKey);
    if (mappedType) {
      const hasSingleSubnet = singleSubnetByKey.has(mapKey) && !updatedTree[node.id]?.children;
      updatedTree = {
        ...updatedTree,
        [node.id]: {
          ...updatedTree[node.id],
          networkType: mappedType,
          ...(hasSingleSubnet ? { singleSubnet: true } : {})
        }
      };
    }
  });

  return {
    rootId,
    tree: updatedTree,
    colors: nextColors,
    comments: nextComments,
    baseNetwork: decodedState.net,
    basePrefix: decodedState.pre,
    useAzureReservations: Boolean(decodedState.az)
  };
}
