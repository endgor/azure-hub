import { useMemo } from 'react';
import type { AzureRole } from '@/types/rbac';
import { getFlattenedPermissions } from '@/lib/utils/permissionFlattener';
import { isPrivilegedRole } from '@/config/privilegedRoles';

interface RoleComparisonTableProps {
  roles: [AzureRole, AzureRole];
}

interface PermissionComparison {
  permission: string;
  inRole1: boolean;
  inRole2: boolean;
  isShared: boolean;
}

/**
 * RoleComparisonTable - Side-by-side comparison of two Azure RBAC roles
 *
 * Displays permissions from both roles in ascending order with visual indicators
 * showing which permissions are unique to each role and which are shared.
 */
export default function RoleComparisonTable({ roles }: RoleComparisonTableProps) {
  const [role1, role2] = roles;

  // Get flattened permissions for both roles
  const role1Permissions = useMemo(() => getFlattenedPermissions(role1), [role1]);
  const role2Permissions = useMemo(() => getFlattenedPermissions(role2), [role2]);

  // Compare actions (control plane)
  const actionsComparison = useMemo((): PermissionComparison[] => {
    const role1Actions = new Set(role1Permissions.actions);
    const role2Actions = new Set(role2Permissions.actions);
    const allActions = new Set([...role1Actions, ...role2Actions]);

    return Array.from(allActions)
      .sort((a, b) => a.localeCompare(b))
      .map(permission => ({
        permission,
        inRole1: role1Actions.has(permission),
        inRole2: role2Actions.has(permission),
        isShared: role1Actions.has(permission) && role2Actions.has(permission),
      }));
  }, [role1Permissions.actions, role2Permissions.actions]);

  // Compare data actions
  const dataActionsComparison = useMemo((): PermissionComparison[] => {
    const role1DataActions = new Set(role1Permissions.dataActions);
    const role2DataActions = new Set(role2Permissions.dataActions);
    const allDataActions = new Set([...role1DataActions, ...role2DataActions]);

    return Array.from(allDataActions)
      .sort((a, b) => a.localeCompare(b))
      .map(permission => ({
        permission,
        inRole1: role1DataActions.has(permission),
        inRole2: role2DataActions.has(permission),
        isShared: role1DataActions.has(permission) && role2DataActions.has(permission),
      }));
  }, [role1Permissions.dataActions, role2Permissions.dataActions]);

  // Calculate stats
  const stats = useMemo(() => {
    const sharedActions = actionsComparison.filter(a => a.isShared).length;
    const role1OnlyActions = actionsComparison.filter(a => a.inRole1 && !a.inRole2).length;
    const role2OnlyActions = actionsComparison.filter(a => a.inRole2 && !a.inRole1).length;

    const sharedDataActions = dataActionsComparison.filter(a => a.isShared).length;
    const role1OnlyDataActions = dataActionsComparison.filter(a => a.inRole1 && !a.inRole2).length;
    const role2OnlyDataActions = dataActionsComparison.filter(a => a.inRole2 && !a.inRole1).length;

    return {
      sharedActions,
      role1OnlyActions,
      role2OnlyActions,
      sharedDataActions,
      role1OnlyDataActions,
      role2OnlyDataActions,
      totalActions: actionsComparison.length,
      totalDataActions: dataActionsComparison.length,
    };
  }, [actionsComparison, dataActionsComparison]);

  const isRole1Privileged = isPrivilegedRole(role1.roleName);
  const isRole2Privileged = isPrivilegedRole(role2.roleName);

  // Check for wildcard permissions
  const role1HasWildcard = role1Permissions.actions.includes('*');
  const role2HasWildcard = role2Permissions.actions.includes('*');
  const hasWildcardPermissions = role1HasWildcard || role2HasWildcard;

  return (
    <div className="space-y-6">
      {/* Header with role names */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Role Comparison
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Comparing permissions between two roles
          </p>
        </div>
      </div>

      {/* Role headers */}
      <div className="grid grid-cols-2 gap-4">
        <RoleHeader role={role1} isPrivileged={isRole1Privileged} />
        <RoleHeader role={role2} isPrivileged={isRole2Privileged} />
      </div>

      {/* Statistics Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Comparison Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400">
              Shared: <strong className="text-slate-900 dark:text-slate-100">{stats.sharedActions + stats.sharedDataActions}</strong> permissions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-sky-500"></span>
            <span className="text-slate-600 dark:text-slate-400">
              {role1.roleName} only: <strong className="text-slate-900 dark:text-slate-100">{stats.role1OnlyActions + stats.role1OnlyDataActions}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-violet-500"></span>
            <span className="text-slate-600 dark:text-slate-400">
              {role2.roleName} only: <strong className="text-slate-900 dark:text-slate-100">{stats.role2OnlyActions + stats.role2OnlyDataActions}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Wildcard Permission Notice */}
      {hasWildcardPermissions && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/30 dark:bg-sky-500/10">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                Wildcard Permissions Detected
              </h3>
              <div className="text-sm text-sky-800 dark:text-sky-200">
                {role1HasWildcard && role2HasWildcard ? (
                  <p>Both <strong>{role1.roleName}</strong> and <strong>{role2.roleName}</strong> have wildcard (*) permissions, which grant full access to all Azure control plane operations at the assigned scope.</p>
                ) : role1HasWildcard ? (
                  <p><strong>{role1.roleName}</strong> has a wildcard (*) permission, which grants full access to all Azure control plane operations at the assigned scope.</p>
                ) : (
                  <p><strong>{role2.roleName}</strong> has a wildcard (*) permission, which grants full access to all Azure control plane operations at the assigned scope.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions (Control Plane) Comparison */}
      {stats.totalActions > 0 && (
        <PermissionSection
          title="Actions (Control Plane)"
          subtitle={`${stats.totalActions} total permissions`}
          comparisons={actionsComparison}
          role1Name={role1.roleName}
          role2Name={role2.roleName}
        />
      )}

      {/* Data Actions Comparison */}
      {stats.totalDataActions > 0 && (
        <PermissionSection
          title="Data Actions"
          subtitle={`${stats.totalDataActions} total permissions`}
          comparisons={dataActionsComparison}
          role1Name={role1.roleName}
          role2Name={role2.roleName}
        />
      )}

      {/* No permissions notice */}
      {stats.totalActions === 0 && stats.totalDataActions === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-400">
            Neither role has any permissions defined.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Role header card showing role name, description, and badges
 */
function RoleHeader({ role, isPrivileged }: { role: AzureRole; isPrivileged: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {role.roleName}
        </h3>
        <div className="flex flex-wrap gap-1">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
            role.roleType === 'BuiltInRole'
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
          }`}>
            {role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom'}
          </span>
          {isPrivileged && (
            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 whitespace-nowrap">
              Privileged
            </span>
          )}
        </div>
      </div>
      {role.description && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {role.description}
        </p>
      )}
    </div>
  );
}

/**
 * Permission section showing a list of permissions with comparison indicators
 */
function PermissionSection({
  title,
  subtitle,
  comparisons,
  role1Name,
  role2Name,
}: {
  title: string;
  subtitle: string;
  comparisons: PermissionComparison[];
  role1Name: string;
  role2Name: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
        {comparisons.map((item) => (
          <PermissionRow
            key={item.permission}
            item={item}
            role1Name={role1Name}
            role2Name={role2Name}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual permission row with visual indicators
 */
function PermissionRow({
  item,
  role1Name,
  role2Name,
}: {
  item: PermissionComparison;
  role1Name: string;
  role2Name: string;
}) {
  // Determine the row styling based on comparison
  let bgClass = '';
  let indicatorClass = '';
  let ariaLabel = '';

  if (item.isShared) {
    bgClass = 'bg-emerald-50/50 dark:bg-emerald-500/5';
    indicatorClass = 'bg-emerald-500';
    ariaLabel = `Shared by both ${role1Name} and ${role2Name}`;
  } else if (item.inRole1) {
    bgClass = 'bg-sky-50/50 dark:bg-sky-500/5';
    indicatorClass = 'bg-sky-500';
    ariaLabel = `Only in ${role1Name}`;
  } else {
    bgClass = 'bg-violet-50/50 dark:bg-violet-500/5';
    indicatorClass = 'bg-violet-500';
    ariaLabel = `Only in ${role2Name}`;
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 ${bgClass}`}
      aria-label={ariaLabel}
    >
      <span
        className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${indicatorClass}`}
        title={ariaLabel}
      ></span>
      <div className="flex-1 min-w-0">
        <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
          {item.permission}
        </code>
      </div>
    </div>
  );
}
