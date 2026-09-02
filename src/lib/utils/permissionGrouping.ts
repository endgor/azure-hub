/**
 * Buckets permission strings by the operation verb they end in, so long
 * permission lists can be read by shape (how much write/delete a role grants)
 * instead of line by line.
 *
 * Azure RBAC and Entra ID use different grammars, so each has its own
 * classifier and group ordering:
 *   Azure    Microsoft.Compute/virtualMachines/read      -> read/write/delete/action
 *   Entra ID microsoft.directory/users/basic/update      -> read/create/update/delete
 */
export type PermissionSystem = 'azure' | 'entraid';

export type PermissionGroup =
  | 'read'
  | 'write'
  | 'create'
  | 'update'
  | 'delete'
  | 'action'
  | 'wildcard'
  | 'other';

export const PERMISSION_GROUP_ORDER: Record<PermissionSystem, PermissionGroup[]> = {
  azure: ['read', 'write', 'delete', 'action', 'wildcard', 'other'],
  entraid: ['read', 'create', 'update', 'delete', 'action', 'wildcard', 'other'],
};

interface PermissionGroupMeta {
  label: string;
  /** Text colour for the group heading. */
  accent: string;
  /** Background + text for the summary chip. */
  chip: string;
}

export const PERMISSION_GROUP_META: Record<PermissionGroup, PermissionGroupMeta> = {
  read: {
    label: 'Read',
    accent: 'text-slate-500 dark:text-slate-400',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  write: {
    label: 'Write',
    accent: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  create: {
    label: 'Create',
    accent: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  update: {
    label: 'Update',
    accent: 'text-orange-600 dark:text-orange-400',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  },
  delete: {
    label: 'Delete',
    accent: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  action: {
    label: 'Action',
    accent: 'text-indigo-600 dark:text-indigo-400',
    chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  wildcard: {
    label: 'Wildcard',
    accent: 'text-fuchsia-600 dark:text-fuchsia-400',
    chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  },
  other: {
    label: 'Other',
    accent: 'text-slate-500 dark:text-slate-400',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

function isWildcard(permission: string): boolean {
  return permission === '*' || permission.endsWith('/*');
}

function tailSegment(permission: string): string {
  return permission.slice(permission.lastIndexOf('/') + 1).toLowerCase();
}

function classifyAzurePermission(permission: string): PermissionGroup {
  if (isWildcard(permission)) return 'wildcard';

  switch (tailSegment(permission)) {
    case 'read': return 'read';
    case 'write': return 'write';
    case 'delete': return 'delete';
    case 'action': return 'action';
    default: return 'other';
  }
}

/**
 * Entra ID puts the verb last too, but the vocabulary is CRUD plus a long tail
 * of resource-specific operations (restore, enable, invalidateAllRefreshTokens,
 * ...) which are grouped as actions. `allTasks` means every operation on the
 * resource, so it reads as a wildcard.
 */
function classifyEntraIdPermission(permission: string): PermissionGroup {
  if (isWildcard(permission)) return 'wildcard';
  if (!permission.includes('/')) return 'other';

  const tail = tailSegment(permission);

  if (tail === 'alltasks') return 'wildcard';
  if (tail === 'read') return 'read';
  if (tail === 'update') return 'update';
  if (tail === 'delete') return 'delete';
  if (tail === 'create' || tail.startsWith('createas')) return 'create';

  return 'action';
}

export function classifyPermission(permission: string, system: PermissionSystem): PermissionGroup {
  return system === 'entraid'
    ? classifyEntraIdPermission(permission)
    : classifyAzurePermission(permission);
}

export function groupPermissions(
  permissions: string[],
  system: PermissionSystem
): Record<PermissionGroup, string[]> {
  const groups: Record<PermissionGroup, string[]> = {
    read: [], write: [], create: [], update: [], delete: [], action: [], wildcard: [], other: [],
  };
  for (const permission of permissions) {
    groups[classifyPermission(permission, system)].push(permission);
  }
  return groups;
}

export interface PermissionGroupCount {
  group: PermissionGroup;
  count: number;
}

/** Non-empty group counts in display order, for the "grants" summary strip. */
export function summarizePermissions(
  permissions: string[],
  system: PermissionSystem
): PermissionGroupCount[] {
  const groups = groupPermissions(permissions, system);
  return PERMISSION_GROUP_ORDER[system]
    .map(group => ({ group, count: groups[group].length }))
    .filter(entry => entry.count > 0);
}
