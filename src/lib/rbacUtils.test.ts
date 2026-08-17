import { describe, it, expect } from 'vitest';
import { calculatePermissionCount } from './rbacUtils';

const role = (permissions: Array<{
  actions: string[];
  notActions: string[];
  dataActions?: string[];
  notDataActions?: string[];
}>) => ({ permissions });

describe('calculatePermissionCount', () => {
  it('scores a full wildcard highest', () => {
    expect(calculatePermissionCount(role([{ actions: ['*'], notActions: [] }]))).toBe(10000);
  });

  it('scores specific actions at one point each', () => {
    const count = calculatePermissionCount(role([{
      actions: ['Microsoft.Storage/read', 'Microsoft.Storage/write'],
      notActions: []
    }]));
    expect(count).toBe(2);
  });

  it('ranks Owner above Contributor above Reader above a narrow role', () => {
    const owner = calculatePermissionCount(role([{ actions: ['*'], notActions: [] }]));
    const contributor = calculatePermissionCount(role([{
      actions: ['*'],
      notActions: ['Microsoft.Authorization/*/Delete', 'Microsoft.Authorization/*/Write']
    }]));
    const reader = calculatePermissionCount(role([{ actions: ['*/read'], notActions: [] }]));
    const narrow = calculatePermissionCount(role([{
      actions: ['Microsoft.Storage/storageAccounts/read'],
      notActions: []
    }]));

    expect(owner).toBeGreaterThan(contributor);
    expect(contributor).toBeGreaterThan(reader);
    expect(reader).toBeGreaterThan(narrow);
  });

  it('subtracts for deny lists', () => {
    const allow = role([{ actions: ['Microsoft.Storage/read'], notActions: [] }]);
    const allowWithDenies = role([{
      actions: ['Microsoft.Storage/read'],
      notActions: ['Microsoft.Storage/write', 'Microsoft.Storage/delete']
    }]);
    expect(calculatePermissionCount(allowWithDenies)).toBeLessThan(calculatePermissionCount(allow));
  });

  it('counts data actions alongside control actions', () => {
    const withData = calculatePermissionCount(role([{
      actions: ['Microsoft.Storage/read'],
      notActions: [],
      dataActions: ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read']
    }]));
    expect(withData).toBe(2);
  });

  it('narrows the score as a partial wildcard gets more specific', () => {
    const broad = calculatePermissionCount(role([{ actions: ['Microsoft.Storage/*'], notActions: [] }]));
    const narrower = calculatePermissionCount(role([{
      actions: ['Microsoft.Storage/storageAccounts/*/read'],
      notActions: []
    }]));
    expect(broad).toBeGreaterThan(narrower);
  });

  it('never returns a negative score', () => {
    const denyHeavy = role([{
      actions: [],
      notActions: Array.from({ length: 50 }, (_, i) => `Microsoft.Storage/deny${i}`)
    }]);
    expect(calculatePermissionCount(denyHeavy)).toBe(0);
  });

  it('handles a role with no permissions', () => {
    expect(calculatePermissionCount(role([]))).toBe(0);
  });
});
