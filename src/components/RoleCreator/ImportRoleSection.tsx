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
    <div className="rounded-xl bg-white p-6 dark:bg-slate-900">
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
          <div className="flex flex-wrap gap-2">
            {importedRoles.map((imported) => (
              <span
                key={imported.role.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {imported.role.roleName}
                <button
                  type="button"
                  onClick={() => onRemoveImportedRole(imported.role.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={`Remove ${imported.role.roleName}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
