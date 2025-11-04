import { useState, useCallback, useEffect, FormEvent, useRef, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import RoleResultsTable from '@/components/RoleResultsTable';
import RolePermissionsTable from '@/components/RolePermissionsTable';
import { calculateLeastPrivilege, searchOperations, getServiceNamespaces, getActionsByService, preloadActionsCache, loadRoleDefinitions } from '@/lib/clientRbacService';
import type { LeastPrivilegeResult, Operation, AzureRole } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { PERFORMANCE } from '@/config/constants';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';

// Import small components directly
import DisclaimerBanner from '@/components/RbacCalculator/DisclaimerBanner';
import ModeTabs from '@/components/RbacCalculator/ModeTabs';
import ExampleScenarios from '@/components/RbacCalculator/ExampleScenarios';
import AdvancedMode from '@/components/RbacCalculator/AdvancedMode';

// Lazy load larger components for bundle optimization
const RoleCreator = lazy(() => import('@/components/RoleCreator'));
const SimpleMode = lazy(() => import('@/components/RbacCalculator/SimpleMode'));
const RoleExplorerMode = lazy(() => import('@/components/RbacCalculator/RoleExplorerMode'));

type InputMode = 'simple' | 'advanced' | 'roleExplorer' | 'roleCreator';

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
  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorageBoolean('rbac-disclaimer-dismissed', false);

  // Role Explorer mode state
  const [availableRoles, setAvailableRoles] = useState<AzureRole[]>([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AzureRole[]>([]);
  const [roleSearchResults, setRoleSearchResults] = useState<AzureRole[]>([]);
  const [showRoleResults, setShowRoleResults] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Refs for click-outside detection
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const roleSearchDropdownRef = useRef<HTMLDivElement>(null);
  const advancedSearchDropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Hide service dropdown if clicked outside
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }

      // Hide role search dropdown if clicked outside
      if (roleSearchDropdownRef.current && !roleSearchDropdownRef.current.contains(event.target as Node)) {
        setRoleSearchResults([]);
      }

      // Hide advanced search dropdown if clicked outside
      if (advancedSearchDropdownRef.current && !advancedSearchDropdownRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDismissDisclaimer = () => {
    setDisclaimerDismissed(true);
  };

  // Defer actions cache preload to idle time (non-blocking)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadActionsCache(), { timeout: PERFORMANCE.IDLE_CALLBACK_TIMEOUT_MS });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => preloadActionsCache(), PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);
      }
    }, PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  // Load roles for Role Explorer and Role Creator modes
  useEffect(() => {
    if (inputMode === 'roleExplorer' || inputMode === 'roleCreator') {
      const loadRoles = async () => {
        try {
          setIsLoading(true);
          const roles = await loadRoleDefinitions();
          // Only show built-in roles
          const builtInRoles = roles.filter(role => role.roleType === 'BuiltInRole');
          setAvailableRoles(builtInRoles);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to load roles:', err);
          setError('Failed to load role definitions. Please try again.');
          setIsLoading(false);
        }
      };
      loadRoles();
    }
  }, [inputMode]);

  // Lazy load services only when Simple mode is active
  useEffect(() => {
    if (inputMode !== 'simple' || availableServices.length > 0) {
      return;
    }

    const loadServices = async () => {
      try {
        setIsLoadingServices(true);
        const services = await getServiceNamespaces();
        setAvailableServices(services);
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadServices();
  }, [inputMode, availableServices.length]);

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

    // Role Explorer mode doesn't use form submission
    if (inputMode === 'roleExplorer') {
      return;
    }

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

    try {
      const operations = await searchOperations(query.trim());
      setSearchResults(operations.slice(0, 10));
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
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
    setRoleSearchQuery('');
    setSelectedRoles([]);
    setRoleSearchResults([]);
    setShowRoleResults(false);
  }, []);

  const handleRoleSearch = useCallback((query: string) => {
    setRoleSearchQuery(query);

    if (!query.trim() || query.length < 2) {
      setRoleSearchResults([]);
      return;
    }

    // Filter out already selected roles
    const filteredRoles = availableRoles.filter(role =>
      !selectedRoles.some(selected => selected.id === role.id)
    );

    // Use intelligent sorting: exact matches first, then starts with, then alphabetical
    const sortedResults = filterAndSortByQuery(
      filteredRoles,
      query,
      (role) => role.roleName,
      10
    );

    setRoleSearchResults(sortedResults);
  }, [availableRoles, selectedRoles]);

  const handleAddRole = useCallback((role: AzureRole) => {
    setSelectedRoles(prev => [...prev, role]);
    setRoleSearchQuery('');
    setRoleSearchResults([]);
  }, []);

  const handleRemoveRole = useCallback((roleId: string) => {
    setSelectedRoles(prev => prev.filter(r => r.id !== roleId));
  }, []);

  const handleGenerateRolePermissions = useCallback(() => {
    setError(null);

    if (selectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    setShowRoleResults(true);
  }, [selectedRoles]);

  const handleSelectService = useCallback((service: string) => {
    setSelectedService(service);
    setServiceSearch(service);
    setShowServiceDropdown(false);
    setActionSearch('');
  }, []);

  const handleServiceSearchChange = useCallback((value: string) => {
    setServiceSearch(value);
    if (value !== selectedService) {
      setSelectedService('');
      setAvailableActions([]);
    }
  }, [selectedService]);

  // Use intelligent sorting for service search: exact matches first, then starts with, then alphabetical
  const filteredServices = serviceSearch
    ? filterAndSortByQuery(availableServices, serviceSearch, (service) => service)
    : availableServices;

  const filteredActions = availableActions.filter(action => {
    if (!actionSearch) return true;
    const searchLower = actionSearch.toLowerCase();
    return (
      action.name.toLowerCase().includes(searchLower) ||
      (action.displayName && action.displayName.toLowerCase().includes(searchLower))
    );
  });

  const selectedActionChips = useMemo(
    () =>
      selectedActions.map(action => ({
        id: action,
        content: <span className="font-mono text-xs break-all">{action}</span>,
        removeAriaLabel: `Remove ${action}`
      })),
    [selectedActions]
  );

  const selectedRoleChips = useMemo(
    () =>
      selectedRoles.map(role => ({
        id: role.id,
        content: <span className="text-sm">{role.roleName}</span>,
        removeAriaLabel: `Remove ${role.roleName}`
      })),
    [selectedRoles]
  );

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

        {/* Disclaimer Banner */}
        {!disclaimerDismissed && (
          <DisclaimerBanner onDismiss={handleDismissDisclaimer} />
        )}

        {/* Mode Tabs */}
        <ModeTabs activeMode={inputMode} onModeChange={setInputMode} />

        {/* Role Creator Mode */}
        {inputMode === 'roleCreator' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500/70 border-t-transparent" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading Role Creator...</p>
              </div>
            </div>
          }>
            <RoleCreator
              availableRoles={availableRoles}
              onSearchActions={searchOperations}
            />
          </Suspense>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Simple Mode */}
            {inputMode === 'simple' && (
              <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
                <SimpleMode
                  serviceSearch={serviceSearch}
                  onServiceSearchChange={handleServiceSearchChange}
                  selectedService={selectedService}
                  showServiceDropdown={showServiceDropdown}
                  onServiceDropdownVisibilityChange={setShowServiceDropdown}
                  isLoadingServices={isLoadingServices}
                  filteredServices={filteredServices}
                  serviceDropdownRef={serviceDropdownRef}
                  onSelectService={handleSelectService}
                  actionSearch={actionSearch}
                  onActionSearchChange={setActionSearch}
                  isLoadingActions={isLoadingActions}
                  availableActions={availableActions}
                  filteredActions={filteredActions}
                  selectedActions={selectedActions}
                  selectedActionChips={selectedActionChips}
                  onAddAction={handleAddActionSimple}
                  onRemoveAction={handleRemoveAction}
                />
              </Suspense>
            )}

            {/* Advanced Mode */}
            {inputMode === 'advanced' && (
              <AdvancedMode
                actionsInput={actionsInput}
                onActionsInputChange={handleAdvancedSearch}
                searchResults={searchResults}
                advancedSearchDropdownRef={advancedSearchDropdownRef}
                onAddAction={handleAddActionAdvanced}
              />
            )}

            {/* Role Explorer Mode */}
            {inputMode === 'roleExplorer' && (
              <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
                <RoleExplorerMode
                  roleSearchQuery={roleSearchQuery}
                  onRoleSearchChange={handleRoleSearch}
                  roleSearchResults={roleSearchResults}
                  roleSearchDropdownRef={roleSearchDropdownRef}
                  onAddRole={handleAddRole}
                  selectedRoleChips={selectedRoleChips}
                  onRemoveRole={handleRemoveRole}
                  isLoading={isLoading}
                  onGenerate={handleGenerateRolePermissions}
                  onClear={handleClear}
                />
              </Suspense>
            )}

            {/* Submit Buttons (Simple & Advanced modes only) */}
            {inputMode !== 'roleExplorer' && (
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
            )}
          </form>
        )}

        {/* Loading State */}
        {isLoading && inputMode !== 'roleCreator' && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-300">Calculating least privileged roles...</p>
          </div>
        )}

        {/* Error State */}
        {error && inputMode !== 'roleCreator' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Results for Simple & Advanced modes */}
        {!isLoading && !error && results.length > 0 && inputMode !== 'roleExplorer' && inputMode !== 'roleCreator' && (
          <RoleResultsTable results={results} />
        )}

        {/* Results for Role Explorer mode */}
        {inputMode === 'roleExplorer' && showRoleResults && selectedRoles.length > 0 && !isLoading && (
          <RolePermissionsTable roles={selectedRoles} />
        )}

        {/* Example Scenarios (Simple & Advanced modes only, when no results) */}
        {results.length === 0 && !isLoading && inputMode !== 'roleExplorer' && inputMode !== 'roleCreator' && (
          <ExampleScenarios onLoadExample={handleLoadExample} />
        )}
      </section>
    </Layout>
  );
}
