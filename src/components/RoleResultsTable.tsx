import React, { useState, useMemo, memo, useEffect, useCallback } from 'react';
import type { LeastPrivilegeResult } from '@/types/rbac';
import { exportRolesToAzureJSON, generateRoleExportFilename } from '@/lib/rbacExportUtils';
import { exportRolesToCSV, exportRolesToExcel, exportRolesToMarkdown } from '@/lib/rbacExportUtils';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';

interface RoleResultsTableProps {
  results: LeastPrivilegeResult[];
}

type SortField = 'roleName' | 'permissionCount' | 'roleType' | 'default';
type SortDirection = 'asc' | 'desc';

const RoleResultsTable = memo(function RoleResultsTable({ results }: RoleResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Clear selections and expansions when results change
  useEffect(() => {
    setSelectedRoles(new Set());
    setExpandedRows(new Set());
  }, [results]);

  // Sort the results (or maintain backend order if default)
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    // If 'default', maintain the order from backend (already optimally sorted by relevance)
    if (sortField === 'default') {
      return results;
    }

    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'roleName':
          comparison = (a.role.roleName || '').localeCompare(b.role.roleName || '');
          break;
        case 'permissionCount':
          comparison = a.permissionCount - b.permissionCount;
          break;
        case 'roleType':
          comparison = (a.role.roleType || '').localeCompare(b.role.roleType || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleRow = (roleId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRoleSelection = (roleId: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRoles.size === sortedResults.length) {
      // Deselect all
      setSelectedRoles(new Set());
    } else {
      // Select all
      setSelectedRoles(new Set(sortedResults.map(r => r.role.id)));
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  // Get selected roles for export
  const selectedResults = useMemo(() => {
    return sortedResults.filter(r => selectedRoles.has(r.role.id));
  }, [sortedResults, selectedRoles]);

  // Export handlers
  const handleJsonExport = useCallback(async () => {
    if (selectedResults.length === 0) return;
    setIsExporting(true);
    try {
      const filename = generateRoleExportFilename(selectedResults.length);
      exportRolesToAzureJSON(selectedResults, filename);
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedResults]);

  const handleCsvExport = useCallback(async () => {
    if (selectedResults.length === 0) return;
    setIsExporting(true);
    try {
      const roles = selectedResults.map(r => r.role);
      const filename = `azure-rbac_${selectedResults.length}_roles_${new Date().toISOString().slice(0, 10)}.csv`;
      await exportRolesToCSV(roles, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedResults]);

  const handleExcelExport = useCallback(async () => {
    if (selectedResults.length === 0) return;
    setIsExporting(true);
    try {
      const roles = selectedResults.map(r => r.role);
      const filename = `azure-rbac_${selectedResults.length}_roles_${new Date().toISOString().slice(0, 10)}.xlsx`;
      await exportRolesToExcel(roles, filename);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedResults]);

  const handleMarkdownExport = useCallback(async () => {
    if (selectedResults.length === 0) return;
    setIsExporting(true);
    try {
      const roles = selectedResults.map(r => r.role);
      const filename = `azure-rbac_${selectedResults.length}_roles_${new Date().toISOString().slice(0, 10)}.md`;
      exportRolesToMarkdown(roles, filename);
    } catch (error) {
      console.error('Markdown export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedResults]);

  // Export options for ExportMenu
  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'JSON', format: 'json', extension: '.json', onClick: handleJsonExport },
    { label: 'CSV', format: 'csv', extension: '.csv', onClick: handleCsvExport },
    { label: 'Excel', format: 'excel', extension: '.xlsx', onClick: handleExcelExport },
    { label: 'Markdown', format: 'md', extension: '.md', onClick: handleMarkdownExport }
  ], [handleJsonExport, handleCsvExport, handleExcelExport, handleMarkdownExport]);

  const allSelected = sortedResults.length > 0 && selectedRoles.size === sortedResults.length;
  const someSelected = selectedRoles.size > 0 && selectedRoles.size < sortedResults.length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="ml-1 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="ml-1 h-4 w-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 h-4 w-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recommended Roles
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Found {results.length} {results.length === 1 ? 'role' : 'roles'} matching your requirements
            {selectedRoles.size > 0 && (
              <span className="ml-2 text-sky-600 dark:text-sky-400">
                ({selectedRoles.size} selected)
              </span>
            )}
          </p>
        </div>
        <ExportMenu
          options={exportOptions}
          itemCount={selectedRoles.size}
          itemLabel="role"
          disabled={selectedRoles.size === 0}
          isExporting={isExporting}
        />
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/50 dark:border-slate-600 dark:bg-slate-800"
                    aria-label="Select all roles"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                  <button
                    onClick={() => handleSort('roleName')}
                    className="flex items-center hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    Role Name
                    <SortIcon field="roleName" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                  <button
                    onClick={() => handleSort('roleType')}
                    className="flex items-center hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    Role Type
                    <SortIcon field="roleType" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                  Matching
                </th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result, index) => {
                const isExpanded = expandedRows.has(result.role.id);
                const isEven = index % 2 === 0;

                return (
                  <React.Fragment key={result.role.id}>
                    {/* Main Row */}
                    <tr
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        isEven ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRoles.has(result.role.id)}
                          onChange={() => toggleRoleSelection(result.role.id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/50 dark:border-slate-600 dark:bg-slate-800"
                          aria-label={`Select ${result.role.roleName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {result.role.roleName}
                        </div>
                        {result.isExactMatch && (
                          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Exact Match
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          result.role.roleType === 'BuiltInRole'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                        }`}>
                          {result.role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {result.matchingActions.length} {result.matchingActions.length === 1 ? 'action' : 'actions'}
                      </td>
                      <td className="px-4 py-3 w-16">
                        <button
                          onClick={() => toggleRow(result.role.id)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <svg
                            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr
                        className={isEven ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'}
                      >
                        <td colSpan={5} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="space-y-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                            {/* Description */}
                            {result.role.description && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                  Description
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                  {result.role.description}
                                </p>
                              </div>
                            )}

                            {/* Matching Actions */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                Matching Actions ({result.matchingActions.length})
                              </h4>
                              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                <div className="grid gap-1">
                                  {result.matchingActions.map((action, idx) => (
                                    <div key={idx} className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                      {action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* All Granted Actions */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                All Granted Permissions
                              </h4>
                              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800 max-h-60 overflow-y-auto">
                                {result.role.permissions.map((permission, permIdx) => (
                                  <div key={permIdx} className="space-y-2">
                                    {permission.actions.length > 0 && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                          Actions:
                                        </div>
                                        <div className="grid gap-1">
                                          {permission.actions.map((action, idx) => (
                                            <div key={idx} className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                                              + {action}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {permission.notActions.length > 0 && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                          Not Actions:
                                        </div>
                                        <div className="grid gap-1">
                                          {permission.notActions.map((action, idx) => (
                                            <div key={idx} className="font-mono text-xs text-rose-700 dark:text-rose-400">
                                              - {action}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Role ID */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                Role ID
                              </h4>
                              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                                {result.role.id}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Understanding Results
        </h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Recommended Order:</strong> Roles are ranked by relevance to your requested permissions. Domain-specific roles (e.g., &ldquo;Billing Reader&rdquo;) rank higher than generic broad roles (e.g., &ldquo;Reader&rdquo;) for namespace-specific permissions.
          </p>
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Exact Match:</strong> Roles that grant exactly the permissions you requested without additional access.
          </p>
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Tip:</strong> The top result is usually your best choice for least privilege access. You can click column headers to re-sort if needed.
          </p>
        </div>
      </div>
    </div>
  );
});

export default RoleResultsTable;
