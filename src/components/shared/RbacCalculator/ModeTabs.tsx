import type { RbacMode } from '@/hooks/rbac/useRbacMode';

export interface ModeTab {
  value: RbacMode;
  label: string;
}

interface ModeTabsProps {
  activeMode: RbacMode;
  onModeChange: (mode: RbacMode) => void;
  tabs: ModeTab[];
}

/**
 * ModeTabs - Shared tab navigation for RBAC calculators.
 *
 * Phones get a two-column segmented control so every mode stays visible;
 * wider screens keep the underline tabs.
 *
 * Used by both Azure RBAC Calculator and Entra ID Roles Calculator.
 */
export default function ModeTabs({ activeMode, onModeChange, tabs }: ModeTabsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/70 md:hidden" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={activeMode === tab.value}
            onClick={() => onModeChange(tab.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeMode === tab.value
                ? 'bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="hidden border-b border-slate-200 dark:border-slate-700 md:block">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onModeChange(tab.value)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activeMode === tab.value
                  ? 'border-sky-500 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
