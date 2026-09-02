import { useState, useMemo, useCallback } from 'react';
import type { EntraIDRole } from '@/types/rbac';
import { exportEntraIdRolesToCSV, exportEntraIdRolesToExcel, exportEntraIdRolesToJSON, exportEntraIdRolesToMarkdown } from '@/lib/entraIdExportUtils';

import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import { pluralize } from '@/lib/filenameUtils';
import { tableBody, tableHeadCell, tableHeadRow, tableRow } from '@/components/shared/tableStyles';
import PermissionList from '@/components/shared/PermissionList';
import PermissionSummaryBar from '@/components/shared/PermissionSummaryBar';

interface EntraIdRolePermissionsTableProps {
  roles: EntraIDRole[];
}

export default function EntraIdRolePermissionsTable({ roles }: EntraIdRolePermissionsTableProps) {
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
    const roleLabel = pluralize(roleCount, 'role');
    return `entraid-roles-${roleCount}-${roleLabel}_${timestamp}.${extension}`;
  }, [roles.length]);

  // Export handlers
  const handleJsonExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportEntraIdRolesToJSON(roles, generateFilename('json'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleCsvExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportEntraIdRolesToCSV(roles, generateFilename('csv'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleExcelExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportEntraIdRolesToExcel(roles, generateFilename('xlsx'));
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  const handleMarkdownExport = useCallback(async () => {
    setIsExporting(true);
    try {
      exportEntraIdRolesToMarkdown(roles, generateFilename('md'));
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
          isExporting={isExporting}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={tableHeadRow}>
                <th className={`w-1/6 ${tableHeadCell}`}>
                  Role Name
                </th>
                <th className={`w-24 ${tableHeadCell}`}>
                  Role Type
                </th>
                <th className={`w-5/12 ${tableHeadCell}`}>
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody className={tableBody}>
              {rolesWithFlattenedPermissions.map(({ role, allPermissions }) => (
                <tr
                  key={role.id}
                  className={tableRow}
                >
                  {/* Role Name Column */}
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {role.displayName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 select-all">
                        {role.templateId}
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
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      role.isBuiltIn
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                    }`}>
                      {role.isBuiltIn ? 'Built-in' : 'Custom'}
                    </span>
                  </td>

                  {/* Permissions Column */}
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-3">
                      <PermissionSummaryBar permissions={allPermissions} system="entraid" />
                      <PermissionList
                        permissions={allPermissions}
                        grouping="entraid"
                        collapseAfter={0}
                        maxHeightClass="max-h-[28rem]"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Understanding the Table
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Permissions:</strong> Actions that the role can perform in Microsoft Entra ID and services that use Entra ID identities, grouped by the operation each one performs
          </p>
        </div>
      </div>
    </div>
  );
}
