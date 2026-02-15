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
 * ModeTabs - Shared underline-style tab navigation for RBAC calculators.
 *
 * Used by both Azure RBAC Calculator and Entra ID Roles Calculator.
 */
export default function ModeTabs({ activeMode, onModeChange, tabs }: ModeTabsProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
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
  );
}
