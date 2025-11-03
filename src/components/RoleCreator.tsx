import { useState, useCallback, useEffect } from 'react';
import type { AzureRole } from '@/types/rbac';
import { RBAC_TEMPLATES, getTemplateCategories, type RbacTemplate } from '@/lib/rbacTemplates';
import { filterAndSortByQuery } from '@/lib/searchUtils';

interface CustomRoleDefinition {
  roleName: string;
  description: string;
  assignableScopes: string[];
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

interface ImportedRoleInfo {
  role: AzureRole;
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

interface RoleCreatorProps {
  availableRoles: AzureRole[];
  onSearchActions: (query: string) => Promise<Array<{ name: string; description?: string }>>;
}

export default function RoleCreator({ availableRoles, onSearchActions }: RoleCreatorProps) {
  const [customRole, setCustomRole] = useState<CustomRoleDefinition>({
    roleName: '',
    description: '',
    assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000'],
    actions: [],
    notActions: [],
    dataActions: [],
    notDataActions: []
  });

  const [showScopeWarning, setShowScopeWarning] = useState(true);

  // Template state
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showTemplateBanner, setShowTemplateBanner] = useState(true);

  // Load template banner preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('rbac-template-banner-dismissed');
    if (dismissed === 'true') {
      setShowTemplateBanner(false);
    }
  }, []);

  const handleDismissTemplateBanner = () => {
    setShowTemplateBanner(false);
    localStorage.setItem('rbac-template-banner-dismissed', 'true');
  };

  const handleShowTemplateBanner = () => {
    setShowTemplateBanner(true);
    localStorage.setItem('rbac-template-banner-dismissed', 'false');
  };

  const handleLoadTemplate = useCallback((template: RbacTemplate) => {
    // Clear existing permissions and load template cleanly
    const newManuallyAddedActions = new Set<string>();
    template.actions.forEach(action => newManuallyAddedActions.add(action));
    if (template.dataActions) {
      template.dataActions.forEach(action => newManuallyAddedActions.add(action));
    }

    setCustomRole({
      roleName: template.name,
      description: template.description,
      assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000'],
      actions: template.actions,
      notActions: template.notActions || [],
      dataActions: template.dataActions || [],
      notDataActions: template.notDataActions || []
    });
    setImportedRoles([]);
    setManuallyAddedActions(newManuallyAddedActions);
    setShowTemplateDropdown(false);
  }, []);

  // Helper function to check if an action contains a wildcard
  const hasWildcard = (action: string): boolean => {
    return action.includes('*');
  };

  // Validate if an action is likely misclassified
  // DataActions typically involve data access operations (e.g., blob read/write, queue messages)
  // Actions are control plane operations (e.g., resource management)
  const validateActionCategory = (action: string, category: 'actions' | 'dataActions'): { isValid: boolean; suggestion?: string } => {
    const isLikelyDataAction = action.includes('/blobs/') ||
                               action.includes('/containers/') ||
                               action.includes('/messages/') ||
                               action.includes('/files/') ||
                               action.includes('/fileshares/') ||
                               action.includes('/queues/') ||
                               action.includes('/tables/');

    if (category === 'dataActions' && !isLikelyDataAction) {
      return {
        isValid: false,
        suggestion: 'This looks like a control plane action. Consider moving to "actions".'
      };
    }

    if (category === 'actions' && isLikelyDataAction) {
      return {
        isValid: false,
        suggestion: 'This looks like a data plane action. Consider moving to "dataActions".'
      };
    }

    return { isValid: true };
  };

  const [importedRoles, setImportedRoles] = useState<ImportedRoleInfo[]>([]);
  const [manuallyAddedActions, setManuallyAddedActions] = useState<Set<string>>(new Set());
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleSearchResults, setRoleSearchResults] = useState<AzureRole[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSearchResults, setActionSearchResults] = useState<Array<{ name: string; description?: string }>>([]);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [activePermissionType, setActivePermissionType] = useState<'actions' | 'notActions' | 'dataActions' | 'notDataActions'>('actions');

  const [scopeInput, setScopeInput] = useState('');

  // Handle role search
  const handleRoleSearch = useCallback((query: string) => {
    setRoleSearchQuery(query);

    if (!query.trim() || query.length < 2) {
      setRoleSearchResults([]);
      setShowRoleDropdown(false);
      return;
    }

    // Use intelligent sorting: exact matches first, then starts with, then alphabetical
    const results = filterAndSortByQuery(
      availableRoles,
      query,
      (role) => role.roleName,
      10
    );

    setRoleSearchResults(results);
    setShowRoleDropdown(true);
  }, [availableRoles]);

  // Import actions from selected built-in role
  const handleImportFromRole = useCallback((role: AzureRole) => {
    // Check if role is already imported
    if (importedRoles.some(imported => imported.role.id === role.id)) {
      alert('This role has already been imported.');
      return;
    }

    // Collect all permissions from this role
    const roleActions: string[] = [];
    const roleNotActions: string[] = [];
    const roleDataActions: string[] = [];
    const roleNotDataActions: string[] = [];

    role.permissions.forEach(permission => {
      roleActions.push(...permission.actions);
      roleNotActions.push(...permission.notActions);
      roleDataActions.push(...(permission.dataActions || []));
      roleNotDataActions.push(...(permission.notDataActions || []));
    });

    // Add to imported roles tracking
    const importedRole: ImportedRoleInfo = {
      role,
      actions: roleActions,
      notActions: roleNotActions,
      dataActions: roleDataActions,
      notDataActions: roleNotDataActions
    };

    setImportedRoles([...importedRoles, importedRole]);

    // Merge with existing permissions
    const newActions = new Set([...customRole.actions, ...roleActions]);
    const newNotActions = new Set([...customRole.notActions, ...roleNotActions]);
    const newDataActions = new Set([...customRole.dataActions, ...roleDataActions]);
    const newNotDataActions = new Set([...customRole.notDataActions, ...roleNotDataActions]);

    // Convert sets to sorted arrays (removes duplicates automatically)
    setCustomRole({
      ...customRole,
      actions: Array.from(newActions).sort(),
      notActions: Array.from(newNotActions).sort(),
      dataActions: Array.from(newDataActions).sort(),
      notDataActions: Array.from(newNotDataActions).sort()
    });

    setRoleSearchQuery('');
    setRoleSearchResults([]);
    setShowRoleDropdown(false);
  }, [customRole, importedRoles]);

  // Remove an imported role and its actions
  const handleRemoveImportedRole = useCallback((roleId: string) => {
    const roleToRemove = importedRoles.find(imported => imported.role.id === roleId);
    if (!roleToRemove) return;

    // Remove the role from imported list
    setImportedRoles(importedRoles.filter(imported => imported.role.id !== roleId));

    // Remove the role's actions from custom role
    setCustomRole({
      ...customRole,
      actions: customRole.actions.filter(action => !roleToRemove.actions.includes(action)),
      notActions: customRole.notActions.filter(action => !roleToRemove.notActions.includes(action)),
      dataActions: customRole.dataActions.filter(action => !roleToRemove.dataActions.includes(action)),
      notDataActions: customRole.notDataActions.filter(action => !roleToRemove.notDataActions.includes(action))
    });
  }, [customRole, importedRoles]);

  // Handle action search
  const handleActionSearch = useCallback(async (query: string) => {
    setActionSearchQuery(query);

    if (!query.trim() || query.length < 3) {
      setActionSearchResults([]);
      setShowActionDropdown(false);
      return;
    }

    try {
      const results = await onSearchActions(query);
      setActionSearchResults(results.slice(0, 10));
      setShowActionDropdown(true);
    } catch (err) {
      console.error('Action search failed:', err);
      setActionSearchResults([]);
    }
  }, [onSearchActions]);

  // Add action to selected permission type
  const handleAddAction = useCallback((actionName: string) => {
    const key = activePermissionType;
    if (!customRole[key].includes(actionName)) {
      setCustomRole({
        ...customRole,
        [key]: [...customRole[key], actionName]
      });
      // Mark as manually added
      const newManuallyAdded = new Set(manuallyAddedActions);
      newManuallyAdded.add(actionName);
      setManuallyAddedActions(newManuallyAdded);
    }
    setActionSearchQuery('');
    setActionSearchResults([]);
    setShowActionDropdown(false);
  }, [customRole, activePermissionType, manuallyAddedActions]);

  // Remove action from list
  const handleRemoveAction = useCallback((actionName: string, type: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => {
    setCustomRole({
      ...customRole,
      [type]: customRole[type].filter(a => a !== actionName)
    });
    // Remove from manually added tracking if present
    const newManuallyAdded = new Set(manuallyAddedActions);
    newManuallyAdded.delete(actionName);
    setManuallyAddedActions(newManuallyAdded);
  }, [customRole, manuallyAddedActions]);

  // Move action between categories
  const handleMoveAction = useCallback((actionName: string, fromType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>, toType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => {
    // Check if action already exists in target category
    if (customRole[toType].includes(actionName)) {
      // Just remove from source, don't add to target
      setCustomRole({
        ...customRole,
        [fromType]: customRole[fromType].filter(a => a !== actionName)
      });
    } else {
      setCustomRole({
        ...customRole,
        [fromType]: customRole[fromType].filter(a => a !== actionName),
        [toType]: [...customRole[toType], actionName]
      });
    }
  }, [customRole]);

  // Add assignable scope
  const handleAddScope = useCallback(() => {
    if (scopeInput.trim() && !customRole.assignableScopes.includes(scopeInput.trim())) {
      // Remove placeholder if it exists when adding a real scope
      const newScopes = customRole.assignableScopes.filter(
        s => !s.includes('00000000-0000-0000-0000-000000000000')
      );
      setCustomRole({
        ...customRole,
        assignableScopes: [...newScopes, scopeInput.trim()]
      });
      setScopeInput('');
    }
  }, [scopeInput, customRole]);

  // Remove assignable scope
  const handleRemoveScope = useCallback((scope: string) => {
    const newScopes = customRole.assignableScopes.filter(s => s !== scope);

    // If no scopes remain, add back the placeholder
    if (newScopes.length === 0) {
      setCustomRole({
        ...customRole,
        assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000']
      });
    } else {
      setCustomRole({
        ...customRole,
        assignableScopes: newScopes
      });
    }
  }, [customRole]);

  // Export to JSON
  const handleExport = useCallback(() => {
    if (!customRole.roleName.trim()) {
      alert('Please provide a role name before exporting');
      return;
    }

    // Check if placeholder subscription is still being used
    const hasPlaceholder = customRole.assignableScopes.some(scope =>
      scope.includes('00000000-0000-0000-0000-000000000000')
    );

    if (hasPlaceholder) {
      const proceed = confirm(
        '⚠️ Placeholder Subscription Detected\n\n' +
        'Your assignable scopes contain a placeholder subscription ID (00000000-0000-0000-0000-000000000000).\n\n' +
        'Azure Portal will require you to update this with your actual subscription ID before you can save the role definition.\n\n' +
        'Do you want to export anyway?'
      );
      if (!proceed) return;
    }

    // Check for validation issues (only for manually added actions)
    const validationIssues: string[] = [];

    customRole.actions.forEach(action => {
      if (manuallyAddedActions.has(action)) {
        const validation = validateActionCategory(action, 'actions');
        if (!validation.isValid) {
          validationIssues.push(`"${action}" in actions might be misclassified`);
        }
      }
    });

    customRole.dataActions.forEach(action => {
      if (manuallyAddedActions.has(action)) {
        const validation = validateActionCategory(action, 'dataActions');
        if (!validation.isValid) {
          validationIssues.push(`"${action}" in dataActions might be misclassified`);
        }
      }
    });

    if (validationIssues.length > 0) {
      const proceed = confirm(
        `⚠️ Validation Warning:\n\n${validationIssues.slice(0, 5).join('\n')}${validationIssues.length > 5 ? `\n\n...and ${validationIssues.length - 5} more issues` : ''}\n\nThese may cause Azure validation errors. Do you want to export anyway?`
      );
      if (!proceed) return;
    }

    const exportData = {
      properties: {
        roleName: customRole.roleName,
        description: customRole.description,
        assignableScopes: customRole.assignableScopes,
        permissions: [
          {
            actions: customRole.actions,
            notActions: customRole.notActions,
            dataActions: customRole.dataActions,
            notDataActions: customRole.notDataActions
          }
        ]
      }
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filename = `${customRole.roleName.replace(/[^a-zA-Z0-9-_]/g, '_')}_custom_role.json`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }, [customRole, manuallyAddedActions]);

  // Deduplicate all actions
  const handleDeduplicate = useCallback(() => {
    setCustomRole({
      ...customRole,
      actions: Array.from(new Set(customRole.actions)).sort(),
      notActions: Array.from(new Set(customRole.notActions)).sort(),
      dataActions: Array.from(new Set(customRole.dataActions)).sort(),
      notDataActions: Array.from(new Set(customRole.notDataActions)).sort()
    });
  }, [customRole]);

  // Clear all
  const handleClear = useCallback(() => {
    setCustomRole({
      roleName: '',
      description: '',
      assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000'],
      actions: [],
      notActions: [],
      dataActions: [],
      notDataActions: []
    });
    setImportedRoles([]);
    setManuallyAddedActions(new Set());
    setRoleSearchQuery('');
    setActionSearchQuery('');
    setScopeInput('');
  }, []);

  const totalPermissions = customRole.actions.length + customRole.notActions.length +
                          customRole.dataActions.length + customRole.notDataActions.length;

  // Check for duplicates
  const hasDuplicates =
    customRole.actions.length !== new Set(customRole.actions).size ||
    customRole.notActions.length !== new Set(customRole.notActions).size ||
    customRole.dataActions.length !== new Set(customRole.dataActions).size ||
    customRole.notDataActions.length !== new Set(customRole.notDataActions).size;

  return (
    <div className="space-y-6">
      {/* Template Selector Banner */}
      {showTemplateBanner ? (
        <div className="relative rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/30">
          <button
            onClick={handleDismissTemplateBanner}
            className="absolute right-3 top-3 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            aria-label="Dismiss templates"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  Quick Start Templates
                </h3>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Load predefined permission sets for common Azure scenarios that don&apos;t have dedicated built-in roles.
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                onBlur={() => setTimeout(() => setShowTemplateDropdown(false), 200)}
                className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Load Template
                <svg className={`h-4 w-4 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTemplateDropdown && (
                <div className="absolute right-0 z-20 mt-2 w-[500px] rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="max-h-[600px] overflow-y-auto">
                    {getTemplateCategories().map((category) => {
                      const templates = RBAC_TEMPLATES.filter(t => t.category === category);
                      return (
                        <div key={category} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <div className="bg-slate-50 px-4 py-2 dark:bg-slate-800/50">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                              {category}
                            </h4>
                          </div>
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleLoadTemplate(template)}
                              className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-0 dark:border-slate-800 dark:hover:bg-sky-900/20"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-medium text-slate-900 dark:text-slate-100">
                                    {template.name}
                                  </h5>
                                  <span className="shrink-0 text-xs font-medium text-sky-600 dark:text-sky-400">
                                    {template.actions.length} actions
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {template.description}
                                </p>
                                {template.notes && (
                                  <p className="text-xs text-slate-500 dark:text-slate-500">
                                    <strong>Note:</strong> {template.notes}
                                  </p>
                                )}
                                {template.sourceUrl && (
                                  <a
                                    href={template.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View Microsoft docs
                                  </a>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleShowTemplateBanner}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Show Role Templates
          </button>
        </div>
      )}

      {/* Role Information Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Role Information
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="role-name"
              value={customRole.roleName}
              onChange={(e) => setCustomRole({ ...customRole, roleName: e.target.value })}
              placeholder="My Custom Role"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label htmlFor="role-description" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Description
            </label>
            <textarea
              id="role-description"
              value={customRole.description}
              onChange={(e) => setCustomRole({ ...customRole, description: e.target.value })}
              placeholder="Describe what this role can do..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label htmlFor="assignable-scopes" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Assignable Scopes <span className="text-rose-500">*</span>
            </label>

            {/* Info Banner - Only show if placeholder exists and not manually dismissed */}
            {showScopeWarning && customRole.assignableScopes.some(scope => scope.includes('00000000-0000-0000-0000-000000000000')) && (
              <div className="relative mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 pr-10 text-xs text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300">
                <button
                  onClick={() => setShowScopeWarning(false)}
                  className="absolute right-2 top-2 rounded-lg p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  aria-label="Dismiss warning"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="font-semibold mb-1">⚠️ Required: Replace the placeholder subscription ID</p>
                <p className="mb-2">Azure Portal requires valid assignable scopes to save your custom role. Update the placeholder with your actual subscription ID(s).</p>
                <div className="space-y-1 font-mono text-xs">
                  <p className="text-blue-700 dark:text-blue-300">Valid scope formats:</p>
                  <p>• /subscriptions/{'{subscriptionId}'}</p>
                  <p>• /subscriptions/{'{subscriptionId}'}/resourceGroups/{'{resourceGroup}'}</p>
                  <p>• /providers/Microsoft.Management/managementGroups/{'{groupId}'}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                id="assignable-scopes"
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddScope();
                  }
                }}
                placeholder="/subscriptions/{subscriptionId}"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAddScope}
                className="rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                Add
              </button>
            </div>

            {customRole.assignableScopes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customRole.assignableScopes.map((scope) => {
                  const isPlaceholder = scope.includes('00000000-0000-0000-0000-000000000000');
                  return (
                    <div
                      key={scope}
                      className={`flex items-center gap-2 rounded-md border px-3 py-1 ${
                        isPlaceholder
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {isPlaceholder && (
                        <span
                          className="text-amber-600 dark:text-amber-400 cursor-help"
                          title="This is a placeholder. Replace with your actual subscription ID."
                        >
                          ⚠️
                        </span>
                      )}
                      <span className={`font-mono text-xs ${
                        isPlaceholder
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {scope}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveScope(scope)}
                        className={
                          isPlaceholder
                            ? 'text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }
                        aria-label={`Remove ${scope}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import from Built-in Role Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Import from Built-in Role
        </h2>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={roleSearchQuery}
              onChange={(e) => handleRoleSearch(e.target.value)}
              onFocus={() => roleSearchResults.length > 0 && setShowRoleDropdown(true)}
              onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
              placeholder="Search for a built-in role (e.g., Storage Blob Data Contributor)"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-sky-500 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z" />
              </svg>
            </div>

            {showRoleDropdown && roleSearchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-60 overflow-y-auto">
                {roleSearchResults.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleImportFromRole(role)}
                    className="w-full text-left px-4 py-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {role.roleName}
                    </div>
                    {role.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {role.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {importedRoles.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Imported Roles ({importedRoles.length})
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="space-y-2">
                  {importedRoles.map((imported) => {
                    const totalActions =
                      imported.actions.length +
                      imported.notActions.length +
                      imported.dataActions.length +
                      imported.notDataActions.length;

                    return (
                      <div
                        key={imported.role.id}
                        className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-400/30 dark:bg-emerald-500/10"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                            {imported.role.roleName}
                          </div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {totalActions} permission{totalActions !== 1 ? 's' : ''} imported
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImportedRole(imported.role.id)}
                          className="ml-2 shrink-0 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400"
                          aria-label={`Remove ${imported.role.roleName}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Permissions ({totalPermissions})
          </h2>
        </div>

        {/* Duplicate Warning */}
        {hasDuplicates && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                <span className="text-sm text-amber-800 dark:text-amber-300">
                  Duplicate permissions detected. Click to remove duplicates.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDeduplicate}
                className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                Remove Duplicates
              </button>
            </div>
          </div>
        )}

        {/* Permission Type Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['actions', 'notActions', 'dataActions', 'notDataActions'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActivePermissionType(type)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium transition ${
                activePermissionType === type
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {type} ({customRole[type].length})
            </button>
          ))}
        </div>

        {/* Action Search */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={actionSearchQuery}
              onChange={(e) => handleActionSearch(e.target.value)}
              onFocus={() => actionSearchResults.length > 0 && setShowActionDropdown(true)}
              onBlur={() => setTimeout(() => setShowActionDropdown(false), 200)}
              placeholder={`Search and add to ${activePermissionType} (e.g., Microsoft.Storage)`}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-sky-500 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z" />
              </svg>
            </div>

            {showActionDropdown && actionSearchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-60 overflow-y-auto">
                {actionSearchResults.map((action) => (
                  <button
                    key={action.name}
                    type="button"
                    onClick={() => handleAddAction(action.name)}
                    className="w-full text-left px-4 py-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="font-mono text-sm text-sky-600 dark:text-sky-400">
                      {action.name}
                    </div>
                    {action.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {action.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Permissions List */}
          {customRole[activePermissionType].length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="space-y-2">
                {customRole[activePermissionType].map((action) => {
                  const isWildcard = hasWildcard(action);
                  const isManuallyAdded = manuallyAddedActions.has(action);
                  // Only validate manually added actions (imported actions from built-in roles are already correctly categorized)
                  const validation = (activePermissionType === 'actions' || activePermissionType === 'dataActions') && isManuallyAdded
                    ? validateActionCategory(action, activePermissionType)
                    : { isValid: true };

                  return (
                    <div key={action}>
                      <div
                        className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                          isWildcard
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isWildcard && (
                            <span
                              className="shrink-0 text-amber-600 dark:text-amber-400 cursor-help"
                              title="Wildcard permission: Grants broader access to multiple operations. Use with caution as it may grant more permissions than needed."
                            >
                              ⚠️
                            </span>
                          )}
                          <span className={`font-mono text-xs break-all ${
                            isWildcard
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {action}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {!validation.isValid && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetType = activePermissionType === 'actions' ? 'dataActions' : 'actions';
                                handleMoveAction(action, activePermissionType, targetType);
                              }}
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                              title={validation.suggestion}
                            >
                              Move
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(action, activePermissionType)}
                            className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                            aria-label={`Remove ${action}`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {!validation.isValid && (
                        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 pl-3">
                          💡 {validation.suggestion}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              No {activePermissionType} added yet. Search and add permissions above.
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={!customRole.roleName.trim() || totalPermissions === 0}
          className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export as JSON
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear All
        </button>
      </div>

      {/* About Custom Roles Info - Permanent */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/30 dark:bg-blue-500/10">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
          About Custom Roles
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-blue-800 dark:text-blue-200">
          <li><strong>Actions</strong>: Control plane operations (management operations)</li>
          <li><strong>NotActions</strong>: Exclude specific actions from a wildcard grant</li>
          <li><strong>DataActions</strong>: Data plane operations (data access)</li>
          <li><strong>NotDataActions</strong>: Exclude specific data actions</li>
          <li>
            <span className="inline-flex items-center gap-1">
              Wildcards <span className="text-amber-600 dark:text-amber-400">⚠️</span> like <code className="rounded bg-blue-100 px-1 py-0.5 font-mono dark:bg-blue-900/40">Microsoft.Storage/*</code> grant broader permissions - use with caution
            </span>
          </li>
          <li>The exported JSON can be used with Azure CLI, PowerShell, or ARM templates to create the custom role</li>
          <li><strong>⚠️ Important:</strong> Always verify the generated role definition and test it in a non-production environment before deploying to production. You are using this tool at your own risk.</li>
        </ul>
      </div>

    </div>
  );
}
