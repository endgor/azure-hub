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
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
          isColorModeActive
            ? 'bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
        }`}
        aria-pressed={isColorModeActive}
        aria-label={isColorModeActive ? 'Color mode enabled' : 'Toggle color mode'}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      </button>

      {isColorModeActive && (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
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
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            Click a row to paint
          </span>
        </div>
      )}
    </div>
  );
}

export { COLOR_SWATCHES, CLEAR_COLOR_ID };
