import type { RoleSystemConfig } from '@/lib/rbacConfig';

interface ExampleScenariosProps {
  /** Configuration containing the scenarios to display */
  config: RoleSystemConfig;

  /** Callback when an example scenario is loaded */
  onLoadExample: (actions: readonly string[]) => void;
}

/**
 * ExampleScenarios - Pre-defined permission scenarios for quick testing
 *
 * Config-driven component that displays scenarios from the role system configuration.
 * Displays clickable scenario cards that load common permission sets.
 */
export default function ExampleScenarios({ config, onLoadExample }: ExampleScenariosProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Example Scenarios
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Click an example to load common permission scenarios for {config.systemName}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {config.examples.map((scenario) => (
          <button
            key={scenario.label}
            onClick={() => onLoadExample(scenario.actions)}
            className="flex flex-col space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {scenario.label}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {scenario.description}
            </p>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
              {scenario.actions.length} {config.labels.actionLabel.toLowerCase()}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
