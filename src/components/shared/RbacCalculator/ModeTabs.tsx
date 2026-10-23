import type { RbacMode } from '@/hooks/rbac/useRbacMode';
import { useMobileVariant } from '@/lib/mobileVariant';

export interface ModeTab {
  value: RbacMode;
  label: string;
}

interface ModeTabsProps {
  activeMode: RbacMode;
  onModeChange: (mode: RbacMode) => void;
  tabs: ModeTab[];
}

function UnderlineTabs({ activeMode, onModeChange, tabs, className = '' }: ModeTabsProps & { className?: string }) {
  return (
    <div className={`relative border-b border-slate-200 dark:border-slate-700 ${className}`}>
      <nav className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tabs">
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
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#F8F9FB] dark:from-[#121212] md:hidden" />
    </div>
  );
}

/**
 * ModeTabs - Shared tab navigation for RBAC calculators.
 *
 * Used by both Azure RBAC Calculator and Entra ID Roles Calculator.
 */
export default function ModeTabs(props: ModeTabsProps) {
  const variant = useMobileVariant();
  const { activeMode, onModeChange, tabs } = props;

  if (variant === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/70 md:hidden" role="tablist" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeMode === tab.value}
              onClick={() => onModeChange(tab.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeMode === tab.value
                  ? 'bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <UnderlineTabs {...props} className="hidden md:block" />
      </>
    );
  }

  if (variant === 3) {
    return (
      <>
        <label className="block md:hidden">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</span>
          <select
            value={activeMode}
            onChange={(e) => onModeChange(e.target.value as RbacMode)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {tabs.map((tab) => (
              <option key={tab.value} value={tab.value}>{tab.label}</option>
            ))}
          </select>
        </label>
        <UnderlineTabs {...props} className="hidden md:block" />
      </>
    );
  }

  return <UnderlineTabs activeMode={activeMode} onModeChange={onModeChange} tabs={tabs} />;
}
