import {
  buildShareableSubnetPlan,
  serialiseShareableSubnetPlan
} from '@/lib/shareSubnetPlan';
import type { LeafSubnet, SubnetTree } from './types';

export interface ShareLinkOptions {
  baseNetwork: number;
  basePrefix: number;
  useAzureReservations: boolean;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;
  tree: SubnetTree;
}

/**
 * Generates a shareable URL for the current subnet plan.
 * This function encodes the entire state into a compact URL parameter.
 */
export function generateShareLink(options: ShareLinkOptions, baseUrl: string): string {
  const sharePlan = buildShareableSubnetPlan(options);
  const encodedState = serialiseShareableSubnetPlan(sharePlan);

  const shareUrl = new URL(baseUrl);
  shareUrl.search = ''; // Clear existing params
  shareUrl.searchParams.set('state', encodedState);

  return shareUrl.toString();
}

/**
 * Copies text to clipboard using the most appropriate method.
 * Falls back to legacy execCommand if Clipboard API is unavailable.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Legacy fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!successful) {
    throw new Error('Copy to clipboard failed');
  }
}
