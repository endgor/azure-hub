import type { ImportedRoleInfo } from '@/hooks/useRoleCreator';
import SearchableDropdown, { type DropdownItem } from '@/components/SearchableDropdown';
import SelectionChips from '@/components/SelectionChips';
import { useMemo } from 'react';

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
  const importedRoleChips = useMemo(
    () =>
      importedRoles.map((imported) => ({
        id: imported.role.id,
        content: <span className="text-xs">{imported.role.roleName}</span>,
        removeAriaLabel: `Remove ${imported.role.roleName}`,
      })),
    [importedRoles]
  );

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

        <SelectionChips
          items={importedRoleChips}
          onRemove={onRemoveImportedRole}
        />
      </div>
    </div>
  );
}
