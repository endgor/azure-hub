import { useState, useCallback, useMemo } from 'react';
import type { AzureRole } from '@/types/rbac';
import type { RbacTemplate } from '@/lib/rbacTemplates';
import { filterAndSortByQuery } from '@/lib/searchUtils';
import { downloadJSON } from '@/lib/downloadUtils';
import { generateNameFilename } from '@/lib/filenameUtils';
import type { DropdownItem } from '@/components/SearchableDropdown';
import { mergePermissionBuckets, dedupePermissionBuckets, filterPermissionBuckets } from '@/lib/utils/permissionMerger';

export interface CustomRoleDefinition {
  roleName: string;
  description: string;
  assignableScopes: string[];
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

export interface ImportedRoleInfo {
  role: AzureRole;
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

export interface UseRoleCreatorProps {
  availableRoles: AzureRole[];
  onSearchActions: (query: string) => Promise<Array<{ name: string; description?: string }>>;
}

export interface UseRoleCreatorReturn {
  // State
  customRole: CustomRoleDefinition;
  importedRoles: ImportedRoleInfo[];
  manuallyAddedActions: Set<string>;
  roleSearchQuery: string;
  roleSearchResults: AzureRole[];
  showRoleDropdown: boolean;
  actionSearchQuery: string;
  actionSearchResults: Array<{ name: string; description?: string }>;
  showActionDropdown: boolean;
  activePermissionType: 'actions' | 'notActions' | 'dataActions' | 'notDataActions';

  // Computed values
  totalPermissions: number;
  hasDuplicates: boolean;
  roleDropdownItems: DropdownItem[];
  actionDropdownItems: DropdownItem[];

  // Actions
  setCustomRole: React.Dispatch<React.SetStateAction<CustomRoleDefinition>>;
  setRoleSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowRoleDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  setActionSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowActionDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  setActivePermissionType: React.Dispatch<React.SetStateAction<'actions' | 'notActions' | 'dataActions' | 'notDataActions'>>;
  handleLoadTemplate: (template: RbacTemplate) => void;
  handleImportFromRole: (role: AzureRole) => void;
  handleRemoveImportedRole: (roleId: string) => void;
  handleRoleSearchChange: (query: string) => void;
  handleRoleSelect: (item: DropdownItem) => void;
  handleAddAction: (actionName: string) => void;
  handleRemoveAction: (actionName: string, type: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => void;
  handleMoveAction: (actionName: string, fromType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>, toType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => void;
  handleActionSearchChange: (query: string) => void;
  handleActionSelect: (item: DropdownItem) => void;
  handleAddScope: (scope: string) => void;
  handleRemoveScope: (scope: string) => void;
  handleExport: () => void;
  handleDeduplicate: () => void;
  handleClear: () => void;
  validateActionCategory: (action: string, category: 'actions' | 'dataActions') => { isValid: boolean; suggestion?: string };
  hasWildcard: (action: string) => boolean;
}

/**
 * Custom hook for managing custom Azure role creation state and logic
 *
 * Handles:
 * - Custom role definition state
 * - Role import from built-in roles
 * - Permission management (actions, notActions, dataActions, notDataActions)
 * - Action search and validation
 * - Scope management
 * - Export to JSON
 */
export function useRoleCreator({ availableRoles, onSearchActions }: UseRoleCreatorProps): UseRoleCreatorReturn {
  const [customRole, setCustomRole] = useState<CustomRoleDefinition>({
    roleName: '',
    description: '',
    assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000'],
    actions: [],
    notActions: [],
    dataActions: [],
    notDataActions: []
  });

  const [importedRoles, setImportedRoles] = useState<ImportedRoleInfo[]>([]);
  const [manuallyAddedActions, setManuallyAddedActions] = useState<Set<string>>(new Set());

  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleSearchResults, setRoleSearchResults] = useState<AzureRole[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSearchResults, setActionSearchResults] = useState<Array<{ name: string; description?: string }>>([]);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [activePermissionType, setActivePermissionType] = useState<'actions' | 'notActions' | 'dataActions' | 'notDataActions'>('actions');

  // Helper function to check if an action contains a wildcard
  const hasWildcard = useCallback((action: string): boolean => {
    return action.includes('*');
  }, []);

  // Validate if an action is likely misclassified
  // DataActions typically involve data access operations (e.g., blob read/write, queue messages)
  // Actions are control plane operations (e.g., resource management)
  const validateActionCategory = useCallback((action: string, category: 'actions' | 'dataActions'): { isValid: boolean; suggestion?: string } => {
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
  }, []);

  // Load a template
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
  }, []);

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

    // Merge with existing permissions using utility function
    const mergedPermissions = mergePermissionBuckets(
      {
        actions: customRole.actions,
        notActions: customRole.notActions,
        dataActions: customRole.dataActions,
        notDataActions: customRole.notDataActions
      },
      {
        actions: roleActions,
        notActions: roleNotActions,
        dataActions: roleDataActions,
        notDataActions: roleNotDataActions
      }
    );

