import { useRef, useEffect } from 'react';
import Button from '@/components/shared/Button';

export interface DropdownItem {
  id: string;
  label: string;
  description?: string;
  metadata?: string;
}

// Explicit max-height class map for Tailwind JIT compilation
const MAX_HEIGHT_CLASSES: Record<string, string> = {
  '60': 'max-h-60',
  '80': 'max-h-80',
  '96': 'max-h-96',
  'screen': 'max-h-screen',
  'full': 'max-h-full'
};

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: DropdownItem) => void;
  items: DropdownItem[];
  showDropdown: boolean;
  onDropdownVisibilityChange: (visible: boolean) => void;
  placeholder: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  maxHeight?: keyof typeof MAX_HEIGHT_CLASSES;
  formatLabel?: (item: DropdownItem) => React.ReactNode;
  formatMetadata?: (item: DropdownItem) => React.ReactNode;
}

export default function SearchableDropdown({
  value,
  onChange,
  onSelect,
  items,
  showDropdown,
  onDropdownVisibilityChange,
  placeholder,
  icon,
  disabled = false,
  maxHeight = '60',
  formatLabel,
  formatMetadata
}: SearchableDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onDropdownVisibilityChange(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, onDropdownVisibilityChange]);

  const defaultIcon = (
    <svg className="h-5 w-5 text-sky-500 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z" />
    </svg>
  );

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.trim() && items.length > 0) {
            onDropdownVisibilityChange(true);
          }
        }}
        onFocus={() => {
          if (items.length > 0) {
            onDropdownVisibilityChange(true);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        {icon || defaultIcon}
      </div>

      {showDropdown && items.length > 0 && (
        <div className={`absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 ${MAX_HEIGHT_CLASSES[maxHeight]} overflow-y-auto`}>
          {items.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                onSelect(item);
                onDropdownVisibilityChange(false);
              }}
              className="text-left justify-start px-4 py-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0 rounded-none shadow-none"
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="text-sm text-slate-900 dark:text-slate-100">
                  {formatLabel ? formatLabel(item) : item.label}
                </div>
                {item.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.description}
                  </div>
                )}
                {item.metadata && formatMetadata && (
                  <div>
                    {formatMetadata(item)}
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
