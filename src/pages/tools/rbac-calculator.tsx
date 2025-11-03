import { useState, useCallback, FormEvent } from 'react';
import Layout from '@/components/Layout';
import RoleResultsTable from '@/components/RoleResultsTable';
import { calculateLeastPrivilege, searchOperations } from '@/lib/clientRbacService';
import type { LeastPrivilegeResult, Operation } from '@/types/rbac';

export default function RbacCalculatorPage() {
  const [actionsInput, setActionsInput] = useState('');
  const [results, setResults] = useState<LeastPrivilegeResult[]>([]);
  const [searchResults, setSearchResults] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    if (!actionsInput.trim()) {
      setError('Please enter at least one action');
      return;
    }

    setIsLoading(true);

    try {
      // Parse actions from textarea (one per line)
      const actions = actionsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (actions.length === 0) {
        setError('Please enter at least one action');
        setIsLoading(false);
        return;
      }

      // Calculate least privileged roles
      const leastPrivilegedRoles = await calculateLeastPrivilege({
        requiredActions: actions,
        requiredDataActions: []
      });

      setResults(leastPrivilegedRoles);

      if (leastPrivilegedRoles.length === 0) {
        setError('No roles found that grant all the specified permissions. Try fewer or more general actions.');
      }
    } catch (err) {
      setError('Failed to calculate least privileged roles. Please try again.');
      console.error('Error calculating roles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [actionsInput]);

  // Handle search as user types
  const handleSearchChange = useCallback(async (query: string) => {
    setActionsInput(query);

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const operations = await searchOperations(query.trim());
      setSearchResults(operations.slice(0, 10)); // Limit to 10 suggestions
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Add a suggested action to the input
  const handleAddAction = useCallback((action: string) => {
    const currentActions = actionsInput.split('\n').filter(line => line.trim());
    if (!currentActions.includes(action)) {
      setActionsInput([...currentActions, action].join('\n'));
    }
    setSearchResults([]);
  }, [actionsInput]);

  // Load example actions
  const handleLoadExample = useCallback((actions: readonly string[]) => {
    setActionsInput([...actions].join('\n'));
    setSearchResults([]);
  }, []);

  return (
    <Layout
      title="RBAC Least Privilege Calculator"
      description="Find the least privileged Azure role for your required permissions using Azure Hub's RBAC calculator."
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Identity & Access
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl lg:text-4xl">
            RBAC Least Privilege Calculator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Enter the Azure actions you need, and we&rsquo;ll find the least privileged built-in roles that grant those permissions.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="actions"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Required Actions <span className="text-slate-500">(one per line)</span>
            </label>
            <textarea
              id="actions"
              value={actionsInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Microsoft.Compute/virtualMachines/read&#10;Microsoft.Compute/virtualMachines/start/action&#10;Microsoft.Compute/virtualMachines/restart/action"
              rows={8}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports wildcards (e.g., Microsoft.Storage/*). Lines starting with # are treated as comments.
            </p>
          </div>

          {/* Search suggestions */}
          {searchResults.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Suggested Actions
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((operation) => (
                  <button
                    key={operation.name}
                    type="button"
                    onClick={() => handleAddAction(operation.name)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="font-mono text-sm text-sky-600 dark:text-sky-400">
                      {operation.name}
                    </div>
                    {operation.displayName && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {operation.displayName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !actionsInput.trim()}
              className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              {isLoading ? 'Calculating...' : 'Find Roles'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActionsInput('');
                setResults([]);
                setError(null);
                setSearchResults([]);
              }}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-300">Calculating least privileged roles...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && results.length > 0 && (
          <RoleResultsTable results={results} />
        )}

        {/* Sample Queries */}
        {results.length === 0 && !isLoading && (
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
                  onClick={() => handleLoadExample(scenario.actions)}
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
        )}
      </section>
    </Layout>
  );
}

const SAMPLE_SCENARIOS = [
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
