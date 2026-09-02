import React, { useState, useMemo, memo, useEffect, useCallback } from 'react';
import type { LeastPrivilegeResult, EntraIDLeastPrivilegeResult } from '@/types/rbac';
import {
  exportRolesToAzureJSON,
  exportRolesToCSV,
  exportRolesToExcel,
  exportRolesToMarkdown
} from '@/lib/rbacExportUtils';
import {
  exportEntraIdRolesToJSON,
  exportEntraIdRolesToCSV,
  exportEntraIdRolesToExcel,
  exportEntraIdRolesToMarkdown
} from '@/lib/entraIdExportUtils';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import { generateCountFilename, pluralize } from '@/lib/filenameUtils';
import { tableBody, tableHeadCell, tableHeadRow, tableRow } from '@/components/shared/tableStyles';
import PermissionList from '@/components/shared/PermissionList';
import PermissionSummaryBar from '@/components/shared/PermissionSummaryBar';
import { getFlattenedPermissions } from '@/lib/utils/permissionFlattener';
import { matchesWildcard } from '@/lib/utils/wildcardMatcher';
import type { PermissionSystem } from '@/lib/utils/permissionGrouping';

type RoleSystemType = 'azure' | 'entraid';
type AnyRoleResult = LeastPrivilegeResult | EntraIDLeastPrivilegeResult;

interface RoleResultsTableProps {
  results: AnyRoleResult[];
  roleSystem: RoleSystemType;
}

/** Azure and Entra ID results share this table but need different exporters. */
function isAzureResult(result: AnyRoleResult): result is LeastPrivilegeResult {
  return 'roleName' in result.role;
}

function isEntraIdResult(result: AnyRoleResult): result is EntraIDLeastPrivilegeResult {
  return !('roleName' in result.role);
}

interface GrantedPermissions {
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

/** Flattens a result's role into the four permission buckets, per role system. */
function getGrantedPermissions(result: AnyRoleResult, roleSystem: RoleSystemType): GrantedPermissions {
  if (roleSystem === 'azure' && 'permissions' in result.role) {
    return getFlattenedPermissions(result.role);
  }

  if ('rolePermissions' in result.role) {
    return {
      actions: result.role.rolePermissions.flatMap(rp => rp.allowedResourceActions || []),
      notActions: [],
      dataActions: [],
      notDataActions: [],
    };
  }

  return { actions: [], notActions: [], dataActions: [], notDataActions: [] };
}

type SortField = 'roleName' | 'permissionCount' | 'roleType' | 'default';
type SortDirection = 'asc' | 'desc';

const RoleResultsTable = memo(function RoleResultsTable({ results, roleSystem }: RoleResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedRoles(new Set());
    setExpandedRows(new Set());
  }, [results]);

  const getRoleName = (result: AnyRoleResult): string => {
    if ('roleName' in result.role) {
      return result.role.roleName || '';
    }
    return result.role.displayName || '';
  };

  const getRoleTypeDisplay = (result: AnyRoleResult): string => {
    if ('roleType' in result.role) {
      return result.role.roleType === 'BuiltInRole' ? 'Built-in' : 'Custom';
    }
    return result.role.isBuiltIn ? 'Built-in' : 'Custom';
  };

