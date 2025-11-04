import type { ImportedRoleInfo } from '@/hooks/useRoleCreator';
import SearchableDropdown, { type DropdownItem } from '@/components/SearchableDropdown';

interface ImportRoleSectionProps {
  roleSearchQuery: string;
  roleDropdownItems: DropdownItem[];
  showRoleDropdown: boolean;
  importedRoles: ImportedRoleInfo[];
  onSearchChange: (query: string) => void;
  onSelect: (item: DropdownItem) => void;
  onDropdownVisibilityChange: (visible: boolean) => void;
  onRemoveImportedRole: (roleId: string) => void;
}

/**
 * Import Role Section - Import permissions from built-in Azure roles
 *
 * Allows searching for and importing permissions from existing Azure roles.
 * Displays imported roles with option to remove them.
 */
export default function ImportRoleSection({
  roleSearchQuery,
  roleDropdownItems,
  showRoleDropdown,
  importedRoles,
  onSearchChange,
  onSelect,
  onDropdownVisibilityChange,
  onRemoveImportedRole,
}: ImportRoleSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Import from Built-in Role
      </h2>

      <div className="space-y-3">
        <SearchableDropdown
          value={roleSearchQuery}
          onChange={onSearchChange}
          onSelect={onSelect}
          items={roleDropdownItems}
          showDropdown={showRoleDropdown}
          onDropdownVisibilityChange={onDropdownVisibilityChange}
          placeholder="Search for a built-in role (e.g., Storage Blob Data Contributor)"
        />

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
                        onClick={() => onRemoveImportedRole(imported.role.id)}
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
  );
}
