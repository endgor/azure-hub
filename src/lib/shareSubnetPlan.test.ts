import { describe, it, expect } from 'vitest';
import {
  buildShareableSubnetPlan,
  serialiseShareableSubnetPlan,
  parseShareableSubnetPlan
} from './shareSubnetPlan';
import { inetAtov, NetworkType } from './subnet';
import type { LeafSubnet, SubnetTree } from './subnet';

const ip = (value: string) => inetAtov(value) as number;

function makePlan() {
  const base = ip('192.168.0.0');
  const tree: SubnetTree = {
    root: { id: 'root', network: base, prefix: 16, networkType: NetworkType.VNET, children: ['a', 'b'] },
    a: { id: 'a', network: base, prefix: 17, parentId: 'root', networkType: NetworkType.SUBNET },
    b: { id: 'b', network: ip('192.168.128.0'), prefix: 17, parentId: 'root' }
  };
  const leaves: LeafSubnet[] = [
    { ...tree.a, depth: 1 } as LeafSubnet,
    { ...tree.b, depth: 1 } as LeafSubnet
  ];

  return buildShareableSubnetPlan({
    baseNetwork: base,
    basePrefix: 16,
    useAzureReservations: true,
    leaves,
    rowColors: { a: '#ff0000' },
    rowComments: { a: '  web tier  ' },
    tree
  });
}

describe('buildShareableSubnetPlan', () => {
  it('captures both leaves plus the VNet parent, ordered by address', () => {
    const plan = makePlan();
    expect(plan.v).toBe(1);
    expect(plan.az).toBe(1);

    // Two leaves plus the locked VNet parent, which is not itself a leaf.
    expect(plan.leaves).toHaveLength(3);
    expect(plan.leaves.filter(l => l.p === 16)).toHaveLength(1);
    expect(plan.leaves.filter(l => l.p === 17)).toHaveLength(2);

    const addresses = plan.leaves.map(l => l.n);
    expect(addresses).toEqual([...addresses].sort((x, y) => x - y));
  });

  it('trims comments and omits empty optional fields', () => {
    const plan = makePlan();
    const first = plan.leaves.find(l => l.p === 17 && l.c)!;
    expect(first.m).toBe('web tier');
    expect(first.c).toBe('#ff0000');

    const untagged = plan.leaves.find(l => l.p === 17 && !l.c)!;
    expect(untagged.m).toBeUndefined();
    expect(untagged.t).toBeUndefined();
  });
});

describe('serialise / parse round trip', () => {
  it('survives base64url encoding', () => {
    const plan = makePlan();
    const restored = parseShareableSubnetPlan(serialiseShareableSubnetPlan(plan));
    expect(restored).toEqual(plan);
  });

  it('produces URL-safe output', () => {
    const encoded = serialiseShareableSubnetPlan(makePlan());
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it('round-trips non-ASCII comments', () => {
    const plan = makePlan();
    plan.leaves[0].m = 'kontor – Malmö 🇸🇪';
    const restored = parseShareableSubnetPlan(serialiseShareableSubnetPlan(plan));
    expect(restored?.leaves[0].m).toBe('kontor – Malmö 🇸🇪');
  });
});

describe('parseShareableSubnetPlan validation', () => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

  it('rejects unparseable or structurally wrong input', () => {
    expect(parseShareableSubnetPlan('not-base64!!')).toBeNull();
    expect(parseShareableSubnetPlan(encode(null))).toBeNull();
    expect(parseShareableSubnetPlan(encode({ v: 2, net: 0, pre: 16, leaves: [] }))).toBeNull();
    expect(parseShareableSubnetPlan(encode({ v: 1, net: 'x', pre: 16, leaves: [] }))).toBeNull();
    expect(parseShareableSubnetPlan(encode({ v: 1, net: 0, pre: 16 }))).toBeNull();
  });

  it('refuses plans outside RFC 1918', () => {
    expect(parseShareableSubnetPlan(encode({
      v: 1, net: ip('8.8.8.0'), pre: 24, leaves: [{ n: ip('8.8.8.0'), p: 24 }]
    }))).toBeNull();
  });

  it('requires at least one valid leaf', () => {
    expect(parseShareableSubnetPlan(encode({
      v: 1, net: ip('10.0.0.0'), pre: 8, leaves: [{ n: 'nope', p: 24 }]
    }))).toBeNull();
  });

  it('drops invalid colours and caps comment length', () => {
    const restored = parseShareableSubnetPlan(encode({
      v: 1,
      net: ip('10.0.0.0'),
      pre: 8,
      leaves: [{ n: ip('10.0.0.0'), p: 24, c: 'javascript:alert(1)', m: 'x'.repeat(5000) }]
    }));
    expect(restored?.leaves[0].c).toBeUndefined();
    expect(restored?.leaves[0].m).toHaveLength(2000);
  });

  it('only honours the single-subnet flag on VNet leaves', () => {
    const asSubnet = parseShareableSubnetPlan(encode({
      v: 1, net: ip('10.0.0.0'), pre: 8, leaves: [{ n: ip('10.0.0.0'), p: 24, t: 's', f: 1 }]
    }));
    expect(asSubnet?.leaves[0].f).toBeUndefined();

    const asVnet = parseShareableSubnetPlan(encode({
      v: 1, net: ip('10.0.0.0'), pre: 8, leaves: [{ n: ip('10.0.0.0'), p: 24, t: 'v', f: 1 }]
    }));
    expect(asVnet?.leaves[0].f).toBe(1);
  });
});
