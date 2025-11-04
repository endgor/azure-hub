import type { AzureRole } from '@/types/rbac';
import { useRoleCreator } from '@/hooks/useRoleCreator';
import TemplateSelector from '@/components/TemplateSelector';
import RoleInformationSection from './RoleInformationSection';
import ImportRoleSection from './ImportRoleSection';
import PermissionsSection from './PermissionsSection';
import AboutCustomRoles from './AboutCustomRoles';
import Button from '@/components/shared/Button';

interface RoleCreatorProps {
  availableRoles: AzureRole[];
  onSearchActions: (query: string) => Promise<Array<{ name: string; description?: string }>>;
}

/**
 * RoleCreator - Create custom Azure RBAC roles
 *
 * Main orchestrator component that combines all role creation functionality:
 * - Load from templates
 * - Role information (name, description, scopes)
 * - Import permissions from built-in roles
 * - Manage permissions (actions, notActions, dataActions, notDataActions)
 * - Export to JSON for Azure deployment
 */
export default function RoleCreator({ availableRoles, onSearchActions }: RoleCreatorProps) {
  const {
    // State
    customRole,
    importedRoles,
    manuallyAddedActions,
    roleSearchQuery,
    roleDropdownItems,
    showRoleDropdown,
    actionSearchQuery,
    actionDropdownItems,
    showActionDropdown,
    activePermissionType,

    // Computed values
    totalPermissions,
    hasDuplicates,

    // Actions
    setCustomRole,
    setShowRoleDropdown,
    setShowActionDropdown,
    setActivePermissionType,
    handleLoadTemplate,
    handleRemoveImportedRole,
    handleRoleSearchChange,
    handleRoleSelect,
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
  } = useRoleCreator({ availableRoles, onSearchActions });

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <TemplateSelector onLoadTemplate={handleLoadTemplate} />

      {/* Role Information */}
      <RoleInformationSection
        customRole={customRole}
        onRoleNameChange={(name) => setCustomRole({ ...customRole, roleName: name })}
        onDescriptionChange={(description) => setCustomRole({ ...customRole, description })}
        onAddScope={handleAddScope}
        onRemoveScope={handleRemoveScope}
      />

      {/* Import from Built-in Role */}
      <ImportRoleSection
        roleSearchQuery={roleSearchQuery}
        roleDropdownItems={roleDropdownItems}
        showRoleDropdown={showRoleDropdown}
        importedRoles={importedRoles}
        onSearchChange={handleRoleSearchChange}
        onSelect={handleRoleSelect}
        onDropdownVisibilityChange={setShowRoleDropdown}
        onRemoveImportedRole={handleRemoveImportedRole}
      />

      {/* Permissions */}
      <PermissionsSection
        customRole={customRole}
        totalPermissions={totalPermissions}
        hasDuplicates={hasDuplicates}
        activePermissionType={activePermissionType}
        actionSearchQuery={actionSearchQuery}
        actionDropdownItems={actionDropdownItems}
        showActionDropdown={showActionDropdown}
        manuallyAddedActions={manuallyAddedActions}
        onPermissionTypeChange={setActivePermissionType}
        onActionSearchChange={handleActionSearchChange}
        onActionSelect={handleActionSelect}
        onActionDropdownVisibilityChange={setShowActionDropdown}
        onRemoveAction={handleRemoveAction}
        onMoveAction={handleMoveAction}
        onDeduplicate={handleDeduplicate}
        hasWildcard={hasWildcard}
        validateActionCategory={validateActionCategory}
      />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleExport}
          disabled={!customRole.roleName.trim() || totalPermissions === 0}
        >
          Export as JSON
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClear}
        >
          Clear All
        </Button>
      </div>

      {/* About Custom Roles Info */}
      <AboutCustomRoles />
    </div>
  );
}
