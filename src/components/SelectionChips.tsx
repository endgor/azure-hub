import { ReactNode } from 'react';

interface SelectionChip {
  id: string;
  content: ReactNode;
  removeAriaLabel: string;
}

interface SelectionChipsProps {
  heading: string;
  items: SelectionChip[];
  onRemove: (id: string) => void;
}

export default function SelectionChips({ heading, items, onRemove }: SelectionChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {heading}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <div className="max-w-md">{item.content}</div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={item.removeAriaLabel}
              className="shrink-0 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
