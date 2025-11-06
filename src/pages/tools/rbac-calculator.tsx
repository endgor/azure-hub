import { useState, useCallback, useEffect, FormEvent, useRef, useMemo, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import RoleResultsTable from '@/components/RoleResultsTable';
import RolePermissionsTable from '@/components/RolePermissionsTable';
import { calculateLeastPrivilege, searchOperations, getServiceNamespaces, getActionsByService, preloadActionsCache, loadRoleDefinitions } from '@/lib/clientRbacService';
import {
  calculateLeastPrivilegeEntraID,
  searchEntraIDActions,
  getEntraIDNamespaces,
  getEntraIDActionsByNamespace,
  preloadEntraIDActionsCache
} from '@/lib/entraIdRbacService';
import type { LeastPrivilegeResult, Operation, AzureRole, RoleSystemType, EntraIDLeastPrivilegeResult } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { PERFORMANCE } from '@/config/constants';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';
import { useClickOutside } from '@/hooks/useClickOutside';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import Button from '@/components/shared/Button';

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
  const [roleSystemType, setRoleSystemType] = useState<RoleSystemType>('azure');
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
  const [entraIdResults, setEntraIdResults] = useState<EntraIDLeastPrivilegeResult[]>([]);
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

  // Track textarea cursor position for advanced mode
  const advancedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for click-outside detection
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const roleSearchDropdownRef = useRef<HTMLDivElement>(null);
  const advancedSearchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useClickOutside(serviceDropdownRef as React.RefObject<HTMLElement>, () => setShowServiceDropdown(false), showServiceDropdown);
  useClickOutside(roleSearchDropdownRef as React.RefObject<HTMLElement>, () => setRoleSearchResults([]), roleSearchResults.length > 0);
  useClickOutside(advancedSearchDropdownRef as React.RefObject<HTMLElement>, () => setSearchResults([]), searchResults.length > 0);

  const handleDismissDisclaimer = () => {
    setDisclaimerDismissed(true);
  };

  // Defer actions cache preload to idle time (non-blocking)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const preloadFn = roleSystemType === 'azure' ? preloadActionsCache : preloadEntraIDActionsCache;
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadFn(), { timeout: PERFORMANCE.IDLE_CALLBACK_TIMEOUT_MS });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => preloadFn(), PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);
      }
    }, PERFORMANCE.IDLE_CALLBACK_FALLBACK_MS);

    return () => clearTimeout(timeoutId);
  }, [roleSystemType]);

  // Switch to simple mode when switching to Entra ID (Role Explorer/Creator not supported yet)
  useEffect(() => {
    if (roleSystemType === 'entraid' && (inputMode === 'roleExplorer' || inputMode === 'roleCreator')) {
      setInputMode('simple');
    }
  }, [roleSystemType, inputMode]);

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
    if (inputMode !== 'simple') {
      return;
    }

    const loadServices = async () => {
      try {
        setIsLoadingServices(true);
        const services = roleSystemType === 'azure'
          ? await getServiceNamespaces()
          : await getEntraIDNamespaces();
        setAvailableServices(services);
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    };

    // Clear services when switching role system type
    setAvailableServices([]);
    setSelectedService('');
    setAvailableActions([]);

    loadServices();
  }, [inputMode, roleSystemType]);

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedService) {
        setAvailableActions([]);
        return;
      }

      setIsLoadingActions(true);
      try {
        if (roleSystemType === 'azure') {
          const actions = await getActionsByService(selectedService);
          setAvailableActions(actions);
        } else {
          // Entra ID returns string[], convert to Operation[] for consistency
          const actionNames = await getEntraIDActionsByNamespace(selectedService);
          const operations: Operation[] = actionNames.map(name => ({
            name,
            displayName: name.split('/').pop() || name,
            description: '',
            provider: name.split('/')[0] || '',
          }));
          setAvailableActions(operations);
        }
      } catch (err) {
        console.error('Failed to load actions:', err);
        setAvailableActions([]);
      } finally {
        setIsLoadingActions(false);
      }
    };
    loadActions();
  }, [selectedService, roleSystemType]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setEntraIdResults([]);

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
      if (roleSystemType === 'azure') {
        const leastPrivilegedRoles = await calculateLeastPrivilege({
          requiredActions: actions,
          requiredDataActions: []
        });

        setResults(leastPrivilegedRoles);
        setEntraIdResults([]);

        if (leastPrivilegedRoles.length === 0) {
          setError('No roles found that grant all the specified permissions. Try fewer or more general actions.');
        }
      } else {
        const leastPrivilegedRoles = await calculateLeastPrivilegeEntraID({
          requiredActions: actions
        });

        setEntraIdResults(leastPrivilegedRoles);
        setResults([]);

        if (leastPrivilegedRoles.length === 0) {
          setError('No Entra ID roles data found. Please run "npm run fetch-entraid-roles" to download role definitions from Microsoft Graph API. See docs/ENTRAID_ROLES_SETUP.md for setup instructions.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (roleSystemType === 'entraid' && errorMessage.includes('Entra ID roles')) {
        setError('Entra ID roles data not available. Run "npm run fetch-entraid-roles" to fetch role definitions. See docs/ENTRAID_ROLES_SETUP.md for setup.');
      } else {
        setError('Failed to calculate least privileged roles. Please try again.');
      }
      console.error('Error calculating roles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [inputMode, selectedActions, actionsInput, roleSystemType]);

  const handleAdvancedSearch = useCallback(async (query: string) => {
    setActionsInput(query);

    // Get the current line being edited based on cursor position
    const textarea = advancedTextareaRef.current;
    if (!textarea) {
      setSearchResults([]);
      return;
    }

    const cursorPosition = textarea.selectionStart;
    const lines = query.split('\n');
    let charCount = 0;
    let currentLineText = '';

    // Find which line the cursor is on
    for (const line of lines) {
      if (cursorPosition <= charCount + line.length) {
        currentLineText = line;
        break;
      }
      charCount += line.length + 1; // +1 for newline character
    }

    // Only search based on the current line
    const trimmedLine = currentLineText.trim();
    if (trimmedLine.length < 3 || trimmedLine.startsWith('#')) {
      setSearchResults([]);
      return;
    }

    try {
      if (roleSystemType === 'azure') {
        const operations = await searchOperations(trimmedLine);
        setSearchResults(operations.slice(0, 10));
      } else {
        // Entra ID search
        const actionNames = await searchEntraIDActions(trimmedLine);
        const operations: Operation[] = actionNames.slice(0, 10).map(name => ({
          name,
          displayName: name.split('/').pop() || name,
          description: '',
          provider: name.split('/')[0] || '',
        }));
        setSearchResults(operations);
      }
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
    }
  }, [roleSystemType]);

  const handleAddActionSimple = useCallback((action: string) => {
    if (!selectedActions.includes(action)) {
      setSelectedActions(prev => [...prev, action]);
    }
  }, [selectedActions]);

  const handleRemoveAction = useCallback((action: string) => {
    setSelectedActions(prev => prev.filter(a => a !== action));
  }, []);

  const handleAddActionAdvanced = useCallback((action: string) => {
    const textarea = advancedTextareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const lines = actionsInput.split('\n');
    let charCount = 0;
    let currentLineIndex = 0;

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      if (cursorPosition <= charCount + lines[i].length) {
        currentLineIndex = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline character
    }

    // Replace the current line with the selected action
    const newLines = [...lines];
    newLines[currentLineIndex] = action;
    const newText = newLines.join('\n');
    setActionsInput(newText);
    setSearchResults([]);

    // Move cursor to the end of the replaced line
    setTimeout(() => {
      if (textarea) {
        const newCursorPosition = newLines.slice(0, currentLineIndex).join('\n').length +
                                   (currentLineIndex > 0 ? 1 : 0) +
                                   action.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
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
    setEntraIdResults([]);
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

  // Dynamic description based on active mode
  const getDescription = () => {
    switch (inputMode) {
      case 'simple':
      case 'advanced':
        return 'Find the least privileged Azure RBAC roles for your required permissions. Enter Azure resource provider actions and discover which built-in roles grant those permissions without excessive access.';
      case 'roleExplorer':
        return 'Search and explore Azure built-in RBAC roles by name. View detailed permissions, compare multiple roles side-by-side, and export role definitions for documentation or analysis.';
      case 'roleCreator':
        return 'Build custom Azure RBAC roles tailored to your security requirements. Select specific permissions from built-in roles, define assignable scopes, and export role definitions ready for deployment.';
      default:
        return 'Find the least privileged Azure RBAC roles for your required permissions.';
    }
  };

  return (
    <Layout
      title="Azure RBAC Calculator & Role Generator"
      description="Find the least privileged Azure RBAC roles and generate custom role definitions for your required permissions using Azure Hub's RBAC calculator and role generator."
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'RBAC Calculator', url: 'https://azurehub.org/tools/rbac-calculator/' }
      ]}
      toolSchema={{
        name: 'Azure RBAC Calculator & Role Generator',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Identity & Access
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            Azure RBAC Calculator & Role Generator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            {getDescription()}
          </p>
        </div>

        {/* Disclaimer Banner */}
        {!disclaimerDismissed && (
          <DisclaimerBanner onDismiss={handleDismissDisclaimer} />
        )}

        {/* Role System Type Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Role System:
          </label>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1">
            <button
              type="button"
              onClick={() => setRoleSystemType('azure')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                roleSystemType === 'azure'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Azure RBAC
            </button>
            <button
              type="button"
              onClick={() => setRoleSystemType('entraid')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                roleSystemType === 'entraid'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Entra ID Roles
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            {roleSystemType === 'azure'
              ? 'Azure RBAC roles control access to Azure resources (VMs, storage, etc.)'
              : 'Entra ID roles control access to directory objects (users, groups, applications)'}
          </p>
        </div>

        {/* Mode Tabs */}
        <ModeTabs activeMode={inputMode} onModeChange={setInputMode} />

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
                textareaRef={advancedTextareaRef}
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
                <Button
                  type="submit"
                  disabled={isLoading || (inputMode === 'simple' ? selectedActions.length === 0 : !actionsInput.trim())}
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
        {isLoading && inputMode !== 'roleCreator' && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <LoadingSpinner size="lg" label="Calculating least privileged roles..." />
          </div>
        )}

        {/* Error State */}
        {error && inputMode !== 'roleCreator' && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        {/* Results for Simple & Advanced modes - Azure RBAC */}
        {!isLoading && !error && roleSystemType === 'azure' && results.length > 0 && inputMode !== 'roleExplorer' && inputMode !== 'roleCreator' && (
          <RoleResultsTable results={results} />
        )}

        {/* Results for Simple & Advanced modes - Entra ID */}
        {!isLoading && !error && roleSystemType === 'entraid' && entraIdResults.length > 0 && inputMode !== 'roleExplorer' && inputMode !== 'roleCreator' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Entra ID Role Results
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Found {entraIdResults.length} role{entraIdResults.length !== 1 ? 's' : ''} that grant the specified permissions.
              </p>
              <div className="space-y-3">
                {entraIdResults.map((result, index) => (
                  <div key={result.role.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {index + 1}. {result.role.displayName}
                          {result.isExactMatch && (
                            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                              Exact Match
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {result.role.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {result.permissionCount} permission{result.permissionCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="text-sm text-sky-600 dark:text-sky-400 cursor-pointer hover:underline">
                        View matching actions ({result.matchingActions.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400 pl-4">
                        {result.matchingActions.map(action => (
                          <li key={action} className="list-disc">{action}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results for Role Explorer mode */}
        {inputMode === 'roleExplorer' && showRoleResults && selectedRoles.length > 0 && !isLoading && (
          <RolePermissionsTable roles={selectedRoles} />
        )}

        {/* Example Scenarios (Simple & Advanced modes only, when no results) */}
        {results.length === 0 && entraIdResults.length === 0 && !isLoading && inputMode !== 'roleExplorer' && inputMode !== 'roleCreator' && (
          <ExampleScenarios onLoadExample={handleLoadExample} />
        )}
      </section>
    </Layout>
  );
}
