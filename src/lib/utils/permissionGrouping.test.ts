import { describe, it, expect } from 'vitest';
import {
  classifyPermission,
  groupPermissions,
  summarizePermissions,
} from './permissionGrouping';

describe('classifyPermission - azure', () => {
  it('buckets by the trailing operation verb', () => {
    expect(classifyPermission('Microsoft.Compute/virtualMachines/read', 'azure')).toBe('read');
    expect(classifyPermission('Microsoft.Compute/virtualMachines/write', 'azure')).toBe('write');
    expect(classifyPermission('Microsoft.Compute/virtualMachines/delete', 'azure')).toBe('delete');
    expect(classifyPermission('Microsoft.Compute/virtualMachines/start/action', 'azure')).toBe('action');
  });

  it('treats wildcards as their own group', () => {
    expect(classifyPermission('*', 'azure')).toBe('wildcard');
    expect(classifyPermission('Microsoft.Insights/alertRules/*', 'azure')).toBe('wildcard');
  });

  it('is case insensitive on the verb', () => {
    expect(classifyPermission('Microsoft.Authorization/roleAssignments/Delete', 'azure')).toBe('delete');
  });

  it('falls back to other for unrecognised verbs', () => {
    expect(classifyPermission('Microsoft.Storage/storageAccounts/listkeys', 'azure')).toBe('other');
  });
});

describe('classifyPermission - entraid', () => {
  it('buckets CRUD verbs', () => {
    expect(classifyPermission('microsoft.directory/users/standard/read', 'entraid')).toBe('read');
    expect(classifyPermission('microsoft.directory/groups/create', 'entraid')).toBe('create');
    expect(classifyPermission('microsoft.directory/users/basic/update', 'entraid')).toBe('update');
    expect(classifyPermission('microsoft.directory/groups/delete', 'entraid')).toBe('delete');
  });

  it('treats createAsOwner as a create', () => {
    expect(classifyPermission('microsoft.directory/applications/createAsOwner', 'entraid')).toBe('create');
  });

  it('treats allTasks as a wildcard because it covers every operation', () => {
    expect(classifyPermission('microsoft.directory/allEntities/allTasks', 'entraid')).toBe('wildcard');
    expect(classifyPermission('microsoft.azure.serviceHealth/allEntities/allTasks', 'entraid')).toBe('wildcard');
  });

  it('treats explicit wildcards as wildcards', () => {
    expect(classifyPermission('microsoft.directory/*', 'entraid')).toBe('wildcard');
    expect(classifyPermission('microsoft.directory/users/*', 'entraid')).toBe('wildcard');
  });

  it('groups resource-specific operations as actions', () => {
    expect(classifyPermission('microsoft.directory/users/invalidateAllRefreshTokens', 'entraid')).toBe('action');
    expect(classifyPermission('microsoft.directory/deletedItems.groups/restore', 'entraid')).toBe('action');
    expect(classifyPermission('microsoft.directory/servicePrincipals/synchronizationCredentials/manage', 'entraid')).toBe('action');
  });

  it('does not misread an azure-style verb tail', () => {
    expect(classifyPermission('microsoft.directory/users/password/update', 'entraid')).toBe('update');
  });

  it('returns other for a namespace with no operation', () => {
    expect(classifyPermission('microsoft.directory', 'entraid')).toBe('other');
  });
});

describe('groupPermissions', () => {
  it('keeps every permission in exactly one bucket', () => {
    const permissions = [
      'microsoft.directory/users/standard/read',
      'microsoft.directory/groups/create',
      'microsoft.directory/users/basic/update',
      'microsoft.directory/groups/delete',
      'microsoft.directory/users/*',
      'microsoft.directory/users/invalidateAllRefreshTokens',
    ];
    const groups = groupPermissions(permissions, 'entraid');
    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);

    expect(total).toBe(permissions.length);
    expect(groups.read).toEqual(['microsoft.directory/users/standard/read']);
    expect(groups.create).toEqual(['microsoft.directory/groups/create']);
    expect(groups.wildcard).toEqual(['microsoft.directory/users/*']);
  });
});

describe('summarizePermissions', () => {
  it('returns only non-empty groups, in display order', () => {
    const summary = summarizePermissions(
      [
        'microsoft.directory/groups/delete',
        'microsoft.directory/users/standard/read',
        'microsoft.directory/groups/create',
        'microsoft.directory/users/memberOf/read',
      ],
      'entraid'
    );

    expect(summary).toEqual([
      { group: 'read', count: 2 },
      { group: 'create', count: 1 },
      { group: 'delete', count: 1 },
    ]);
  });

  it('uses the azure ordering for azure permissions', () => {
    const summary = summarizePermissions(
      ['Microsoft.Compute/virtualMachines/start/action', 'Microsoft.Compute/virtualMachines/read'],
      'azure'
    );

    expect(summary.map(entry => entry.group)).toEqual(['read', 'action']);
  });
});
