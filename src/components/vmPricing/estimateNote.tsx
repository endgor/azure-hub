import type { VmPriceMode } from '@/types/vmPricing';

/** Azure leaves some OS and term combinations unpublished, and each gap is filled differently. */
export function estimateNote(mode: VmPriceMode) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Estimated rate</p>
      <p>
        {mode === 'devTest'
          ? 'Dev/Test only discounts the Windows licence, so Azure publishes no separate meter here. This is the Linux pay-as-you-go rate.'
          : 'Azure sells commitments per instance without an OS licence, so it publishes no Windows rate for this term. This is the Linux commitment rate plus the Windows pay-as-you-go surcharge.'}
      </p>
    </div>
  );
}
