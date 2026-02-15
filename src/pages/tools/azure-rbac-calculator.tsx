import { useState, useCallback, useEffect, FormEvent, useRef, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import RoleResultsTable from '@/components/RoleResultsTable';
import RolePermissionsTable from '@/components/RolePermissionsTable';
import { calculateLeastPrivilege, searchOperations, getServiceNamespaces, getActionsByService, preloadActionsCache, loadRoleDefinitions, classifyActions } from '@/lib/clientRbacService';
import type { LeastPrivilegeResult, AzureRole } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { PERFORMANCE } from '@/config/constants';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';
import { useClickOutside } from '@/hooks/useClickOutside';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import Button from '@/components/shared/Button';

// Import config
import { azureRbacConfig } from '@/lib/rbacConfig';

// Import shared config-driven components
import DisclaimerBanner from '@/components/shared/RbacCalculator/DisclaimerBanner';
import ExampleScenarios from '@/components/shared/RbacCalculator/ExampleScenarios';
import AdvancedMode from '@/components/shared/RbacCalculator/AdvancedMode';

// Import shared tab navigation
import ModeTabs from '@/components/shared/RbacCalculator/ModeTabs';

// Import shared hooks
import { useAdvancedSearch } from '@/hooks/rbac/useAdvancedSearch';
import { useServiceActions } from '@/hooks/rbac/useServiceActions';
import { useRbacMode } from '@/hooks/rbac/useRbacMode';

// Lazy load larger components for bundle optimization
const RoleCreator = lazy(() => import('@/components/RoleCreator'));
const SimpleMode = lazy(() => import('@/components/shared/RbacCalculator/SimpleMode'));
const RoleExplorerMode = lazy(() => import('@/components/shared/RbacCalculator/RoleExplorerMode'));
const RoleCompareMode = lazy(() => import('@/components/shared/RbacCalculator/RoleCompareMode'));
import RoleComparisonTable from '@/components/RoleComparisonTable';
import type { GenericRole } from '@/components/shared/RbacCalculator/RoleExplorerMode';
import type { SelectedAction } from '@/components/shared/RbacCalculator/SimpleMode';

export default function AzureRbacCalculatorPage() {
  // Mode management
  const { mode: inputMode, setMode: setInputMode, isSimpleMode, isRoleExplorerMode, isRoleCompareMode, isRoleCreatorMode } = useRbacMode({
    initialMode: 'simple',
    supportedModes: ['simple', 'advanced', 'roleExplorer', 'roleCompare', 'roleCreator'],
  });

  // Advanced search management
  const {
    actionsInput,
    searchResults,
    textareaRef: advancedTextareaRef,
    handleSearch: handleAdvancedSearch,
    handleAddAction: handleAddActionAdvanced,
    setActionsInputDirect,
    clearSearch,
    clearResults,
  } = useAdvancedSearch({
    onSearch: searchOperations,
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
    loadServices: getServiceNamespaces,
    loadActions: getActionsByService,
    isActive: isSimpleMode,
  });

  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [results, setResults] = useState<LeastPrivilegeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorageBoolean('azure-rbac-disclaimer-dismissed', false);

  // Role Explorer mode state
  const [availableRoles, setAvailableRoles] = useState<AzureRole[]>([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AzureRole[]>([]);
  const [roleSearchResults, setRoleSearchResults] = useState<AzureRole[]>([]);
  const [showRoleResults, setShowRoleResults] = useState(false);

  // Role Compare mode state
  const [compareRoleSearchQuery, setCompareRoleSearchQuery] = useState('');
  const [selectedCompareRoles, setSelectedCompareRoles] = useState<AzureRole[]>([]);
  const [compareRoleSearchResults, setCompareRoleSearchResults] = useState<AzureRole[]>([]);
  const [showCompareResults, setShowCompareResults] = useState(false);

  // Refs for click-outside detection
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const roleSearchDropdownRef = useRef<HTMLDivElement>(null);
  const compareRoleSearchDropdownRef = useRef<HTMLDivElement>(null);
  const advancedSearchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useClickOutside(serviceDropdownRef as React.RefObject<HTMLElement>, () => setShowServiceDropdown(false), showServiceDropdown);
  useClickOutside(roleSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    setRoleSearchResults([]);
    setShowRoleResults(false);
  }, roleSearchResults.length > 0);
  useClickOutside(compareRoleSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    setCompareRoleSearchResults([]);
  }, compareRoleSearchResults.length > 0);
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
        requestIdleCallback(() => preloadActionsCache(), { timeout: PERFORMANCE.IDLE_CALLBACK_TIMEOUT_MS });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => preloadActionsCache(), PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);
      }
    }, PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  // Load roles for Role Explorer, Role Compare, and Role Creator modes
  useEffect(() => {
    if (isRoleExplorerMode || isRoleCompareMode || isRoleCreatorMode) {
      const loadRoles = async () => {
        try {
          setIsLoading(true);
          const roles = await loadRoleDefinitions();
          // Only show built-in roles
          const builtInRoles = roles.filter(role => role.roleType === 'BuiltInRole');
          setAvailableRoles(builtInRoles);
          setIsLoading(false);
        } catch {
          setError('Failed to load role definitions. Please try again.');
          setIsLoading(false);
        }
      };
      loadRoles();
    }
  }, [isRoleExplorerMode, isRoleCompareMode, isRoleCreatorMode]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    // Role Explorer and Role Compare modes don't use form submission
    if (isRoleExplorerMode || isRoleCompareMode) {
      return;
    }

    let controlActions: string[] = [];
    let dataActions: string[] = [];
    let advancedLines: string[] = [];

    if (isSimpleMode) {
      if (selectedActions.length === 0) {
        setError('Please select at least one action');
        return;
      }
      controlActions = selectedActions.filter(a => a.planeType === 'control').map(a => a.name);
      dataActions = selectedActions.filter(a => a.planeType === 'data').map(a => a.name);
    } else {
      if (!actionsInput.trim()) {
        setError('Please enter at least one action');
        return;
      }
      advancedLines = actionsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (advancedLines.length === 0) {
        setError('Please enter at least one action');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!isSimpleMode) {
        const classified = await classifyActions(advancedLines);
        controlActions = classified.controlActions;
        dataActions = classified.dataActions;
      }

      const leastPrivilegedRoles = await calculateLeastPrivilege({
        requiredActions: controlActions,
        requiredDataActions: dataActions
      });

      setResults(leastPrivilegedRoles);

      if (leastPrivilegedRoles.length === 0) {
        setError('No roles found that grant all the specified permissions. Try fewer or more general actions.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      setError(errorMessage || 'Failed to calculate least privileged roles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isSimpleMode, isRoleExplorerMode, isRoleCompareMode, selectedActions, actionsInput]);

  const handleAddActionSimple = useCallback((action: SelectedAction | string) => {
    // Handle both SelectedAction objects (Azure) and strings (Entra ID compatibility)
    const actionObj: SelectedAction = typeof action === 'string'
      ? { name: action, planeType: 'control' }
      : action;

    // Check if action with same name and planeType is already selected
    const isAlreadySelected = selectedActions.some(
      a => a.name === actionObj.name && a.planeType === actionObj.planeType
    );
    if (!isAlreadySelected) {
      setSelectedActions(prev => [...prev, actionObj]);
    }
  }, [selectedActions]);

  const handleRemoveAction = useCallback((actionName: string) => {
    setSelectedActions(prev => prev.filter(a => a.name !== actionName));
  }, []);

  const handleLoadExample = useCallback(async (actions: readonly string[]) => {
    if (isSimpleMode) {
      const classified = await classifyActions([...actions]);
      const selectedWithPlaneType: SelectedAction[] = [
        ...classified.controlActions.map(name => ({ name, planeType: 'control' as const })),
        ...classified.dataActions.map(name => ({ name, planeType: 'data' as const })),
      ];
      setSelectedActions(selectedWithPlaneType);
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
    // Clear compare state
    setCompareRoleSearchQuery('');
    setSelectedCompareRoles([]);
    setCompareRoleSearchResults([]);
    setShowCompareResults(false);
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

  // Role Compare mode handlers
  const handleCompareRoleSearch = useCallback((query: string) => {
    setCompareRoleSearchQuery(query);

    if (!query.trim() || query.length < 2) {
      setCompareRoleSearchResults([]);
      return;
    }

    // Filter out already selected roles (max 2)
    const filteredRoles = availableRoles.filter(role =>
      !selectedCompareRoles.some(selected => selected.id === role.id)
    );

    // Use intelligent sorting: exact matches first, then starts with, then alphabetical
    const sortedResults = filterAndSortByQuery(
      filteredRoles,
      query,
      (role) => role.roleName,
      10
    );

    setCompareRoleSearchResults(sortedResults);
  }, [availableRoles, selectedCompareRoles]);

  const handleAddCompareRole = useCallback((role: AzureRole) => {
    if (selectedCompareRoles.length >= 2) {
      return; // Max 2 roles for comparison
    }
    setSelectedCompareRoles(prev => [...prev, role]);
    setCompareRoleSearchQuery('');
    setCompareRoleSearchResults([]);
  }, [selectedCompareRoles.length]);

  const handleRemoveCompareRole = useCallback((roleId: string) => {
    setSelectedCompareRoles(prev => prev.filter(r => r.id !== roleId));
    setShowCompareResults(false); // Hide results when a role is removed
  }, []);

  const handleCompareRoles = useCallback(() => {
    setError(null);

    if (selectedCompareRoles.length !== 2) {
      setError('Please select exactly 2 roles to compare');
      return;
    }

    setShowCompareResults(true);
  }, [selectedCompareRoles.length]);

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
        id: action.name,
        content: (
          <span className="flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
              action.planeType === 'data'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
            }`}>
              {action.planeType === 'data' ? 'D' : 'C'}
            </span>
            <span className="font-mono text-xs break-all">{action.name}</span>
          </span>
        ),
        removeAriaLabel: `Remove ${action.name}`
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

  const selectedCompareRoleChips = useMemo(
    () =>
      selectedCompareRoles.map((role, index) => ({
        id: role.id,
        content: (
          <span className="flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold ${
              index === 0
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
            }`}>
              {index + 1}
            </span>
            <span className="text-sm">{role.roleName}</span>
          </span>
        ),
        removeAriaLabel: `Remove ${role.roleName}`
      })),
    [selectedCompareRoles]
  );

  // Get mode-specific description from config
  const getDescription = () => {
    switch (inputMode) {
      case 'simple':
        return azureRbacConfig.descriptions.simple;
      case 'advanced':
        return azureRbacConfig.descriptions.advanced;
      case 'roleExplorer':
        return azureRbacConfig.descriptions.roleExplorer;
      case 'roleCompare':
        return azureRbacConfig.descriptions.roleCompare || azureRbacConfig.descriptions.simple;
      case 'roleCreator':
        return azureRbacConfig.descriptions.roleCreator || azureRbacConfig.descriptions.simple;
      default:
        return azureRbacConfig.descriptions.simple;
    }
  };

  return (
    <Layout
      title={azureRbacConfig.metadata.title}
      description={azureRbacConfig.metadata.description}
      keywords={azureRbacConfig.metadata.keywords}
      breadcrumbs={azureRbacConfig.metadata.breadcrumbs}
      toolSchema={{
        name: azureRbacConfig.metadata.toolSchemaName,
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            {azureRbacConfig.labels.categoryLabel}
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            {azureRbacConfig.labels.heroTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            {getDescription()}
          </p>
        </div>

        {/* Disclaimer Banner */}
        {!disclaimerDismissed && (
          <DisclaimerBanner config={azureRbacConfig} onDismiss={handleDismissDisclaimer} />
        )}

        {/* Mode Tabs */}
        <ModeTabs
          activeMode={inputMode}
          onModeChange={setInputMode}
          tabs={[
            { value: 'simple', label: 'Simple Mode' },
            { value: 'advanced', label: 'Advanced Mode' },
            { value: 'roleExplorer', label: 'Role Explorer' },
            { value: 'roleCompare', label: 'Role Compare' },
            { value: 'roleCreator', label: 'Role Creator' },
          ]}
        />

        {/* Role Creator Mode */}
        {inputMode === 'roleCreator' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <LoadingSpinner size="md" label="Loading Role Creator..." />
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
            {isSimpleMode && (
              <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
                <SimpleMode
                  config={azureRbacConfig}
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
                config={azureRbacConfig}
                actionsInput={actionsInput}
                onActionsInputChange={handleAdvancedSearch}
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
                  config={azureRbacConfig}
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

            {/* Role Compare Mode */}
            {isRoleCompareMode && (
              <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />}>
                <RoleCompareMode
                  config={azureRbacConfig}
                  roleSearchQuery={compareRoleSearchQuery}
                  onRoleSearchChange={handleCompareRoleSearch}
                  roleSearchResults={compareRoleSearchResults}
                  roleSearchDropdownRef={compareRoleSearchDropdownRef}
                  onAddRole={handleAddCompareRole as (role: GenericRole) => void}
                  selectedRoleChips={selectedCompareRoleChips}
                  onRemoveRole={handleRemoveCompareRole}
                  isLoading={isLoading}
                  onCompare={handleCompareRoles}
                  onClear={handleClear}
                  maxRoles={2}
                />
              </Suspense>
            )}

            {/* Submit Buttons (Simple & Advanced modes only) */}
            {!isRoleExplorerMode && !isRoleCompareMode && (
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
        )}

        {/* Loading State */}
        {isLoading && !isRoleCreatorMode && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <LoadingSpinner size="lg" label="Calculating least privileged roles..." />
          </div>
        )}

        {/* Error State */}
        {error && !isRoleCreatorMode && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        {/* Results for Simple & Advanced modes */}
        {!isLoading && !error && results.length > 0 && !isRoleExplorerMode && !isRoleCompareMode && !isRoleCreatorMode && (
          <RoleResultsTable results={results} roleSystem="azure" />
        )}

        {/* Results for Role Explorer mode */}
        {isRoleExplorerMode && showRoleResults && selectedRoles.length > 0 && !isLoading && (
          <RolePermissionsTable roles={selectedRoles} />
        )}

        {/* Results for Role Compare mode */}
        {isRoleCompareMode && showCompareResults && selectedCompareRoles.length === 2 && !isLoading && (
          <RoleComparisonTable roles={selectedCompareRoles as [AzureRole, AzureRole]} />
        )}

        {/* Example Scenarios (Simple & Advanced modes only, when no results) */}
        {results.length === 0 && !isLoading && !isRoleExplorerMode && !isRoleCompareMode && !isRoleCreatorMode && (
          <ExampleScenarios config={azureRbacConfig} onLoadExample={handleLoadExample} />
        )}
      </section>
    </Layout>
  );
}
