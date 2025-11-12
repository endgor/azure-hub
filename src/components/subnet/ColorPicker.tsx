import type { ReactElement } from 'react';

const COLOR_SWATCHES = [
  { id: 'mint', label: 'Mint', hex: '#d1fae5' },
  { id: 'sky', label: 'Sky', hex: '#dbeafe' },
  { id: 'rose', label: 'Rose', hex: '#fce7f3' },
  { id: 'amber', label: 'Amber', hex: '#fef3c7' },
  { id: 'violet', label: 'Violet', hex: '#ede9fe' }
] as const;

const CLEAR_COLOR_ID = 'clear';

export interface ColorPickerProps {
  isColorModeActive: boolean;
  selectedColorId: string;
  onToggleColorMode: () => void;
  onSelectColor: (colorId: string) => void;
}

/**
 * Color picker dropdown for subnet row highlighting.
 * Displays color swatches and a clear option.
 */
export default function ColorPicker({
  isColorModeActive,
  selectedColorId,
  onToggleColorMode,
  onSelectColor
}: ColorPickerProps): ReactElement {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleColorMode}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-slate-400 ${
          isColorModeActive
            ? 'border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        }`}
        aria-pressed={isColorModeActive}
        title={isColorModeActive ? 'Color mode enabled' : 'Toggle color mode'}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5c-4.694 0-8.5 3.206-8.5 7.25 0 1.502.414 2.878 1.318 3.999a3.5 3.5 0 002.682 1.251h1.75a1.5 1.5 0 011.5 1.5v.25a2.5 2.5 0 002.5 2.5h.25a3.75 3.75 0 003.75-3.75c0-1.1-.9-2-2-2h-.75a1.5 1.5 0 01-1.5-1.5c0-.828.672-1.5 1.5-1.5H15a3.5 3.5 0 000-7c-.552 0-1 .448-1 1s-.448 1-1 1-1-.448-1-1-.448-1-1-1z"
          />
          <circle cx="8.6" cy="10.3" r="0.85" fill="currentColor" />
          <circle cx="10.6" cy="7.4" r="0.85" fill="currentColor" />
          <circle cx="13.4" cy="8.2" r="0.85" fill="currentColor" />
          <circle cx="9.4" cy="13.1" r="0.85" fill="currentColor" />
        </svg>
      </button>

      {isColorModeActive && (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-1.5">
            {COLOR_SWATCHES.map((option) => {
              const isSelected = selectedColorId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectColor(option.id)}
                  className={`h-5 w-5 rounded-full border-2 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                    isSelected ? 'border-sky-500' : 'border-transparent hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: option.hex }}
                  aria-label={`Select ${option.label} highlight`}
                />
              );
            })}
            <button
              type="button"
              onClick={() => onSelectColor(CLEAR_COLOR_ID)}
              className={`h-5 w-5 rounded-full border-2 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                selectedColorId === CLEAR_COLOR_ID
                  ? 'border-sky-500'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              style={{ backgroundColor: '#ffffff' }}
              aria-label="Clear highlight"
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            Click a row to paint
          </span>
        </div>
      )}
    </div>
  );
}

export { COLOR_SWATCHES, CLEAR_COLOR_ID };
