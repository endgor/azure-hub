import type { RoleSystemConfig } from '@/lib/rbacConfig';

interface ExampleScenariosProps {
  /** Configuration containing the scenarios to display */
  config: RoleSystemConfig;

  /** Callback when an example scenario is loaded */
  onLoadExample: (actions: readonly string[]) => void;
}

function getActionCounts(actions: readonly string[]): { control: number; data: number } {
  let control = 0;
  let data = 0;
  for (const action of actions) {
    if (action.toLowerCase().startsWith('data:')) {
      data++;
    } else {
      control++;
    }
  }
  return { control, data };
}

export default function ExampleScenarios({ config, onLoadExample }: ExampleScenariosProps) {
  const isAzure = config.systemType === 'azure';

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
        {config.examples.map((scenario) => {
          const counts = isAzure ? getActionCounts(scenario.actions) : null;

          return (
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
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                {isAzure && counts ? (
                  <>
                    {counts.control > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                          C
                        </span>
                        {counts.control}
                      </span>
                    )}
                    {counts.data > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                          D
                        </span>
                        {counts.data}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{scenario.actions.length} {config.labels.actionLabel.toLowerCase()}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
