import { useState, useCallback, useEffect, FormEvent, useRef, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import {
  calculateLeastPrivilegeEntraID,
  searchEntraIDActions,
  getEntraIDNamespaces,
  getEntraIDActionsByNamespace,
  preloadEntraIDActionsCache,
  getEntraIDRolesDataStatus,
  loadEntraIDRoles
} from '@/lib/entraIdRbacService';
import type { EntraIDRole, EntraIDLeastPrivilegeResult } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { PERFORMANCE } from '@/config/constants';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';
import { useClickOutside } from '@/hooks/useClickOutside';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import Button from '@/components/shared/Button';
import RoleResultsTable from '@/components/RoleResultsTable';
import EntraIdRolePermissionsTable from '@/components/EntraIdRolePermissionsTable';

// Import config
import { entraIdConfig } from '@/lib/rbacConfig';

// Import shared config-driven components
import DisclaimerBanner from '@/components/shared/RbacCalculator/DisclaimerBanner';
import ExampleScenarios from '@/components/shared/RbacCalculator/ExampleScenarios';
import AdvancedMode from '@/components/shared/RbacCalculator/AdvancedMode';
import ModeTabs from '@/components/shared/RbacCalculator/ModeTabs';

// Import shared hooks
import { useAdvancedSearch } from '@/hooks/rbac/useAdvancedSearch';
import { useServiceActions } from '@/hooks/rbac/useServiceActions';
import { useRbacMode } from '@/hooks/rbac/useRbacMode';

// Lazy load larger components for bundle optimization
const SimpleMode = lazy(() => import('@/components/shared/RbacCalculator/SimpleMode'));
const RoleExplorerMode = lazy(() => import('@/components/shared/RbacCalculator/RoleExplorerMode'));
import type { GenericRole } from '@/components/shared/RbacCalculator/RoleExplorerMode';
import type { SelectedAction } from '@/components/shared/RbacCalculator/SimpleMode';

export default function EntraIdRolesCalculatorPage() {
  // Mode management
  const { mode: inputMode, setMode: setInputMode, isSimpleMode, isRoleExplorerMode } = useRbacMode({
    initialMode: 'simple',
    supportedModes: ['simple', 'advanced', 'roleExplorer'],
  });

  // Advanced search management
  const {
    actionsInput,
    searchResults,
    textareaRef: advancedTextareaRef,
    handleSearch: handleAdvancedSearchRaw,
    handleAddAction: handleAddActionAdvanced,
    setActionsInputDirect,
    clearSearch,
    clearResults,
  } = useAdvancedSearch({
    onSearch: async (query) => {
      const actionNames = await searchEntraIDActions(query);
      return actionNames.slice(0, 10).map(name => ({
        name,
        displayName: name.split('/').pop() || name,
        description: '',
        provider: name.split('/')[0] || '',
      }));
    },
  });

  // Service actions management for simple mode
  const {
    availableServices,
    availableActions,
    selectedService,
    serviceSearch,
    isLoadingServices,
    isLoadingActions,
    handleSelectService,
    handleServiceSearchChange,
    clearServices,
  } = useServiceActions({
    loadServices: getEntraIDNamespaces,
    loadActions: getEntraIDActionsByNamespace,
    isActive: isSimpleMode,
  });

  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [results, setResults] = useState<EntraIDLeastPrivilegeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorageBoolean('entraid-roles-disclaimer-dismissed', false);

  // Role Explorer mode state
  const [availableRoles, setAvailableRoles] = useState<EntraIDRole[]>([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<EntraIDRole[]>([]);
  const [roleSearchResults, setRoleSearchResults] = useState<EntraIDRole[]>([]);
  const [showRoleResults, setShowRoleResults] = useState(false);

  // Refs for click-outside detection
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const roleSearchDropdownRef = useRef<HTMLDivElement>(null);
  const advancedSearchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useClickOutside(serviceDropdownRef as React.RefObject<HTMLElement>, () => setShowServiceDropdown(false), showServiceDropdown);
  useClickOutside(roleSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    setRoleSearchResults([]);
    setShowRoleResults(false);
  }, roleSearchResults.length > 0);
  useClickOutside(advancedSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    // Only hide the suggestions dropdown, don't clear the input
    clearResults();
  }, searchResults.length > 0);

  const handleDismissDisclaimer = () => {
    setDisclaimerDismissed(true);
  };

  // Defer actions cache preload to idle time (non-blocking)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadEntraIDActionsCache(), { timeout: PERFORMANCE.IDLE_CALLBACK_TIMEOUT_MS });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => preloadEntraIDActionsCache(), PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);
      }
    }, PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  // Load roles for Role Explorer mode
  useEffect(() => {
    if (isRoleExplorerMode) {
      const loadRoles = async () => {
        try {
          setIsLoading(true);
          const roles = await loadEntraIDRoles();
          // Only show built-in roles
          const builtInRoles = roles.filter(role => role.isBuiltIn);
          setAvailableRoles(builtInRoles);
          setIsLoading(false);
        } catch {
          setError('Failed to load Entra ID role definitions. Please try again.');
          setIsLoading(false);
        }
      };
      loadRoles();
    }
  }, [isRoleExplorerMode]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    // Role Explorer mode doesn't use form submission
    if (isRoleExplorerMode) {
      return;
    }

    let actions: string[] = [];

    if (isSimpleMode) {
      if (selectedActions.length === 0) {
        setError('Please select at least one permission');
        return;
      }
      actions = selectedActions;
    } else {
      if (!actionsInput.trim()) {
        setError('Please enter at least one permission');
        return;
      }
      actions = actionsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (actions.length === 0) {
        setError('Please enter at least one permission');
        return;
      }
    }

    setIsLoading(true);

    try {
      const leastPrivilegedRoles = await calculateLeastPrivilegeEntraID({
        requiredActions: actions
      });

      setResults(leastPrivilegedRoles);

      if (leastPrivilegedRoles.length === 0) {
        const dataStatus = getEntraIDRolesDataStatus();
        if (dataStatus === 'missing') {
          setError('No Entra ID roles data found. Run "npm run fetch-entraid-roles" with Azure credentials (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID) to download role definitions.');
        } else {
          setError('No Entra ID roles found that grant all the specified permissions. Try fewer or more general permissions.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Entra ID roles')) {
        setError('Entra ID roles data not available. Run "npm run fetch-entraid-roles" with Azure credentials to fetch role definitions.');
      } else {
        setError('Failed to calculate least privileged roles. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSimpleMode, isRoleExplorerMode, selectedActions, actionsInput]);

  const handleAddActionSimple = useCallback((action: SelectedAction | string) => {
    // Extract action name from either string or SelectedAction object
    const actionName = typeof action === 'string' ? action : action.name;
    if (!selectedActions.includes(actionName)) {
      setSelectedActions(prev => [...prev, actionName]);
    }
  }, [selectedActions]);

  const handleRemoveAction = useCallback((action: string) => {
    setSelectedActions(prev => prev.filter(a => a !== action));
  }, []);

  const handleLoadExample = useCallback((actions: readonly string[]) => {
    if (isSimpleMode) {
      setSelectedActions([...actions]);
      clearSearch();
    } else {
      setActionsInputDirect([...actions].join('\n'));
    }
  }, [isSimpleMode, setActionsInputDirect, clearSearch]);

  const handleClear = useCallback(() => {
    clearSearch();
    clearServices();
    setSelectedActions([]);
    setShowServiceDropdown(false);
    setActionSearch('');
    setResults([]);
    setError(null);
    setRoleSearchQuery('');
    setSelectedRoles([]);
    setRoleSearchResults([]);
    setShowRoleResults(false);
  }, [clearSearch, clearServices]);

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
      (role) => role.displayName,
      10
    );

    setRoleSearchResults(sortedResults);
  }, [availableRoles, selectedRoles]);

  const handleAddRole = useCallback((role: EntraIDRole) => {
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

  const handleSelectServiceWrapper = useCallback((service: string) => {
    handleSelectService(service);
    setShowServiceDropdown(false);
    setActionSearch('');
  }, [handleSelectService]);

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
        content: <span className="text-sm">{role.displayName}</span>,
        removeAriaLabel: `Remove ${role.displayName}`
      })),
    [selectedRoles]
  );

  // Get mode-specific description from config
  const getDescription = () => {
    switch (inputMode) {
      case 'simple':
        return entraIdConfig.descriptions.simple;
      case 'advanced':
        return entraIdConfig.descriptions.advanced;
      case 'roleExplorer':
        return entraIdConfig.descriptions.roleExplorer;
      default:
        return entraIdConfig.descriptions.simple;
    }
  };

  return (
    <Layout
      title={entraIdConfig.metadata.title}
      description={entraIdConfig.metadata.description}
      keywords={entraIdConfig.metadata.keywords}
      breadcrumbs={entraIdConfig.metadata.breadcrumbs}
      toolSchema={{
        name: entraIdConfig.metadata.toolSchemaName,
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            {entraIdConfig.labels.categoryLabel}
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            {entraIdConfig.labels.heroTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            {getDescription()}
          </p>
        </div>

        {/* Disclaimer Banner */}
        {!disclaimerDismissed && (
          <DisclaimerBanner config={entraIdConfig} onDismiss={handleDismissDisclaimer} />
        )}

        {/* Mode Tabs (Simple, Advanced, Role Explorer only) */}
        <ModeTabs
          activeMode={inputMode}
          onModeChange={setInputMode}
          tabs={[
            { value: 'simple', label: 'Simple Mode' },
            { value: 'advanced', label: 'Advanced Mode' },
            { value: 'roleExplorer', label: 'Role Explorer' },
          ]}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Simple Mode */}
          {isSimpleMode && (
            <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
              <SimpleMode
                config={entraIdConfig}
                serviceSearch={serviceSearch}
                onServiceSearchChange={handleServiceSearchChange}
                selectedService={selectedService}
                showServiceDropdown={showServiceDropdown}
                onServiceDropdownVisibilityChange={setShowServiceDropdown}
                isLoadingServices={isLoadingServices}
                filteredServices={filteredServices}
                serviceDropdownRef={serviceDropdownRef}
                onSelectService={handleSelectServiceWrapper}
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
              config={entraIdConfig}
              actionsInput={actionsInput}
              onActionsInputChange={handleAdvancedSearchRaw}
              searchResults={searchResults}
              advancedSearchDropdownRef={advancedSearchDropdownRef}
              textareaRef={advancedTextareaRef}
              onAddAction={handleAddActionAdvanced}
            />
          )}

          {/* Role Explorer Mode */}
          {isRoleExplorerMode && (
            <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
              <RoleExplorerMode
                config={entraIdConfig}
                roleSearchQuery={roleSearchQuery}
                onRoleSearchChange={handleRoleSearch}
                roleSearchResults={roleSearchResults}
                roleSearchDropdownRef={roleSearchDropdownRef}
                onAddRole={handleAddRole as (role: GenericRole) => void}
                selectedRoleChips={selectedRoleChips}
                onRemoveRole={handleRemoveRole}
                isLoading={isLoading}
                onGenerate={handleGenerateRolePermissions}
                onClear={handleClear}
              />
            </Suspense>
          )}

          {/* Submit Buttons (Simple & Advanced modes only) */}
          {!isRoleExplorerMode && (
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading || (isSimpleMode ? selectedActions.length === 0 : !actionsInput.trim())}
                isLoading={isLoading}
              >
                {isLoading ? 'Calculating...' : 'Find Roles'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          )}
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <LoadingSpinner size="lg" label="Calculating least privileged roles..." />
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        {/* Results for Simple & Advanced modes */}
        {!isLoading && !error && results.length > 0 && !isRoleExplorerMode && (
          <RoleResultsTable results={results} roleSystem="entraid" />
        )}

        {/* Results for Role Explorer mode */}
        {isRoleExplorerMode && showRoleResults && selectedRoles.length > 0 && !isLoading && (
          <EntraIdRolePermissionsTable roles={selectedRoles} />
        )}

        {/* Example Scenarios (Simple & Advanced modes only, when no results) */}
        {results.length === 0 && !isLoading && !isRoleExplorerMode && (
          <ExampleScenarios config={entraIdConfig} onLoadExample={handleLoadExample} />
        )}
      </section>
    </Layout>
  );
}