  const getRoleTypeForSort = (result: AnyRoleResult): string => {
    if ('roleType' in result.role) {
      return result.role.roleType || '';
    }
    return result.role.isBuiltIn ? 'BuiltIn' : 'Custom';
  };

  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    if (sortField === 'default') {
      return results;
    }

    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'roleName':
          comparison = getRoleName(a).localeCompare(getRoleName(b));
          break;
        case 'permissionCount':
          comparison = a.permissionCount - b.permissionCount;
          break;
        case 'roleType':
          comparison = getRoleTypeForSort(a).localeCompare(getRoleTypeForSort(b));
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
      setSelectedRoles(new Set());
    } else {
      setSelectedRoles(new Set(sortedResults.map(r => r.role.id)));
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const selectedResults = useMemo(() => {
    return sortedResults.filter(r => selectedRoles.has(r.role.id));
  }, [sortedResults, selectedRoles]);

  const filenamePrefix = roleSystem === 'azure' ? 'azure-rbac' : 'entraid-roles';

  const azureRoles = useMemo(
    () => selectedResults.filter(isAzureResult).map(result => result.role),
    [selectedResults]
  );

  const entraIdRoles = useMemo(
    () => selectedResults.filter(isEntraIdResult).map(result => result.role),
    [selectedResults]
  );

  const runExport = useCallback(
    async (exporter: (filename: string) => void | Promise<void>, extension: string) => {
      if (selectedResults.length === 0) return;
      setIsExporting(true);
      try {
        await exporter(generateCountFilename(selectedResults.length, extension, filenamePrefix));
      } catch (error) {
        console.error('Role export failed:', error);
        alert('Export failed. Please try again.');
      } finally {
        setIsExporting(false);
      }
    },
    [selectedResults.length, filenamePrefix]
  );

  const exportOptions: ExportOption[] = useMemo(() => {
    const isAzure = roleSystem === 'azure';

    return [
      {
        label: 'JSON file',
        format: 'json',
        extension: '.json',
        onClick: () => runExport(
          filename => isAzure
            ? exportRolesToAzureJSON(selectedResults.filter(isAzureResult), filename)
            : exportEntraIdRolesToJSON(entraIdRoles, filename),
          'json'
        )
      },
      {
        label: 'Comma separated',
        format: 'csv',
        extension: '.csv',
        onClick: () => runExport(
          filename => isAzure
            ? exportRolesToCSV(azureRoles, filename)
            : exportEntraIdRolesToCSV(entraIdRoles, filename),
          'csv'
        )
      },
      {
        label: 'Excel spreadsheet',
        format: 'excel',
        extension: '.xlsx',
        onClick: () => runExport(
          filename => isAzure
            ? exportRolesToExcel(azureRoles, filename)
            : exportEntraIdRolesToExcel(entraIdRoles, filename),
          'xlsx'
        )
      },
      {
        label: 'Markdown table',
        format: 'md',
        extension: '.md',
        onClick: () => runExport(
          filename => isAzure
            ? exportRolesToMarkdown(azureRoles, filename)
            : exportEntraIdRolesToMarkdown(entraIdRoles, filename),
          'md'
        )
      }
    ];
  }, [roleSystem, runExport, selectedResults, azureRoles, entraIdRoles]);

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
            Found {results.length} {pluralize(results.length, 'role')} matching your requirements
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
          disabled={selectedRoles.size === 0}
          isExporting={isExporting}
          disabledHint="Select roles to export"
        />
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={tableHeadRow}>
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
                <th className={tableHeadCell}>
                  <button
                    onClick={() => handleSort('roleName')}
                    className="flex items-center hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    Role Name
                    <SortIcon field="roleName" />
                  </button>
                </th>
                <th className={tableHeadCell}>
                  <button
                    onClick={() => handleSort('roleType')}
                    className="flex items-center hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    Role Type
                    <SortIcon field="roleType" />
                  </button>
                </th>
                <th className={tableHeadCell}>
                  Matching
                </th>
                <th className={tableHeadCell}>
                  Grants
                </th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className={tableBody}>
              {sortedResults.map((result) => {
                const isExpanded = expandedRows.has(result.role.id);
                const roleName = getRoleName(result);
                const roleTypeDisplay = getRoleTypeDisplay(result);
                const granted = getGrantedPermissions(result, roleSystem);

                return (
                  <React.Fragment key={result.role.id}>
                    {/* Main Row */}
                    <tr className={tableRow}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRoles.has(result.role.id)}
                          onChange={() => toggleRoleSelection(result.role.id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/50 dark:border-slate-600 dark:bg-slate-800"
                          aria-label={`Select ${roleName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {roleName}
                        </div>
                        {result.isExactMatch && (
                          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Exact Match
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                          {roleTypeDisplay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          {result.matchingActions.length > 0 && (
                            <span className="flex items-center gap-1">
                              {roleSystem === 'azure' && (
                                <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">C</span>
                              )}
                              {result.matchingActions.length} {pluralize(result.matchingActions.length, 'action')}
                            </span>
                          )}
                          {roleSystem === 'azure' && 'matchingDataActions' in result && result.matchingDataActions && result.matchingDataActions.length > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">D</span>
                              {result.matchingDataActions.length} data {pluralize(result.matchingDataActions.length, 'action')}
                            </span>
                          )}
                          {result.matchingActions.length === 0 && (roleSystem !== 'azure' || !('matchingDataActions' in result) || !result.matchingDataActions || result.matchingDataActions.length === 0) && (
                            <span>0 actions</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PermissionSummaryBar
                          permissions={[...granted.actions, ...granted.dataActions]}
                          system={roleSystem}
                        />
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
                      <tr>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-4">
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

                            <ExpandedRoleDetails result={result} permissions={granted} roleSystem={roleSystem} />
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

    </div>
  );
});

/** Granted patterns that satisfy at least one requested action, including via wildcards. */
function findMatchedPatterns(grantedPatterns: string[], requestedActions: string[]): Set<string> {
  const matched = new Set<string>();
  if (requestedActions.length === 0) return matched;

  for (const pattern of grantedPatterns) {
    if (requestedActions.some(action => matchesWildcard(pattern, action))) {
      matched.add(pattern);
    }
  }

  return matched;
}

const planeBadge = 'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

function PermissionPlaneSection({
  badge,
  badgeClass,
  granted,
  denied,
  matched,
  onlyMatching,
  grouping,
}: {
  badge: string | null;
  badgeClass: string;
  granted: string[];
  denied: string[];
  matched: Set<string>;
  onlyMatching: boolean;
  grouping: PermissionSystem;
}) {
  if (granted.length === 0 && denied.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {badge && <span className={`${planeBadge} ${badgeClass}`}>{badge}</span>}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {granted.length} granted
        </span>
      </div>

      {granted.length > 0 && (
        <PermissionList
          permissions={granted}
          grouping={grouping}
          matched={matched}
          onlyMatching={onlyMatching}
        />
      )}

      {denied.length > 0 && !onlyMatching && (
        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Excluded <span className="tabular-nums font-medium text-slate-400 dark:text-slate-500">{denied.length}</span>
          </div>
          <PermissionList
            permissions={denied}
            grouping={grouping}
            tone="deny"
          />
        </div>
      )}
    </div>
  );
}

/**
 * The permission breakdown inside an expanded result row. Matching permissions
 * are highlighted in place within the full grant list rather than repeated in a
 * separate list above it.
 */
function ExpandedRoleDetails({
  result,
  permissions,
  roleSystem,
}: {
  result: AnyRoleResult;
  permissions: GrantedPermissions;
  roleSystem: RoleSystemType;
}) {
  const [onlyMatching, setOnlyMatching] = useState(false);

  const isAzure = roleSystem === 'azure' && 'permissions' in result.role;

  const matchingDataActions = 'matchingDataActions' in result ? (result.matchingDataActions || []) : [];

  const matchedActions = useMemo(
    () => findMatchedPatterns(permissions.actions, result.matchingActions),
    [permissions.actions, result.matchingActions]
  );

  const matchedDataActions = useMemo(
    () => findMatchedPatterns(permissions.dataActions, matchingDataActions),
    [permissions.dataActions, matchingDataActions]
  );

  const requestedCount = result.matchingActions.length + matchingDataActions.length;
  const grantedTotal = permissions.actions.length + permissions.dataActions.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Permissions
        </h4>
        {requestedCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={onlyMatching}
              onChange={() => setOnlyMatching(!onlyMatching)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/50 dark:border-slate-600 dark:bg-slate-800"
            />
            Only matching
          </label>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Covers all {requestedCount} requested {pluralize(requestedCount, 'action')} and grants{' '}
        {grantedTotal} permission {pluralize(grantedTotal, 'entry', 'entries')}.
      </p>

      <PermissionPlaneSection
        badge={isAzure ? 'Control' : null}
        badgeClass="bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
        granted={permissions.actions}
        denied={permissions.notActions}
        matched={matchedActions}
        onlyMatching={onlyMatching}
        grouping={roleSystem}
      />

      <PermissionPlaneSection
        badge="Data"
        badgeClass="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
        granted={permissions.dataActions}
        denied={permissions.notDataActions}
        matched={matchedDataActions}
        onlyMatching={onlyMatching}
        grouping={roleSystem}
      />
    </div>
  );
}

export default RoleResultsTable;
