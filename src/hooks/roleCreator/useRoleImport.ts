import { useState, useCallback } from 'react';
import type { AzureRole } from '@/types/rbac';
import { filterAndSortByQuery } from '@/lib/searchUtils';

export interface ImportedRoleInfo {
  role: AzureRole;
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

export interface UseRoleImportProps {
  availableRoles: AzureRole[];
}

export interface UseRoleImportReturn {
  roleSearchQuery: string;
  roleSearchResults: AzureRole[];
  importedRoles: ImportedRoleInfo[];
  setRoleSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  handleRoleSearchChange: (query: string) => void;
  handleImportRole: (role: AzureRole) => ImportedRoleInfo | null;
  handleRemoveImportedRole: (roleId: string) => ImportedRoleInfo | null;
  clearRoleSearch: () => void;
}

/**
 * Hook for managing role import functionality.
 * Handles role search and tracking of imported roles.
 */
export function useRoleImport({ availableRoles }: UseRoleImportProps): UseRoleImportReturn {
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleSearchResults, setRoleSearchResults] = useState<AzureRole[]>([]);
  const [importedRoles, setImportedRoles] = useState<ImportedRoleInfo[]>([]);

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

  // Import a role and extract its permissions
  const handleImportRole = useCallback((role: AzureRole): ImportedRoleInfo | null => {
    // Check if role is already imported
    if (importedRoles.some(imported => imported.role.id === role.id)) {
      alert('This role has already been imported.');
      return null;
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

    // Create imported role info
    const importedRole: ImportedRoleInfo = {
      role,
      actions: roleActions,
      notActions: roleNotActions,
      dataActions: roleDataActions,
      notDataActions: roleNotDataActions
    };

    setImportedRoles([...importedRoles, importedRole]);
    setRoleSearchQuery('');
    setRoleSearchResults([]);

    return importedRole;
  }, [importedRoles]);

  // Remove an imported role
  const handleRemoveImportedRole = useCallback((roleId: string): ImportedRoleInfo | null => {
    const roleToRemove = importedRoles.find(imported => imported.role.id === roleId);
    if (!roleToRemove) return null;

    setImportedRoles(importedRoles.filter(imported => imported.role.id !== roleId));
    return roleToRemove;
  }, [importedRoles]);

  const clearRoleSearch = useCallback(() => {
    setRoleSearchQuery('');
    setRoleSearchResults([]);
  }, []);

  return {
    roleSearchQuery,
    roleSearchResults,
    importedRoles,
    setRoleSearchQuery,
    handleRoleSearchChange,
    handleImportRole,
    handleRemoveImportedRole,
    clearRoleSearch,
  };
}
