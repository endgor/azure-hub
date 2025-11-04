interface Scenario {
  label: string;
  description: string;
  actions: readonly string[];
}

interface ExampleScenariosProps {
  onLoadExample: (actions: readonly string[]) => void;
}

const SAMPLE_SCENARIOS: Scenario[] = [
  {
    label: 'VM Management',
    description: 'Start and stop virtual machines',
    actions: [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Compute/virtualMachines/start/action',
      'Microsoft.Compute/virtualMachines/powerOff/action'
    ]
  },
  {
    label: 'Storage Read',
    description: 'Read storage account and blob data',
    actions: [
      'Microsoft.Storage/storageAccounts/read',
      'Microsoft.Storage/storageAccounts/blobServices/containers/read'
    ]
  },
  {
    label: 'Network Viewer',
    description: 'View network resources',
    actions: [
      'Microsoft.Network/virtualNetworks/read',
      'Microsoft.Network/networkSecurityGroups/read',
      'Microsoft.Network/publicIPAddresses/read'
    ]
  },
  {
    label: 'Key Vault Secrets',
    description: 'Read secrets from Key Vault',
    actions: [
      'Microsoft.KeyVault/vaults/read',
      'Microsoft.KeyVault/vaults/secrets/read'
    ]
  },
  {
    label: 'Resource Reader',
    description: 'Read all resources in a subscription',
    actions: [
      'Microsoft.Resources/subscriptions/read',
      'Microsoft.Resources/subscriptions/resourceGroups/read'
    ]
  },
  {
    label: 'Web App Deploy',
    description: 'Deploy and manage web applications',
    actions: [
      'Microsoft.Web/sites/read',
      'Microsoft.Web/sites/config/write',
      'Microsoft.Web/sites/restart/action'
    ]
  }
] as const;

/**
 * ExampleScenarios - Pre-defined permission scenarios for quick testing
 *
 * Displays clickable scenario cards that load common permission sets.
 */
export default function ExampleScenarios({ onLoadExample }: ExampleScenariosProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Example Scenarios
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Click an example to load common permission scenarios.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_SCENARIOS.map((scenario) => (
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
              {scenario.actions.length} actions
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
