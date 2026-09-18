import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toCliRoleRecord, toCliTimestamp } from './updateRbacData';

type CommittedRole = Record<string, unknown> & {
  id: string;
  name: string;
  type: string;
  permissions: Array<Record<string, unknown>>;
};

const committed: CommittedRole[] = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'data', 'roles-extended.json'), 'utf8'),
);

/** Rebuild the ARM payload a committed record must have come from, so the mapper can be
 *  checked against real data rather than a hand-written fixture. */
function toArmPayload(role: CommittedRole) {
  const armTimestamp = (value: unknown) =>
    typeof value === 'string' ? `${value.replace('+00:00', '').padEnd(27, '0')}Z` : undefined;

  return {
    id: role.id,
    name: role.name,
    type: role.type,
    properties: {
      roleName: role.roleName as string,
      description: role.description as string,
      type: role.roleType as string,
      assignableScopes: role.assignableScopes as string[],
      createdOn: armTimestamp(role.createdOn),
      updatedOn: armTimestamp(role.updatedOn),
      // ARM omits these where the CLI wrote null, but real roles do carry
      // values like "SYSTEM", a username, or an empty string.
      createdBy: (role.createdBy as string | null) ?? undefined,
      updatedBy: (role.updatedBy as string | null) ?? undefined,
      permissions: role.permissions.map((permission) => ({
        actions: permission.actions as string[],
        notActions: permission.notActions as string[],
        dataActions: permission.dataActions as string[],
        notDataActions: permission.notDataActions as string[],
        // ARM returns these only where a condition is actually set.
        condition: (permission.condition as string | null) ?? undefined,
        conditionVersion: (permission.conditionVersion as string | null) ?? undefined,
      })),
    },
  };
}

/** The computed fields extendRoleData appends after mapping. */
const COMPUTED = ['permissionCount', 'dataActions', 'notDataActions'];

describe('toCliTimestamp', () => {
  it('converts an ARM 7-digit UTC timestamp to the CLI 6-digit +00:00 form', () => {
    expect(toCliTimestamp('2018-10-29T17:52:32.5201170Z')).toBe('2018-10-29T17:52:32.520117+00:00');
  });

  it('drops a zero fraction the way Python isoformat did', () => {
    expect(toCliTimestamp('2021-11-11T20:13:07.0000000Z')).toBe('2021-11-11T20:13:07+00:00');
    expect(toCliTimestamp('2021-11-11T20:13:07Z')).toBe('2021-11-11T20:13:07+00:00');
  });

  it('pads a short fraction to microseconds', () => {
    expect(toCliTimestamp('2021-11-11T20:13:07.5Z')).toBe('2021-11-11T20:13:07.500000+00:00');
  });

  it('maps a missing timestamp to null', () => {
    expect(toCliTimestamp(undefined)).toBeNull();
    expect(toCliTimestamp(null)).toBeNull();
  });
});

describe('toCliRoleRecord', () => {
  it('reproduces every committed role exactly, including key order', () => {
    expect(committed.length).toBeGreaterThan(900);

    for (const role of committed) {
      const expected = { ...role };
      for (const field of COMPUTED) delete expected[field];

      const mapped = toCliRoleRecord(toArmPayload(role)) as unknown as Record<string, unknown>;

      expect(mapped).toEqual(expected);
      expect(Object.keys(mapped)).toEqual(Object.keys(expected));
    }
  });

  it('defaults the fields ARM omits rather than dropping them', () => {
    const mapped = toCliRoleRecord({
      id: '/subscriptions/sub/providers/Microsoft.Authorization/roleDefinitions/abc',
      name: 'abc',
      type: 'Microsoft.Authorization/roleDefinitions',
      properties: { roleName: 'Minimal', type: 'BuiltInRole', permissions: [{ actions: ['a/read'] }] },
    }) as unknown as Record<string, unknown>;

    expect(mapped.description).toBe('');
    expect(mapped.assignableScopes).toEqual([]);
    expect(mapped.createdBy).toBeNull();
    expect(mapped.createdOn).toBeNull();
    expect(mapped.systemData).toBeNull();
    expect(mapped.permissions).toEqual([
      {
        actions: ['a/read'],
        condition: null,
        conditionVersion: null,
        dataActions: [],
        notActions: [],
        notDataActions: [],
      },
    ]);
  });
});
