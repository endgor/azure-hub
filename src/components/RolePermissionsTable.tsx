import { useState, useMemo, useCallback } from 'react';
import type { AzureRole } from '@/types/rbac';
import { exportRolesToCSV, exportRolesToExcel, exportRolesToJSON } from '@/lib/rbacExportUtils';
import { getPrivilegedRoles, isPrivilegedRole } from '@/config/privilegedRoles';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import { getFlattenedPermissions } from '@/lib/utils/permissionFlattener';

interface RolePermissionsTableProps {
  roles: AzureRole[];
}

export default function RolePermissionsTable({ roles }: RolePermissionsTableProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

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
    const roleLabel = roleCount === 1 ? 'role' : 'roles';
    return `azure-rbac-${roleCount}-${roleLabel}_${timestamp}.${extension}`;
  }, [roles.length]);

  // Export handlers
  const handleJsonExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportRolesToJSON(roles, generateFilename('json'));
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleCsvExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportRolesToCSV(roles, generateFilename('csv'));
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleExcelExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportRolesToExcel(roles, generateFilename('xlsx'));
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  // Export options for ExportMenu
  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'JSON', format: 'json', extension: '.json', onClick: handleJsonExport },
    { label: 'CSV', format: 'csv', extension: '.csv', onClick: handleCsvExport },
    { label: 'Excel', format: 'excel', extension: '.xlsx', onClick: handleExcelExport }
  ], [handleJsonExport, handleCsvExport, handleExcelExport]);

  // Check if any of the selected roles are privileged
  const privilegedRolesInSelection = useMemo(
    () => getPrivilegedRoles(roles),
    [roles]
  );

  const hasPrivilegedRoles = privilegedRolesInSelection.length > 0;

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

  return (
    <div className="space-y-4">
      {/* Privileged Role Warning */}
      {hasPrivilegedRoles && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/30 dark:bg-amber-500/10">
          <div className="flex gap-3">
            <svg className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Privileged Roles Selected
              </h3>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="mb-2">
                  You have selected one or more highly privileged roles that grant extensive permissions across Azure resources:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {privilegedRolesInSelection.map(role => (
                    <li key={role.id}><strong>{role.roleName}</strong></li>
                  ))}
                </ul>
                <p className="mt-2">
                  <strong>Security Best Practice:</strong> Only assign these roles when absolutely necessary and follow the principle of least privilege.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Role Permissions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Viewing {roles.length} {roles.length === 1 ? 'role' : 'roles'}
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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
                          <div className={expandedDescriptions.has(role.id) ? '' : 'line-clamp-2'}>
                            {role.description}
                          </div>
                          {role.description.length > 100 && (
                            <button
                              onClick={() => toggleDescription(role.id)}
                              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium mt-1 text-xs"
                            >
                              {expandedDescriptions.has(role.id) ? 'Show less' : 'Show more'}
                            </button>
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
                            <div key={idx} className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                              {action}
                            </div>
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
                            <div key={idx} className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                              {dataAction}
                            </div>
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

      {/* Legend */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Understanding the Table
        </h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Actions:</strong> Management plane operations that control Azure resources (e.g., creating VMs, updating configurations)
          </p>
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Data Actions:</strong> Data plane operations that interact with data within resources (e.g., reading blob data, writing to storage)
          </p>
          <p>
            <strong className="text-amber-700 dark:text-amber-400">Privileged Roles:</strong> Roles with broad permissions that should be assigned carefully following the principle of least privilege
          </p>
        </div>
      </div>
    </div>
  );
}
