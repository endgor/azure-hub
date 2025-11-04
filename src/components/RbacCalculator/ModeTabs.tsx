type InputMode = 'simple' | 'advanced' | 'roleExplorer' | 'roleCreator';

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
    { value: 'roleCreator', label: 'Role Creator' },
  ];

  return (
    <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 w-fit">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onModeChange(mode.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeMode === mode.value
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
