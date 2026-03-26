import { ReactNode } from 'react';

export interface SelectionChip {
  id: string;
  content: ReactNode;
  removeAriaLabel: string;
}

interface SelectionChipsProps {
  heading?: string;
  items: SelectionChip[];
  onRemove: (id: string) => void;
}

export default function SelectionChips({ heading, items, onRemove }: SelectionChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {heading && (
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {heading}
        </h3>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
          >
            <span className="max-w-md">{item.content}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={item.removeAriaLabel}
              className="text-sky-400 hover:text-sky-600 dark:text-sky-500 dark:hover:text-sky-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
