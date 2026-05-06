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
 * Falls back to legacy execCommand if the Clipboard API is unavailable
 * or rejects (e.g. NotAllowedError when DevTools steals focus).
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('navigator.clipboard.writeText rejected, falling back to execCommand:', err);
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);

  const previousActive = document.activeElement as HTMLElement | null;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
    previousActive?.focus?.();
  }

  if (!successful) {
    throw new Error('Copy to clipboard failed');
  }
}
