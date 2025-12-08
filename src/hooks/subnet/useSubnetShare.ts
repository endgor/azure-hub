import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import type { LeafSubnet, SubnetTree } from '@/lib/subnetCalculator';
import { parseShareableSubnetPlan } from '@/lib/shareSubnetPlan';
import { generateShareLink, copyToClipboard } from '@/lib/subnet/shareLinkCodec';
import { reconstructTreeFromSharePlan } from '@/lib/subnet/treeReconstruction';
import type { ReconstructedState } from '@/lib/subnet/treeReconstruction';

export type ShareStatus = 'idle' | 'copied' | 'error';

export interface UseSubnetShareReturn {
  isGeneratingShare: boolean;
  shareStatus: ShareStatus;
  hasRestoredShare: boolean;
  handleShare: () => Promise<void>;
  restoreFromUrl: () => ReconstructedState | null;
}

export interface UseSubnetShareOptions {
  baseNetwork: number;
  basePrefix: number;
  useAzureReservations: boolean;
  leaves: LeafSubnet[];
  rowColors: Record<string, string>;
  rowComments: Record<string, string>;
  tree: SubnetTree;
}

/**
 * Hook for managing share link generation and URL state restoration.
 * Handles encoding/decoding subnet plans to/from URL parameters.
 */
export function useSubnetShare(options: UseSubnetShareOptions): UseSubnetShareReturn {
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [hasRestoredShare, setHasRestoredShare] = useState(false);
  const shareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined' || isGeneratingShare) {
      return;
    }

    setIsGeneratingShare(true);
    try {
      const shareUrl = generateShareLink(options, window.location.href);
      await copyToClipboard(shareUrl);

      setShareStatus('copied');
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = setTimeout(() => setShareStatus('idle'), 2400);
    } catch {
      setShareStatus('error');
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = setTimeout(() => setShareStatus('idle'), 3200);
    } finally {
      setIsGeneratingShare(false);
    }
  }, [isGeneratingShare, options]);

  const restoreFromUrl = useCallback((): ReconstructedState | null => {
    if (!router.isReady || hasRestoredShare) {
      return null;
    }

    const stateParam = router.query.state;
    if (typeof stateParam !== 'string') {
      setHasRestoredShare(true);
      return null;
    }

    const decodedState = parseShareableSubnetPlan(stateParam);
    if (!decodedState) {
      setHasRestoredShare(true);
      return null;
    }

    const reconstructed = reconstructTreeFromSharePlan(decodedState);
    setHasRestoredShare(true);
    return reconstructed;
  }, [router.isReady, router.query.state, hasRestoredShare]);

  return {
    isGeneratingShare,
    shareStatus,
    hasRestoredShare,
    handleShare,
    restoreFromUrl
  };
}
