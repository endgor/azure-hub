import { RefObject } from 'react';
import type { AzureRole } from '@/types/rbac';
import SelectionChips, { type SelectionChip } from '@/components/SelectionChips';
import SearchInput from '@/components/shared/SearchInput';

interface RoleExplorerModeProps {
  roleSearchQuery: string;
  onRoleSearchChange: (query: string) => void;
  roleSearchResults: AzureRole[];
  roleSearchDropdownRef: RefObject<HTMLDivElement | null>;
  onAddRole: (role: AzureRole) => void;
  selectedRoleChips: SelectionChip[];
  onRemoveRole: (roleId: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onClear: () => void;
}

/**
 * RoleExplorerMode - Explore and compare built-in Azure roles
 *
 * Search for and select multiple roles to view their combined permissions.
 */
export default function RoleExplorerMode({
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
}: RoleExplorerModeProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2" ref={roleSearchDropdownRef}>
        <label
          htmlFor="role-search"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Search for Azure Built-in Roles
        </label>
        <SearchInput
          type="text"
          id="role-search"
          value={roleSearchQuery}
          onChange={(e) => onRoleSearchChange(e.target.value)}
          placeholder="Type to search for roles (e.g., Contributor, Reader, Owner)"
          maxWidth="full"
        />

        {/* Dropdown results */}
        {roleSearchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-60 overflow-y-auto">
            {roleSearchResults.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onAddRole(role)}
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

      <SelectionChips
        heading="Selected Roles"
        items={selectedRoleChips}
        onRemove={onRemoveRole}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || selectedRoleChips.length === 0}
          className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border dark:border-[#363638] dark:bg-slate-800 dark:text-[#0A84FF] dark:hover:border-[#0A84FF]/30 dark:hover:bg-[#0A84FF]/10"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
