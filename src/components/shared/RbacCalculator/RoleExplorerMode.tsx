import { RefObject } from 'react';
import type { RoleSystemConfig } from '@/lib/rbacConfig';
import SelectionChips, { type SelectionChip } from '@/components/SelectionChips';
import SearchInput from '@/components/shared/SearchInput';
import Button from '@/components/shared/Button';

/**
 * Generic role type that supports both Azure RBAC and Entra ID roles
 */
export type GenericRole = {
  id: string;
  roleName?: string;      // Azure RBAC uses roleName
  displayName?: string;   // Entra ID uses displayName
  description?: string;
};

interface RoleExplorerModeProps<T extends GenericRole> {
  /** Configuration for role system-specific labels and text */
  config: RoleSystemConfig;

  roleSearchQuery: string;
  onRoleSearchChange: (query: string) => void;
  roleSearchResults: T[];
  roleSearchDropdownRef: RefObject<HTMLDivElement | null>;
  onAddRole: (role: T) => void;
  selectedRoleChips: SelectionChip[];
  onRemoveRole: (roleId: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onClear: () => void;
}

/**
 * RoleExplorerMode - Explore and compare built-in roles
 *
 * Config-driven generic component that supports both Azure RBAC and Entra ID roles.
 * Search for and select multiple roles to view their combined permissions.
 */
export default function RoleExplorerMode<T extends GenericRole>({
  config,
  roleSearchQuery,
  onRoleSearchChange,
  roleSearchResults,
  roleSearchDropdownRef,
  onAddRole,
  selectedRoleChips,
  onRemoveRole,
  isLoading,
  onGenerate,
  onClear,
}: RoleExplorerModeProps<T>) {
  /**
   * Get the display name for a role, supporting both Azure (roleName) and Entra ID (displayName)
   */
  const getRoleName = (role: T): string => {
    return role.roleName || role.displayName || 'Unnamed Role';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 relative" ref={roleSearchDropdownRef}>
        <label
          htmlFor="role-search"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {config.labels.roleExplorerTitle}
        </label>
        <SearchInput
          type="text"
          id="role-search"
          value={roleSearchQuery}
          onChange={(e) => onRoleSearchChange(e.target.value)}
          placeholder={config.labels.roleExplorerPlaceholder}
          maxWidth="full"
        />

        {/* Dropdown results */}
        {roleSearchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-60 overflow-y-auto">
            {roleSearchResults.map((role) => (
              <Button
                key={role.id}
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => onAddRole(role)}
                className="text-left justify-start px-4 py-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0 rounded-none shadow-none"
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="text-sm text-slate-900 dark:text-slate-100">
                    {getRoleName(role)}
                  </div>
                  {role.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {role.description}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      <SelectionChips
        heading="Selected Roles"
        items={selectedRoleChips}
        onRemove={onRemoveRole}
      />

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || selectedRoleChips.length === 0}
        >
          Generate
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
