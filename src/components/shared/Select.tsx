import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary line shown under the label */
  description?: string;
  /** Optional group heading; options keep their given order within a group */
  group?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when no option matches the current value */
  placeholder?: string;
  /** Adds a filter box above the list — use for long option lists */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  /** Width utility for the trigger, e.g. 'w-full' or 'w-48' */
  widthClass?: string;
  /** Width utility for the option panel, when it needs to be wider than the trigger */
  panelWidthClass?: string;
  /** Max height utility for the option list */
  maxHeightClass?: string;
  /** Renders the trigger at filter-pill scale, for use alongside FilterPopover */
  compact?: boolean;
}

const CHEVRON = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CHECK = (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, '');
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = false,
  searchPlaceholder = 'Filter...',
  disabled = false,
  id,
  ariaLabel,
  widthClass = 'w-full',
  panelWidthClass = 'w-full min-w-[13rem]',
  maxHeightClass = 'max-h-72',
  compact = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Read inside the open effect without making it re-run when either changes. */
  const valueRef = useRef(value);
  valueRef.current = value;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  useClickOutside(containerRef as React.RefObject<HTMLElement>, close, isOpen);

  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;

    const needle = normalize(query);
    return options.filter(
      (option) =>
        normalize(option.label).includes(needle) ||
        normalize(option.value).includes(needle) ||
        (option.group ? normalize(option.group).includes(needle) : false)
    );
  }, [options, query, searchable]);

  /** Flat render plan so group headings do not disturb keyboard indexes. */
  const rows = useMemo(() => {
    const result: ({ kind: 'group'; label: string } | { kind: 'option'; option: SelectOption; index: number })[] = [];
    let index = 0;
    let lastGroup: string | undefined;

    for (const option of visibleOptions) {
      if (option.group && option.group !== lastGroup) {
        result.push({ kind: 'group', label: option.group });
        lastGroup = option.group;
      }
      result.push({ kind: 'option', option, index });
      index++;
    }

    return result;
  }, [visibleOptions]);

  // Seeded once per opening: re-running on every `visibleOptions` change would undo the
  // search box moving the highlight to the first match.
  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = optionsRef.current.findIndex((option) => option.value === valueRef.current);
    setHighlighted(selectedIndex === -1 ? 0 : selectedIndex);

    if (searchable) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  /** A narrowing filter must not leave the highlight pointing past the last option. */
  useEffect(() => {
    setHighlighted((current) => Math.min(current, Math.max(0, visibleOptions.length - 1)));
  }, [visibleOptions.length]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const commit = useCallback(
    (option: SelectOption) => {
      onChange(option.value);
      close();
    },
    [close, onChange]
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setHighlighted((current) => Math.min(current + 1, visibleOptions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlighted((current) => Math.max(current - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setHighlighted(0);
        break;
      case 'End':
        event.preventDefault();
        setHighlighted(visibleOptions.length - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = visibleOptions[highlighted];
        if (option) commit(option);
        break;
      }
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-slate-900 transition ${compact ? 'text-xs' : 'text-sm'} focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 ${
          isOpen
            ? 'border-sky-500 dark:border-sky-400'
            : 'border-slate-400 hover:border-slate-500 dark:border-slate-500 dark:hover:border-slate-400'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        {CHEVRON}
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 mt-1 ${panelWidthClass} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900`}
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2 dark:border-slate-800">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          <div ref={listRef} id={listboxId} role="listbox" className={`overflow-y-auto py-1 ${maxHeightClass}`}>
            {rows.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">No matches</p>
            )}

            {rows.map((row) =>
              row.kind === 'group' ? (
                <p
                  key={`group-${row.label}`}
                  className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                >
                  {row.label}
                </p>
              ) : (
                <button
                  key={row.option.value}
                  type="button"
                  role="option"
                  aria-selected={row.option.value === value}
                  data-highlighted={row.index === highlighted}
                  onMouseEnter={() => setHighlighted(row.index)}
                  onClick={() => commit(row.option)}
                  className={`flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm transition ${
                    row.index === highlighted ? 'bg-sky-50 dark:bg-sky-500/10' : ''
                  } ${
                    row.option.value === value
                      ? 'font-medium text-sky-700 dark:text-sky-300'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="mt-0.5 w-4 shrink-0">{row.option.value === value ? CHECK : null}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.option.label}</span>
                    {row.option.description && (
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {row.option.description}
                      </span>
                    )}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
