interface VmCompareTrayProps {
  /** Selected sizes in selection order, already resolved to display names */
  items: { sku: string; size: string }[];
  maxItems: number;
  onRemove: (sku: string) => void;
  onClear: () => void;
  onOpen: () => void;
}

export default function VmCompareTray({ items, maxItems, onRemove, onClear, onOpen }: VmCompareTrayProps) {
  if (items.length === 0) return null;

  const canCompare = items.length >= 2;

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {items.length} of {maxItems} selected
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {items.map((item) => (
            <span
              key={item.sku}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 py-1 pl-2 pr-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
            >
              {item.size}
              <button
                type="button"
                onClick={() => onRemove(item.sku)}
                aria-label={`Remove ${item.size} from comparison`}
                className="rounded p-0.5 text-sky-500 transition hover:bg-sky-100 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-200"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={!canCompare}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              canCompare
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {canCompare ? `Compare ${items.length} sizes` : 'Pick one more to compare'}
          </button>
        </div>
      </div>
    </div>
  );
}
