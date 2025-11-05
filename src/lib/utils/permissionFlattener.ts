import type { AzureRole } from '@/types/rbac';

/**
 * Permission types supported by Azure RBAC
 */
export type PermissionType = 'Action' | 'Not Action' | 'Data Action' | 'Not Data Action';

/**
 * Flattened permission entry
 */
export interface FlattenedPermission {
  type: PermissionType;
  permission: string;
}

/**
 * Flattened permissions grouped by type
 */
export interface FlattenedPermissions {
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
}

/**
 * Generator function that yields flattened permissions from a role.
 * Useful for streaming large permission sets without allocating arrays upfront.
 *
 * @param role - The Azure role to flatten permissions from
 * @yields Flattened permission entries one at a time
 *
 * @example
 * for (const { type, permission } of flattenRolePermissions(role)) {
 *   console.log(`${type}: ${permission}`);
 * }
 */
export function* flattenRolePermissions(role: AzureRole): Generator<FlattenedPermission> {
  for (const permission of role.permissions) {
    // Yield actions
    for (const action of permission.actions) {
      yield { type: 'Action', permission: action };
    }

    // Yield notActions
    for (const notAction of permission.notActions) {
      yield { type: 'Not Action', permission: notAction };
    }

    // Yield dataActions
    if (permission.dataActions) {
      for (const dataAction of permission.dataActions) {
        yield { type: 'Data Action', permission: dataAction };
      }
    }

    // Yield notDataActions
    if (permission.notDataActions) {
      for (const notDataAction of permission.notDataActions) {
        yield { type: 'Not Data Action', permission: notDataAction };
      }
    }
  }
}

/**
 * Extracts all permissions from a role and returns them grouped by type.
 * This is a convenience wrapper around flattenRolePermissions that returns arrays.
 *
 * @param role - The Azure role to extract permissions from
 * @returns Permissions grouped by type (actions, notActions, dataActions, notDataActions)
 *
 * @example
 * const { actions, dataActions } = getFlattenedPermissions(role);
 * console.log(`Actions: ${actions.join(', ')}`);
 */
export function getFlattenedPermissions(role: AzureRole): FlattenedPermissions {
  const result: FlattenedPermissions = {
    actions: [],
    notActions: [],
    dataActions: [],
    notDataActions: []
  };

  for (const permission of role.permissions) {
    result.actions.push(...permission.actions);
    result.notActions.push(...permission.notActions);
    if (permission.dataActions) {
      result.dataActions.push(...permission.dataActions);
    }
    if (permission.notDataActions) {
      result.notDataActions.push(...permission.notDataActions);
    }
  }

  return result;
}

/**
 * Counts total permissions in a role (across all four permission types).
 *
 * @param role - The Azure role to count permissions for
 * @returns Total number of permissions
 *
 * @example
 * const total = countTotalPermissions(role);
 * console.log(`This role has ${total} total permissions`);
 */
export function countTotalPermissions(role: AzureRole): number {
  let total = 0;
  for (const permission of role.permissions) {
    total += permission.actions.length;
    total += permission.notActions.length;
    if (permission.dataActions) {
      total += permission.dataActions.length;
    }
    if (permission.notDataActions) {
      total += permission.notDataActions.length;
    }
  }
  return total;
}
