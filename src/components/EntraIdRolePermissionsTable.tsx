import { useState, useMemo, useCallback } from 'react';
import type { EntraIDRole } from '@/types/rbac';
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

  // Export handlers (placeholder for future implementation)
  const handleJsonExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const json = JSON.stringify(roles, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFilename('json');
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [roles, generateFilename]);

  // Export options for ExportMenu (JSON only for now)
  const exportOptions: ExportOption[] = useMemo(() => [
    { label: 'JSON', format: 'json', extension: '.json', onClick: handleJsonExport }
  ], [handleJsonExport]);

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
              {rolesWithFlattenedPermissions.map(({ role, allPermissions }) => (
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
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      role.isBuiltIn
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {role.isBuiltIn ? 'Built-in' : 'Custom'}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