    setCustomRole({
      ...customRole,
      ...mergedPermissions
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

    // Remove the role's actions from custom role using utility function
    const filteredPermissions = filterPermissionBuckets(
      {
        actions: customRole.actions,
        notActions: customRole.notActions,
        dataActions: customRole.dataActions,
        notDataActions: customRole.notDataActions
      },
      {
        actions: roleToRemove.actions,
        notActions: roleToRemove.notActions,
        dataActions: roleToRemove.dataActions,
        notDataActions: roleToRemove.notDataActions
      }
    );

    setCustomRole({
      ...customRole,
      ...filteredPermissions
    });
  }, [customRole, importedRoles]);

  // Handle role search
  const handleRoleSearchChange = useCallback((query: string) => {
    setRoleSearchQuery(query);

    if (!query.trim() || query.length < 2) {
      setRoleSearchResults([]);
      return;
    }

    const results = filterAndSortByQuery(
      availableRoles,
      query,
      (role) => role.roleName,
      10
    );

    setRoleSearchResults(results);
  }, [availableRoles]);

  // Handle role selection from dropdown
  const handleRoleSelect = useCallback((item: DropdownItem) => {
    const role = availableRoles.find(r => r.id === item.id);
    if (role) {
      handleImportFromRole(role);
    }
    setRoleSearchQuery('');
    setRoleSearchResults([]);
  }, [availableRoles, handleImportFromRole]);

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

  // Handle action search
  const handleActionSearchChange = useCallback(async (query: string) => {
    setActionSearchQuery(query);

    if (!query.trim() || query.length < 3) {
      setActionSearchResults([]);
      return;
    }

    try {
      const results = await onSearchActions(query);
      setActionSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('Action search failed:', err);
      setActionSearchResults([]);
    }
  }, [onSearchActions]);

  // Handle action selection from dropdown
  const handleActionSelect = useCallback((item: DropdownItem) => {
    handleAddAction(item.id);
  }, [handleAddAction]);

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
  const handleAddScope = useCallback((scope: string) => {
    if (scope && !customRole.assignableScopes.includes(scope)) {
      // Remove placeholder if it exists when adding a real scope
      const newScopes = customRole.assignableScopes.filter(
        s => !s.includes('00000000-0000-0000-0000-000000000000')
      );
      setCustomRole({
        ...customRole,
        assignableScopes: [...newScopes, scope]
      });
    }
  }, [customRole]);

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
    const filename = generateNameFilename(customRole.roleName, 'json', 'custom_role');
    downloadJSON(jsonContent, filename);
  }, [customRole, manuallyAddedActions, validateActionCategory]);

  // Deduplicate all actions using utility function
  const handleDeduplicate = useCallback(() => {
    const dedupedPermissions = dedupePermissionBuckets({
      actions: customRole.actions,
      notActions: customRole.notActions,
      dataActions: customRole.dataActions,
      notDataActions: customRole.notDataActions
    });

    setCustomRole({
      ...customRole,
      ...dedupedPermissions
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
  }, []);

  // Convert to DropdownItems
  const roleDropdownItems: DropdownItem[] = useMemo(() =>
    roleSearchResults.map(role => ({
      id: role.id,
      label: role.roleName,
      description: role.description
    })),
    [roleSearchResults]
  );

  const actionDropdownItems: DropdownItem[] = useMemo(() =>
    actionSearchResults.map(action => ({
      id: action.name,
      label: action.name,
      description: action.description
    })),
    [actionSearchResults]
  );

  // Computed values (memoized for performance)
  const totalPermissions = useMemo(() =>
    customRole.actions.length + customRole.notActions.length +
    customRole.dataActions.length + customRole.notDataActions.length,
    [customRole.actions.length, customRole.notActions.length,
     customRole.dataActions.length, customRole.notDataActions.length]
  );

  // Check for duplicates (memoized for performance)
  const hasDuplicates = useMemo(() =>
    customRole.actions.length !== new Set(customRole.actions).size ||
    customRole.notActions.length !== new Set(customRole.notActions).size ||
    customRole.dataActions.length !== new Set(customRole.dataActions).size ||
    customRole.notDataActions.length !== new Set(customRole.notDataActions).size,
    [customRole.actions, customRole.notActions, customRole.dataActions, customRole.notDataActions]
  );

  return {
    // State
    customRole,
    importedRoles,
    manuallyAddedActions,
    roleSearchQuery,
    roleSearchResults,
    showRoleDropdown,
    actionSearchQuery,
    actionSearchResults,
    showActionDropdown,
    activePermissionType,

    // Computed values
    totalPermissions,
    hasDuplicates,
    roleDropdownItems,
    actionDropdownItems,

    // Actions
    setCustomRole,
    setRoleSearchQuery,
    setShowRoleDropdown,
    setActionSearchQuery,
    setShowActionDropdown,
    setActivePermissionType,
    handleLoadTemplate,
    handleImportFromRole,
    handleRemoveImportedRole,
    handleRoleSearchChange,
    handleRoleSelect,
    handleAddAction,
    handleRemoveAction,
    handleMoveAction,
    handleActionSearchChange,
    handleActionSelect,
    handleAddScope,
    handleRemoveScope,
    handleExport,
    handleDeduplicate,
    handleClear,
    validateActionCategory,
    hasWildcard,
  };
}
