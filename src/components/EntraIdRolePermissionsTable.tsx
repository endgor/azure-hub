import { useState, useMemo, useCallback } from 'react';
import type { EntraIDRole } from '@/types/rbac';
import { exportEntraIdRolesToCSV, exportEntraIdRolesToExcel, exportEntraIdRolesToJSON, exportEntraIdRolesToMarkdown } from '@/lib/entraIdExportUtils';
import { getPrivilegedEntraIdRoles, isPrivilegedEntraIdRole } from '@/config/privilegedEntraIdRoles';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import { pluralize } from '@/lib/filenameUtils';

interface EntraIdRolePermissionsTableProps {
  roles: EntraIDRole[];
}

export default function EntraIdRolePermissionsTable({ roles }: EntraIdRolePermissionsTableProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set());

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

  const togglePermissions = (roleId: string) => {
    setExpandedPermissions(prev => {
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
    return `entraid-roles-${roleCount}-${roleLabel}_${timestamp}.${extension}`;
  }, [roles.length]);

  // Export handlers
  const handleJsonExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportEntraIdRolesToJSON(roles, generateFilename('json'));
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
      await exportEntraIdRolesToCSV(roles, generateFilename('csv'));
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
      await exportEntraIdRolesToExcel(roles, generateFilename('xlsx'));
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleMarkdownExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportEntraIdRolesToMarkdown(roles, generateFilename('md'));
    } catch (error) {
      console.error('Markdown export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  // Export options for ExportMenu
  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'JSON', format: 'json', extension: '.json', onClick: handleJsonExport },
    { label: 'CSV', format: 'csv', extension: '.csv', onClick: handleCsvExport },
    { label: 'Excel', format: 'excel', extension: '.xlsx', onClick: handleExcelExport },
    { label: 'Markdown', format: 'md', extension: '.md', onClick: handleMarkdownExport }
  ], [handleJsonExport, handleCsvExport, handleExcelExport, handleMarkdownExport]);

  // Check if any of the selected roles are privileged
  const privilegedRolesInSelection = useMemo(
    () => getPrivilegedEntraIdRoles(roles),
    [roles]
  );

  const hasPrivilegedRoles = privilegedRolesInSelection.length > 0;

  // Memoize roles with flattened permissions
  const rolesWithFlattenedPermissions = useMemo(() => {
    return roles.map(role => {
      const allPermissions = role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []);
      return {
        role,
        allPermissions
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
                  You have selected one or more highly privileged roles that grant extensive permissions across Microsoft Entra ID and Microsoft services that use Entra ID identities:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {privilegedRolesInSelection.map(role => (
                    <li key={role.id}><strong>{role.displayName}</strong></li>
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
            Viewing {roles.length} {pluralize(roles.length, 'role')}
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
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {rolesWithFlattenedPermissions.map(({ role, allPermissions }) => {
                const isPrivileged = isPrivilegedEntraIdRole(role.displayName);

                return (
                <tr
                  key={role.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  {/* Role Name Column */}
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {role.displayName}
                      </div>
                      {role.description && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {expandedDescriptions.has(role.id) ? (
                            <>
                              {role.description}
                              <button
                                onClick={() => toggleDescription(role.id)}
                                className="ml-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                              >
                                Show less
                              </button>
                            </>
                          ) : (
                            <>
                              {role.description.slice(0, 80)}
                              {role.description.length > 80 && (
                                <>
                                  ...
                                  <button
                                    onClick={() => toggleDescription(role.id)}
                                    className="ml-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                  >
                                    Show more
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Role Type Column */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        role.isBuiltIn
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                      }`}>
                        {role.isBuiltIn ? 'Built-in' : 'Custom'}
                      </span>
                      {isPrivileged && (
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 whitespace-nowrap">
                          Privileged
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Permissions Column */}
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-2">
                      {/* Permissions count */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePermissions(role.id)}
                          className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 text-sm font-medium"
                        >
                          {expandedPermissions.has(role.id) ? '▼' : '▶'} {allPermissions.length} {pluralize(allPermissions.length, 'permission')}
                        </button>
                      </div>

                      {/* Expanded permissions list */}
                      {expandedPermissions.has(role.id) && (
                        <ul className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400 pl-4 max-h-96 overflow-y-auto">
                          {allPermissions.map((action, idx) => (
                            <li key={`${action}-${idx}`} className="list-disc break-all">{action}</li>
                          ))}
                        </ul>
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
            <strong className="text-slate-900 dark:text-slate-100">Permissions:</strong> Actions that the role can perform in Microsoft Entra ID and services that use Entra ID identities
          </p>
          <p>
            <strong className="text-amber-700 dark:text-amber-400">Privileged Roles:</strong> Roles with broad permissions that should be assigned carefully following the principle of least privilege
          </p>
        </div>
      </div>
    </div>
  );
}
