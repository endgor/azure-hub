import { useState, useCallback, useEffect, FormEvent } from 'react';
import Layout from '@/components/Layout';
import RoleResultsTable from '@/components/RoleResultsTable';
import { calculateLeastPrivilege, searchOperations, getServiceNamespaces, getActionsByService } from '@/lib/clientRbacService';
import type { LeastPrivilegeResult, Operation } from '@/types/rbac';

type InputMode = 'simple' | 'advanced';

export default function RbacCalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>('simple');
  const [actionsInput, setActionsInput] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [availableActions, setAvailableActions] = useState<Operation[]>([]);
  const [results, setResults] = useState<LeastPrivilegeResult[]>([]);
  const [searchResults, setSearchResults] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await getServiceNamespaces();
        setAvailableServices(services);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedService) {
        setAvailableActions([]);
        return;
      }

      setIsLoadingActions(true);
      try {
        const actions = await getActionsByService(selectedService);
        setAvailableActions(actions);
      } catch (err) {
        console.error('Failed to load actions:', err);
        setAvailableActions([]);
      } finally {
        setIsLoadingActions(false);
      }
    };
    loadActions();
  }, [selectedService]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    let actions: string[] = [];

    if (inputMode === 'simple') {
      if (selectedActions.length === 0) {
        setError('Please select at least one action');
        return;
      }
      actions = selectedActions;
    } else {
      if (!actionsInput.trim()) {
        setError('Please enter at least one action');
        return;
      }
      actions = actionsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (actions.length === 0) {
        setError('Please enter at least one action');
        return;
      }
    }

    setIsLoading(true);

    try {
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
  }, [inputMode, selectedActions, actionsInput]);

  const handleAdvancedSearch = useCallback(async (query: string) => {
    setActionsInput(query);

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const operations = await searchOperations(query.trim());
      setSearchResults(operations.slice(0, 10));
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddActionSimple = useCallback((action: string) => {
    if (!selectedActions.includes(action)) {
      setSelectedActions(prev => [...prev, action]);
    }
  }, [selectedActions]);

  const handleRemoveAction = useCallback((action: string) => {
    setSelectedActions(prev => prev.filter(a => a !== action));
  }, []);

  const handleAddActionAdvanced = useCallback((action: string) => {
    const currentActions = actionsInput.split('\n').filter(line => line.trim());
    if (!currentActions.includes(action)) {
      setActionsInput([...currentActions, action].join('\n'));
    }
    setSearchResults([]);
  }, [actionsInput]);

  const handleLoadExample = useCallback((actions: readonly string[]) => {
    if (inputMode === 'simple') {
      setSelectedActions([...actions]);
    } else {
      setActionsInput([...actions].join('\n'));
    }
    setSearchResults([]);
  }, [inputMode]);

  const handleClear = useCallback(() => {
    setActionsInput('');
    setSelectedActions([]);
    setSelectedService('');
    setServiceSearch('');
    setShowServiceDropdown(false);
    setActionSearch('');
    setAvailableActions([]);
    setResults([]);
    setError(null);
    setSearchResults([]);
  }, []);

  const handleSelectService = useCallback((service: string) => {
    setSelectedService(service);
    setServiceSearch(service);
    setShowServiceDropdown(false);
    setActionSearch('');
  }, []);

  const filteredServices = availableServices.filter(service => {
    if (!serviceSearch) return true;
    return service.toLowerCase().includes(serviceSearch.toLowerCase());
  });

  const filteredActions = availableActions.filter(action => {
    if (!actionSearch) return true;
    const searchLower = actionSearch.toLowerCase();
    return (
      action.name.toLowerCase().includes(searchLower) ||
      (action.displayName && action.displayName.toLowerCase().includes(searchLower))
    );
  });

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
            Enter the Azure actions you need, the calculator will retrieve the least privileged built-in roles that grant those permissions.
          </p>
        </div>

        <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 w-fit">
          <button
            type="button"
            onClick={() => setInputMode('simple')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              inputMode === 'simple'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setInputMode('advanced')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              inputMode === 'advanced'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Advanced
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {inputMode === 'simple' ? (
            <>
              <div className="space-y-2 relative max-w-2xl">
                <label
                  htmlFor="service-search"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Step 1: Select Azure Service
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="service-search"
                    value={serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setShowServiceDropdown(true);
                      if (e.target.value !== selectedService) {
                        setSelectedService('');
                        setAvailableActions([]);
                      }
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowServiceDropdown(false), 200);
                    }}
                    placeholder="Search for a service (e.g., Compute, Storage, Network)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      className="h-5 w-5 text-sky-500 dark:text-sky-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z"
                      />
                    </svg>
                  </div>

                  {showServiceDropdown && filteredServices.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-80 overflow-y-auto">
                      {filteredServices.map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => handleSelectService(service)}
                          className="w-full text-left px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {service}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showServiceDropdown && serviceSearch && filteredServices.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      No services match &ldquo;{serviceSearch}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {selectedService && (
                <div className="space-y-2">
                  <label
                    htmlFor="action-search"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Step 2: Browse and Select Actions
                  </label>
                  <input
                    type="text"
                    id="action-search"
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    placeholder="Filter actions (e.g., read, write, delete)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
                  />

                  {isLoadingActions ? (
                    <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
                    </div>
                  ) : filteredActions.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Available Actions ({filteredActions.length}) - Click to add
                        </p>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {filteredActions.map((operation) => (
                          <button
                            key={operation.name}
                            type="button"
                            onClick={() => handleAddActionSimple(operation.name)}
                            disabled={selectedActions.includes(operation.name)}
                            className="w-full text-left px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="font-mono text-sm text-sky-600 dark:text-sky-400 break-all">
                                  {operation.name}
                                </div>
                                {operation.description && (
                                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    {operation.description}
                                  </div>
                                )}
                              </div>
                              {selectedActions.includes(operation.name) && (
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                                  Added
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {actionSearch ? 'No actions match your filter' : 'No actions available for this service'}
                    </div>
                  )}

                  {availableActions.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                      <strong>Note:</strong> Simple mode only shows actions explicitly defined in roles. Some actions (like bastionHosts) may be covered by wildcards (e.g., <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">Microsoft.Network/*</code>) and won&apos;t appear in this list. Use <strong>Advanced mode</strong> to search for any action.
                    </div>
                  )}
                </div>
              )}

              {selectedActions.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Selected Actions ({selectedActions.length})
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-wrap gap-2">
                      {selectedActions.map((action) => (
                        <div
                          key={action}
                          className="group flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 dark:border-sky-800 dark:bg-sky-900/30"
                        >
                          <span className="font-mono text-xs text-sky-700 dark:text-sky-300 break-all">
                            {action}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(action)}
                            className="shrink-0 text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200"
                            aria-label={`Remove ${action}`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
                  onChange={(e) => handleAdvancedSearch(e.target.value)}
                  placeholder={'Microsoft.Compute/virtualMachines/read\nMicrosoft.Compute/virtualMachines/start/action\nMicrosoft.Compute/virtualMachines/restart/action'}
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports wildcards (e.g., Microsoft.Storage/ *). Lines starting with # are treated as comments.
                </p>
              </div>

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
                        onClick={() => handleAddActionAdvanced(operation.name)}
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
            </>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || (inputMode === 'simple' ? selectedActions.length === 0 : !actionsInput.trim())}
              className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              {isLoading ? 'Calculating...' : 'Find Roles'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-300">Calculating least privileged roles...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {!isLoading && !error && results.length > 0 && (
          <RoleResultsTable results={results} />
        )}

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
