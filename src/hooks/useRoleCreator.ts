import { useState, useCallback, useMemo } from 'react';
import type { AzureRole } from '@/types/rbac';
import type { RbacTemplate } from '@/lib/rbacTemplates';
import type { DropdownItem } from '@/components/SearchableDropdown';
import { mergePermissionBuckets, dedupePermissionBuckets, filterPermissionBuckets } from '@/lib/utils/permissionMerger';

// Import extracted sub-hooks
import { useRoleImport } from './roleCreator/useRoleImport';
import type { ImportedRoleInfo } from './roleCreator/useRoleImport';
import { useActionSearch } from './roleCreator/useActionSearch';
import { useScopeManagement } from './roleCreator/useScopeManagement';

// Import extracted pure functions
import { hasWildcard, validateActionCategory } from '@/lib/roleCreator/validation';
import { exportRoleDefinition, type CustomRoleDefinition } from '@/lib/roleCreator/export';

// Re-export types for consumers
export type { ImportedRoleInfo, CustomRoleDefinition };

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
  // Custom role definition state
  const [customRole, setCustomRole] = useState<CustomRoleDefinition>({
    roleName: '',
    description: '',
    assignableScopes: ['/subscriptions/00000000-0000-0000-0000-000000000000'],
    actions: [],
    notActions: [],
    dataActions: [],
    notDataActions: []
  });

  // Manually added actions tracking
  const [manuallyAddedActions, setManuallyAddedActions] = useState<Set<string>>(new Set());

  // UI state
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [activePermissionType, setActivePermissionType] = useState<'actions' | 'notActions' | 'dataActions' | 'notDataActions'>('actions');

  // Use extracted sub-hooks
  const roleImport = useRoleImport({ availableRoles });
  const actionSearch = useActionSearch({ onSearch: onSearchActions });
  const scopeManagement = useScopeManagement({
    scopes: customRole.assignableScopes,
    onScopesChange: (scopes) => setCustomRole({ ...customRole, assignableScopes: scopes })
  });

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
    setManuallyAddedActions(newManuallyAddedActions);
  }, []);

  // Import actions from selected built-in role
  const handleImportFromRole = useCallback((role: AzureRole) => {
    const importedRole = roleImport.handleImportRole(role);
    if (!importedRole) return;

    // Merge with existing permissions using utility function
    const mergedPermissions = mergePermissionBuckets(
      {
        actions: customRole.actions,
        notActions: customRole.notActions,
        dataActions: customRole.dataActions,
        notDataActions: customRole.notDataActions
      },
      {
        actions: importedRole.actions,
        notActions: importedRole.notActions,
        dataActions: importedRole.dataActions,
        notDataActions: importedRole.notDataActions
      }
    );

    setCustomRole({
      ...customRole,
      ...mergedPermissions
    });

    setShowRoleDropdown(false);
  }, [customRole, roleImport]);

  // Remove an imported role and its actions
  const handleRemoveImportedRole = useCallback((roleId: string) => {
    const roleToRemove = roleImport.handleRemoveImportedRole(roleId);
    if (!roleToRemove) return;

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
  }, [customRole, roleImport]);

  // Handle role search - delegate to sub-hook
  const handleRoleSearchChange = useCallback((query: string) => {
    roleImport.handleRoleSearchChange(query);
  }, [roleImport]);

  // Handle role selection from dropdown
  const handleRoleSelect = useCallback((item: DropdownItem) => {
    const role = availableRoles.find(r => r.id === item.id);
    if (role) {
      handleImportFromRole(role);
    }
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
    actionSearch.clearActionSearch();
    setShowActionDropdown(false);
  }, [customRole, activePermissionType, manuallyAddedActions, actionSearch]);

  // Handle action search - delegate to sub-hook
  const handleActionSearchChange = useCallback(async (query: string) => {
    await actionSearch.handleActionSearchChange(query);
  }, [actionSearch]);

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

  // Scope management - delegate to sub-hook
  const handleAddScope = useCallback((scope: string) => {
    scopeManagement.handleAddScope(scope);
  }, [scopeManagement]);

  const handleRemoveScope = useCallback((scope: string) => {
    scopeManagement.handleRemoveScope(scope);
  }, [scopeManagement]);

  // Export to JSON - use pure function
  const handleExport = useCallback(() => {
    exportRoleDefinition({
      customRole,
      manuallyAddedActions
    });
  }, [customRole, manuallyAddedActions]);

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
    setManuallyAddedActions(new Set());
    roleImport.clearRoleSearch();
    actionSearch.clearActionSearch();
  }, [roleImport, actionSearch]);

  // Convert to DropdownItems
  const roleDropdownItems: DropdownItem[] = useMemo(() =>
    roleImport.roleSearchResults.map(role => ({
      id: role.id,
      label: role.roleName,
      description: role.description
    })),
    [roleImport.roleSearchResults]
  );

  const actionDropdownItems: DropdownItem[] = useMemo(() =>
    actionSearch.actionSearchResults.map(action => ({
      id: action.name,
      label: action.name,
      description: action.description
    })),
    [actionSearch.actionSearchResults]
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
    importedRoles: roleImport.importedRoles,
    manuallyAddedActions,
    roleSearchQuery: roleImport.roleSearchQuery,
    roleSearchResults: roleImport.roleSearchResults,
    showRoleDropdown,
    actionSearchQuery: actionSearch.actionSearchQuery,
    actionSearchResults: actionSearch.actionSearchResults,
    showActionDropdown,
    activePermissionType,

    // Computed values
    totalPermissions,
    hasDuplicates,
    roleDropdownItems,
    actionDropdownItems,

    // Actions
    setCustomRole,
    setRoleSearchQuery: roleImport.setRoleSearchQuery,
    setShowRoleDropdown,
    setActionSearchQuery: actionSearch.setActionSearchQuery,
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
