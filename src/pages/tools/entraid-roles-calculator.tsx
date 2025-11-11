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
import type { Operation, EntraIDRole, EntraIDLeastPrivilegeResult } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { PERFORMANCE } from '@/config/constants';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';
import { useClickOutside } from '@/hooks/useClickOutside';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorBox from '@/components/shared/ErrorBox';
import Button from '@/components/shared/Button';
import Link from 'next/link';
import RoleResultsTable from '@/components/RoleResultsTable';
import EntraIdRolePermissionsTable from '@/components/EntraIdRolePermissionsTable';

// Import config
import { entraIdConfig } from '@/lib/rbacConfig';

// Import shared config-driven components
import DisclaimerBanner from '@/components/shared/RbacCalculator/DisclaimerBanner';
import ExampleScenarios from '@/components/shared/RbacCalculator/ExampleScenarios';
import AdvancedMode from '@/components/shared/RbacCalculator/AdvancedMode';

// Lazy load larger components for bundle optimization
const SimpleMode = lazy(() => import('@/components/shared/RbacCalculator/SimpleMode'));
const RoleExplorerMode = lazy(() => import('@/components/shared/RbacCalculator/RoleExplorerMode'));
import type { GenericRole } from '@/components/shared/RbacCalculator/RoleExplorerMode';

type InputMode = 'simple' | 'advanced' | 'roleExplorer';

export default function EntraIdRolesCalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>('simple');
  const [actionsInput, setActionsInput] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [availableActions, setAvailableActions] = useState<Operation[]>([]);
  const [results, setResults] = useState<EntraIDLeastPrivilegeResult[]>([]);
  const [searchResults, setSearchResults] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorageBoolean('entraid-roles-disclaimer-dismissed', false);

  // Role Explorer mode state
  const [availableRoles, setAvailableRoles] = useState<EntraIDRole[]>([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<EntraIDRole[]>([]);
  const [roleSearchResults, setRoleSearchResults] = useState<EntraIDRole[]>([]);
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
  useClickOutside(roleSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    setRoleSearchResults([]);
    setShowRoleResults(false);
  }, roleSearchResults.length > 0);
  useClickOutside(advancedSearchDropdownRef as React.RefObject<HTMLElement>, () => {
    // Only hide the suggestions dropdown, don't clear the input
    setSearchResults([]);
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
    if (inputMode === 'roleExplorer') {
      const loadRoles = async () => {
        try {
          setIsLoading(true);
          const roles = await loadEntraIDRoles();
          // Only show built-in roles
          const builtInRoles = roles.filter(role => role.isBuiltIn);
          setAvailableRoles(builtInRoles);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to load Entra ID roles:', err);
          setError('Failed to load Entra ID role definitions. Please try again.');
          setIsLoading(false);
        }
      };
      loadRoles();
    }
  }, [inputMode]);

  // Lazy load services/namespaces only when Simple mode is active
  useEffect(() => {
    if (inputMode !== 'simple') {
      return;
    }

    const loadServices = async () => {
      try {
        setIsLoadingServices(true);
        const namespaces = await getEntraIDNamespaces();
        setAvailableServices(namespaces);
      } catch (err) {
        console.error('Failed to load namespaces:', err);
      } finally {
        setIsLoadingServices(false);
      }
    };

    // Clear services when changing mode
    setAvailableServices([]);
    setSelectedService('');
    setAvailableActions([]);

    loadServices();
  }, [inputMode]);

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedService) {
        setAvailableActions([]);
        return;
      }

      setIsLoadingActions(true);
      try {
        // Entra ID returns string[], convert to Operation[] for consistency
        const actionNames = await getEntraIDActionsByNamespace(selectedService);
        const operations: Operation[] = actionNames.map(name => ({
          name,
          displayName: name.split('/').pop() || name,
          description: '',
          provider: name.split('/')[0] || '',
        }));
        setAvailableActions(operations);
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
          setError('No Entra ID roles data found. Please run "npm run fetch-entraid-roles" to download role definitions from Microsoft Graph API. See docs/ENTRAID_ROLES_SETUP.md for setup instructions.');
        } else {
          setError('No Entra ID roles found that grant all the specified permissions. Try fewer or more general permissions.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Entra ID roles')) {
        setError('Entra ID roles data not available. Run "npm run fetch-entraid-roles" to fetch role definitions. See docs/ENTRAID_ROLES_SETUP.md for setup.');
      } else {
        setError('Failed to calculate least privileged roles. Please try again.');
      }
      console.error('Error calculating roles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [inputMode, selectedActions, actionsInput]);

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
      // Entra ID search
      const actionNames = await searchEntraIDActions(trimmedLine);
      const operations: Operation[] = actionNames.slice(0, 10).map(name => ({
        name,
        displayName: name.split('/').pop() || name,
        description: '',
        provider: name.split('/')[0] || '',
      }));
      setSearchResults(operations);
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

        {/* Cross-link to Azure RBAC */}
        {entraIdConfig.crossLink && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Looking for Azure resource roles?</strong>{' '}
              <Link href={entraIdConfig.crossLink.url} className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline">
                {entraIdConfig.crossLink.text}
              </Link>
            </p>
          </div>
        )}

        {/* Mode Tabs (Simple, Advanced, Role Explorer only) */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            {(['simple', 'advanced', 'roleExplorer'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                  inputMode === mode
                    ? 'border-sky-500 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {mode === 'simple' && 'Simple Mode'}
                {mode === 'advanced' && 'Advanced Mode'}
                {mode === 'roleExplorer' && 'Role Explorer'}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Simple Mode */}
          {inputMode === 'simple' && (
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
              config={entraIdConfig}
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
        {!isLoading && !error && results.length > 0 && inputMode !== 'roleExplorer' && (
          <RoleResultsTable results={results} roleSystem="entraid" />
        )}

        {/* Results for Role Explorer mode */}
        {inputMode === 'roleExplorer' && showRoleResults && selectedRoles.length > 0 && !isLoading && (
          <EntraIdRolePermissionsTable roles={selectedRoles} />
        )}

        {/* Example Scenarios (Simple & Advanced modes only, when no results) */}
        {results.length === 0 && !isLoading && inputMode !== 'roleExplorer' && (
          <ExampleScenarios config={entraIdConfig} onLoadExample={handleLoadExample} />
        )}
      </section>
    </Layout>
  );
}
