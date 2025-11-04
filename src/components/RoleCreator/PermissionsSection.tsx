import type { CustomRoleDefinition } from '@/hooks/useRoleCreator';
import SearchableDropdown, { type DropdownItem } from '@/components/SearchableDropdown';
import PermissionBadge from '@/components/PermissionBadge';

interface PermissionsSectionProps {
  customRole: CustomRoleDefinition;
  totalPermissions: number;
  hasDuplicates: boolean;
  activePermissionType: 'actions' | 'notActions' | 'dataActions' | 'notDataActions';
  actionSearchQuery: string;
  actionDropdownItems: DropdownItem[];
  showActionDropdown: boolean;
  manuallyAddedActions: Set<string>;
  onPermissionTypeChange: (type: 'actions' | 'notActions' | 'dataActions' | 'notDataActions') => void;
  onActionSearchChange: (query: string) => void;
  onActionSelect: (item: DropdownItem) => void;
  onActionDropdownVisibilityChange: (visible: boolean) => void;
  onRemoveAction: (actionName: string, type: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => void;
  onMoveAction: (actionName: string, fromType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>, toType: keyof Pick<CustomRoleDefinition, 'actions' | 'notActions' | 'dataActions' | 'notDataActions'>) => void;
  onDeduplicate: () => void;
  hasWildcard: (action: string) => boolean;
  validateActionCategory: (action: string, category: 'actions' | 'dataActions') => { isValid: boolean; suggestion?: string };
}

/**
 * Permissions Section - Manage role permissions
 *
 * Displays tabs for different permission types (actions, notActions, dataActions, notDataActions).
 * Allows searching, adding, removing, and moving permissions between categories.
 */
export default function PermissionsSection({
  customRole,
  totalPermissions,
  hasDuplicates,
  activePermissionType,
  actionSearchQuery,
  actionDropdownItems,
  showActionDropdown,
  manuallyAddedActions,
  onPermissionTypeChange,
  onActionSearchChange,
  onActionSelect,
  onActionDropdownVisibilityChange,
  onRemoveAction,
  onMoveAction,
  onDeduplicate,
  hasWildcard,
  validateActionCategory,
}: PermissionsSectionProps) {
  return (
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
              onClick={onDeduplicate}
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
            onClick={() => onPermissionTypeChange(type)}
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
        <SearchableDropdown
          value={actionSearchQuery}
          onChange={onActionSearchChange}
          onSelect={onActionSelect}
          items={actionDropdownItems}
          showDropdown={showActionDropdown}
          onDropdownVisibilityChange={onActionDropdownVisibilityChange}
          placeholder={`Search and add to ${activePermissionType} (e.g., Microsoft.Storage)`}
          formatLabel={(item) => (
            <span className="font-mono text-xs text-sky-600 dark:text-sky-400">
              {item.label}
            </span>
          )}
        />

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
                  <PermissionBadge
                    key={action}
                    action={action}
                    hasWildcard={isWildcard}
                    validation={validation}
                    onMove={() => {
                      const targetType = activePermissionType === 'actions' ? 'dataActions' : 'actions';
                      onMoveAction(action, activePermissionType, targetType);
                    }}
                    onRemove={() => onRemoveAction(action, activePermissionType)}
                    showMoveButton={activePermissionType === 'actions' || activePermissionType === 'dataActions'}
                  />
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
  );
}
