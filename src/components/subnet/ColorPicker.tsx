import { type ReactElement, useEffect } from 'react';

// Excel "Office" theme fill tints (Lighter 80% / Lighter 60%) so exported
// sheets look native and text stays readable on top.
const COLOR_SWATCHES = [
  { id: 'blue', label: 'Blue', hex: '#DDEBF7' },
  { id: 'orange', label: 'Orange', hex: '#FCE4D6' },
  { id: 'gray', label: 'Gray', hex: '#EDEDED' },
  { id: 'gold', label: 'Gold', hex: '#FFF2CC' },
  { id: 'green', label: 'Green', hex: '#E2EFDA' },
  { id: 'purple', label: 'Purple', hex: '#E4DFEC' },
  { id: 'rose', label: 'Rose', hex: '#F8D7E3' },
  { id: 'blue-mid', label: 'Blue (darker)', hex: '#BDD7EE' },
  { id: 'orange-mid', label: 'Orange (darker)', hex: '#F8CBAD' },
  { id: 'gray-mid', label: 'Gray (darker)', hex: '#DBDBDB' },
  { id: 'gold-mid', label: 'Gold (darker)', hex: '#FFE699' },
  { id: 'green-mid', label: 'Green (darker)', hex: '#C6E0B4' },
  { id: 'purple-mid', label: 'Purple (darker)', hex: '#CCC0DA' },
  { id: 'rose-mid', label: 'Rose (darker)', hex: '#F4B6CC' }
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
  // Right-click anywhere exits color mode without a trip back to the toolbar.
  useEffect(() => {
    if (!isColorModeActive) return;
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      onToggleColorMode();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [isColorModeActive, onToggleColorMode]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleColorMode}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
          isColorModeActive
            ? 'bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400'
            : 'text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400'
        }`}
        aria-pressed={isColorModeActive}
        aria-label={isColorModeActive ? 'Color mode enabled' : 'Toggle color mode'}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21a9 9 0 110-18 9 9 0 018.36 5.7c.4 1-.22 2.1-1.3 2.3h-1.5a2 2 0 00-1.6 3.2l.6.8A2 2 0 0114.9 18H13a1.5 1.5 0 00-1.5 1.5c0 .83.67 1.5.5 1.5z" />
          <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
          <circle cx="10.5" cy="7" r="1" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {isColorModeActive && (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-flow-col grid-rows-2 gap-1.5">
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
          </div>
          <div className="flex items-center">
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
