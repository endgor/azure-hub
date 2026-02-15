type InputMode = 'simple' | 'advanced' | 'roleExplorer' | 'roleCompare' | 'roleCreator';

interface ModeTabsProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

/**
 * ModeTabs - Mode selector tabs for RBAC Calculator
 *
 * Allows switching between Simple, Advanced, Role Explorer, and Role Creator modes.
 */
export default function ModeTabs({ activeMode, onModeChange }: ModeTabsProps) {
  const modes: Array<{ value: InputMode; label: string }> = [
    { value: 'simple', label: 'Simple' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'roleExplorer', label: 'Role Explorer' },
    { value: 'roleCompare', label: 'Role Compare' },
    { value: 'roleCreator', label: 'Role Creator' },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onModeChange(mode.value)}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeMode === mode.value
                ? 'border-sky-500 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
