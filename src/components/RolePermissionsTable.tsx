import { useState, useMemo, useCallback } from 'react';
import type { AzureRole } from '@/types/rbac';
import { exportRolesToCSV, exportRolesToExcel, exportRolesToJSON, exportRolesToMarkdown } from '@/lib/rbacExportUtils';
import { isPrivilegedRole } from '@/config/privilegedRoles';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import { getFlattenedPermissions } from '@/lib/utils/permissionFlattener';
import { pluralize } from '@/lib/filenameUtils';

interface RolePermissionsTableProps {
  roles: AzureRole[];
}

export default function RolePermissionsTable({ roles }: RolePermissionsTableProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const isComparisonMode = roles.length === 2;

  const toggleDescription = (roleId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  // Generate filename with timestamp
  const generateFilename = useCallback((extension: string) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const roleCount = roles.length;
    const roleLabel = pluralize(roleCount, 'role');
    return `azure-rbac-${roleCount}-${roleLabel}_${timestamp}.${extension}`;
  }, [roles.length]);

  // Export handlers
  const handleJsonExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportRolesToJSON(roles, generateFilename('json'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleCsvExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportRolesToCSV(roles, generateFilename('csv'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleExcelExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportRolesToExcel(roles, generateFilename('xlsx'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleMarkdownExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportRolesToMarkdown(roles, generateFilename('md'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  // Export options for ExportMenu
  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'JSON file', format: 'json', extension: '.json', onClick: handleJsonExport },
    { label: 'Comma separated', format: 'csv', extension: '.csv', onClick: handleCsvExport },
    { label: 'Excel spreadsheet', format: 'excel', extension: '.xlsx', onClick: handleExcelExport },
    { label: 'Markdown table', format: 'md', extension: '.md', onClick: handleMarkdownExport }
  ], [handleJsonExport, handleCsvExport, handleExcelExport, handleMarkdownExport]);

  // Memoize roles with flattened permissions to avoid rebuilding on every render
  const rolesWithFlattenedPermissions = useMemo(() => {
    return roles.map(role => {
      const flattened = getFlattenedPermissions(role);
      return {
        role,
        allActions: flattened.actions,
        allDataActions: flattened.dataActions
      };
    });
  }, [roles]);

  // Comparison data (only computed when exactly 2 roles)
  const comparison = useMemo(() => {
    if (!isComparisonMode) return null;

    const [r1, r2] = rolesWithFlattenedPermissions;
    const r1Actions = new Set(r1.allActions);
    const r2Actions = new Set(r2.allActions);
    const r1DataActions = new Set(r1.allDataActions);
    const r2DataActions = new Set(r2.allDataActions);

    const sharedActions = r1.allActions.filter(a => r2Actions.has(a));
    const sharedDataActions = r1.allDataActions.filter(a => r2DataActions.has(a));

    const r1OnlyActions = r1.allActions.filter(a => !r2Actions.has(a));
    const r2OnlyActions = r2.allActions.filter(a => !r1Actions.has(a));
    const r1OnlyDataActions = r1.allDataActions.filter(a => !r2DataActions.has(a));
    const r2OnlyDataActions = r2.allDataActions.filter(a => !r1DataActions.has(a));

    return {
      sharedActions: new Set(sharedActions),
      sharedDataActions: new Set(sharedDataActions),
      sharedCount: sharedActions.length + sharedDataActions.length,
      r1OnlyCount: r1OnlyActions.length + r1OnlyDataActions.length,
      r2OnlyCount: r2OnlyActions.length + r2OnlyDataActions.length,
      isIdentical: r1OnlyActions.length === 0 && r2OnlyActions.length === 0 &&
        r1OnlyDataActions.length === 0 && r2OnlyDataActions.length === 0 &&
        (r1.allActions.length > 0 || r1.allDataActions.length > 0),
    };
  }, [isComparisonMode, rolesWithFlattenedPermissions]);

  return (
    <div className="space-y-4">
      {/* Comparison Summary (2 roles only) */}
      {comparison && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Comparison Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-400">
                  Shared: <strong className="text-slate-900 dark:text-slate-100">{comparison.sharedCount}</strong> {pluralize(comparison.sharedCount, 'permission')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {roles[0].roleName} only: <strong className="text-slate-900 dark:text-slate-100">{comparison.r1OnlyCount}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {roles[1].roleName} only: <strong className="text-slate-900 dark:text-slate-100">{comparison.r2OnlyCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Identical Notice */}
          {comparison.isIdentical && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-500/10">
              <div className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Identical Permissions</strong> — Both roles have exactly the same {comparison.sharedCount} permissions.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Role Permissions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isComparisonMode ? 'Comparing 2 roles' : `Viewing ${roles.length} ${pluralize(roles.length, 'role')}`}
          </p>
        </div>
        <ExportMenu
          options={exportOptions}
          itemCount={roles.length}
          itemLabel="role"
          isExporting={isExporting}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 w-1/6">
                  Role Name
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 w-24">
                  Role Type
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 w-5/12">
                  Actions
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 w-5/12">
                  Data Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rolesWithFlattenedPermissions.map(({ role, allActions, allDataActions }, index) => {
                const isEven = index % 2 === 0;
                const isPrivileged = isPrivilegedRole(role.roleName);

                // For comparison mode, determine which set of shared permissions to check against
                const otherActions = isComparisonMode
                  ? new Set(rolesWithFlattenedPermissions[index === 0 ? 1 : 0].allActions)
                  : null;
                const otherDataActions = isComparisonMode
                  ? new Set(rolesWithFlattenedPermissions[index === 0 ? 1 : 0].allDataActions)
                  : null;

                return (
                  <tr
                    key={role.id}
                    className={`border-b border-slate-100 dark:border-slate-800 ${
                      isEven ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-4 py-3 w-1/6">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {role.roleName}
                      </div>
                      {role.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {expandedDescriptions.has(role.id) ? (
                            <>
                              {role.description}
                              {role.description.length > 80 && (
                                <button
                                  onClick={() => toggleDescription(role.id)}
                                  className="ml-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                                >
                                  Show less
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {role.description.slice(0, 80)}
                              {role.description.length > 80 && (
                                <>
                                  ...
                                  <button
                                    onClick={() => toggleDescription(role.id)}
                                    className="ml-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                                  >
                                    Show more
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 w-24">
                      <div className="flex flex-col gap-1 items-start">
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
                    </td>
                    <td className="px-4 py-3 w-5/12">
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {allActions.length === 0 ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">None</span>
                        ) : (
                          allActions.map((action, idx) => (
                            <PermissionRow
                              key={idx}
                              permission={action}
                              isShared={otherActions ? otherActions.has(action) : null}
                              uniqueColor={index === 0 ? 'sky' : 'violet'}
                            />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 w-5/12">
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {allDataActions.length === 0 ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">None</span>
                        ) : (
                          allDataActions.map((dataAction, idx) => (
                            <PermissionRow
                              key={idx}
                              permission={dataAction}
                              isShared={otherDataActions ? otherDataActions.has(dataAction) : null}
                              uniqueColor={index === 0 ? 'sky' : 'violet'}
                            />
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

/**
 * A single permission row with an optional comparison indicator dot.
 * - isShared === null: no comparison mode, render plain text
 * - isShared === true: green dot (shared)
 * - isShared === false: colored dot (unique to this role)
 */
function PermissionRow({
  permission,
  isShared,
  uniqueColor,
}: {
  permission: string;
  isShared: boolean | null;
  uniqueColor: 'sky' | 'violet';
}) {
  if (isShared === null) {
    return (
      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
        {permission}
      </div>
    );
  }

  const dotColor = isShared
    ? 'bg-emerald-500'
    : uniqueColor === 'sky'
      ? 'bg-sky-500'
      : 'bg-violet-500';

  return (
    <div className="flex items-start gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor} mt-1 flex-shrink-0`}></span>
      <code className="font-mono text-xs break-all text-slate-700 dark:text-slate-300">
        {permission}
      </code>
    </div>
  );
}
