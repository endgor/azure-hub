import { useMemo, useState } from 'react';
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
 * Displays a split view with shared permissions (collapsible) and
 * unique permissions in a two-column layout for easy scanning.
 */
export default function RoleComparisonTable({ roles }: RoleComparisonTableProps) {
  const [role1, role2] = roles;

  const role1Permissions = useMemo(() => getFlattenedPermissions(role1), [role1]);
  const role2Permissions = useMemo(() => getFlattenedPermissions(role2), [role2]);

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

  // Separate shared vs unique for each section
  const actionsSplit = useMemo(() => ({
    shared: actionsComparison.filter(a => a.isShared),
    role1Only: actionsComparison.filter(a => a.inRole1 && !a.inRole2),
    role2Only: actionsComparison.filter(a => !a.inRole1 && a.inRole2),
  }), [actionsComparison]);

  const dataActionsSplit = useMemo(() => ({
    shared: dataActionsComparison.filter(a => a.isShared),
    role1Only: dataActionsComparison.filter(a => a.inRole1 && !a.inRole2),
    role2Only: dataActionsComparison.filter(a => !a.inRole1 && a.inRole2),
  }), [dataActionsComparison]);

  const stats = useMemo(() => ({
    sharedActions: actionsSplit.shared.length,
    role1OnlyActions: actionsSplit.role1Only.length,
    role2OnlyActions: actionsSplit.role2Only.length,
    sharedDataActions: dataActionsSplit.shared.length,
    role1OnlyDataActions: dataActionsSplit.role1Only.length,
    role2OnlyDataActions: dataActionsSplit.role2Only.length,
    totalActions: actionsComparison.length,
    totalDataActions: dataActionsComparison.length,
  }), [actionsComparison.length, dataActionsComparison.length, actionsSplit, dataActionsSplit]);

  const isRole1Privileged = isPrivilegedRole(role1.roleName);
  const isRole2Privileged = isPrivilegedRole(role2.roleName);

  const role1HasWildcard = role1Permissions.actions.includes('*');
  const role2HasWildcard = role2Permissions.actions.includes('*');
  const hasWildcardPermissions = role1HasWildcard || role2HasWildcard;

  const hasDifferences = actionsSplit.role1Only.length > 0 || actionsSplit.role2Only.length > 0
    || dataActionsSplit.role1Only.length > 0 || dataActionsSplit.role2Only.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Role Comparison
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Comparing permissions between two roles
        </p>
      </div>

      {/* Role headers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoleHeader role={role1} isPrivileged={isRole1Privileged} colorClass="border-sky-300 dark:border-sky-500/40" />
        <RoleHeader role={role2} isPrivileged={isRole2Privileged} colorClass="border-violet-300 dark:border-violet-500/40" />
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

      {/* Identical roles notice */}
      {!hasDifferences && stats.totalActions + stats.totalDataActions > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-500/10">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Identical Permissions
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Both roles have exactly the same permissions. All {stats.totalActions + stats.totalDataActions} permissions are shared.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions (Control Plane) */}
      {stats.totalActions > 0 && (
        <ComparisonSection
          title="Actions (Control Plane)"
          role1Name={role1.roleName}
          role2Name={role2.roleName}
          shared={actionsSplit.shared}
          role1Only={actionsSplit.role1Only}
          role2Only={actionsSplit.role2Only}
        />
      )}

      {/* Data Actions */}
      {stats.totalDataActions > 0 && (
        <ComparisonSection
          title="Data Actions"
          role1Name={role1.roleName}
          role2Name={role2.roleName}
          shared={dataActionsSplit.shared}
          role1Only={dataActionsSplit.role1Only}
          role2Only={dataActionsSplit.role2Only}
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

function RoleHeader({ role, isPrivileged, colorClass }: { role: AzureRole; isPrivileged: boolean; colorClass: string }) {
  return (
    <div className={`rounded-xl border-2 bg-white p-4 dark:bg-slate-900 ${colorClass}`}>
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
 * A full comparison section (e.g., "Actions" or "Data Actions") with:
 * - Split view for differences (role 1 unique on left, role 2 unique on right)
 * - Collapsible shared permissions section
 */
function ComparisonSection({
  title,
  role1Name,
  role2Name,
  shared,
  role1Only,
  role2Only,
}: {
  title: string;
  role1Name: string;
  role2Name: string;
  shared: PermissionComparison[];
  role1Only: PermissionComparison[];
  role2Only: PermissionComparison[];
}) {
  const [sharedExpanded, setSharedExpanded] = useState(false);
  const hasDifferences = role1Only.length > 0 || role2Only.length > 0;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {shared.length + role1Only.length + role2Only.length} total permissions
        </p>
      </div>

      {/* Differences split view */}
      {hasDifferences && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UniquePermissionColumn
            roleName={role1Name}
            permissions={role1Only}
            colorScheme="sky"
          />
          <UniquePermissionColumn
            roleName={role2Name}
            permissions={role2Only}
            colorScheme="violet"
          />
        </div>
      )}

      {/* No differences notice */}
      {!hasDifferences && shared.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No differences — all {shared.length} permissions are shared between both roles.
        </div>
      )}

      {/* Shared permissions (collapsible) */}
      {shared.length > 0 && hasDifferences && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setSharedExpanded(!sharedExpanded)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
            aria-expanded={sharedExpanded}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Shared Permissions
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {shared.length}
              </span>
            </div>
            <ChevronIcon expanded={sharedExpanded} />
          </button>
          {sharedExpanded && (
            <div className="border-t border-slate-200 dark:border-slate-700">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {shared.map(item => (
                  <div
                    key={item.permission}
                    className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 dark:bg-emerald-500/5"
                    aria-label={`Shared by both ${role1Name} and ${role2Name}`}
                  >
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500"></span>
                    <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                      {item.permission}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A column showing permissions unique to one role
 */
function UniquePermissionColumn({
  roleName,
  permissions,
  colorScheme,
}: {
  roleName: string;
  permissions: PermissionComparison[];
  colorScheme: 'sky' | 'violet';
}) {
  const styles = colorScheme === 'sky' ? {
    border: 'border-sky-200 dark:border-sky-500/30',
    headerBg: 'bg-sky-50 dark:bg-sky-500/10',
    headerText: 'text-sky-900 dark:text-sky-200',
    headerBadgeBg: 'bg-sky-200 text-sky-800 dark:bg-sky-500/30 dark:text-sky-200',
    dot: 'bg-sky-500',
    rowBg: 'bg-sky-50/30 dark:bg-sky-500/5',
  } : {
    border: 'border-violet-200 dark:border-violet-500/30',
    headerBg: 'bg-violet-50 dark:bg-violet-500/10',
    headerText: 'text-violet-900 dark:text-violet-200',
    headerBadgeBg: 'bg-violet-200 text-violet-800 dark:bg-violet-500/30 dark:text-violet-200',
    dot: 'bg-violet-500',
    rowBg: 'bg-violet-50/30 dark:bg-violet-500/5',
  };

  return (
    <div className={`rounded-xl border ${styles.border} bg-white dark:bg-slate-900 overflow-hidden`}>
      {/* Column header */}
      <div className={`px-4 py-3 ${styles.headerBg} border-b ${styles.border}`}>
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-sm font-semibold ${styles.headerText} truncate`}>
            {roleName} only
          </h4>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.headerBadgeBg} whitespace-nowrap`}>
            {permissions.length}
          </span>
        </div>
      </div>
      {/* Permission list */}
      {permissions.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
          {permissions.map(item => (
            <div
              key={item.permission}
              className={`flex items-center gap-3 px-4 py-2 ${styles.rowBg}`}
            >
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${styles.dot}`}></span>
              <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                {item.permission}
              </code>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No unique permissions
          </p>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
