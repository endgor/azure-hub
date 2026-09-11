import { cachedJson } from '@/lib/cachedJson';
import type { IpDiffFile } from '@/types/ipDiff';

/**
 * Loads the computed diff between the current and previous Azure IP data.
 * Resolves to null when no diff is available (first update, or a load failure).
 */
export async function loadIpDiff(): Promise<IpDiffFile | null> {
  try {
    return await cachedJson<IpDiffFile>('/data/ip-diff.json', { allowNotFound: true });
  } catch {
    return null;
  }
}
