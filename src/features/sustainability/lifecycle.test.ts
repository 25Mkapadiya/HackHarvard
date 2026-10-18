import { describe, expect, it } from 'vitest';
import { lifecycleSummary, type LifecycleComparison } from './lifecycle';
import { itemEvidenceKey } from './evidence';
import type { Visit } from '../purchases/model';
const provenance = {
  source: 'Synthetic compatible LCA fixture',
  url: 'https://example.org/test',
  quality: 'product-baseline' as const,
  assumptions: ['Test arithmetic only; not actual product impact data'],
};
const component = <S extends string>(value: number, name: S) => ({
  value,
  unit: 'kg CO2e/kg-product' as const,
  component: name,
  provenance,
});
const scenario = (c: number, t: number, r: number) => ({
  production: component(c, 'agriculture-and-land-use-excluding-freight-and-other'),
  freight: component(t, 'well-to-wheel-freight-only'),
  other: component(r, 'processing-storage-packaging-retail-excluding-production-and-freight'),
});
const comparison: LifecycleComparison = {
  product: 'Apples',
  boundary: 'cradle-to-retail',
  functionalUnit: 'kg-product-as-purchased',
  allocation: 'mass',
  gwp: 'IPCC-AR5-100',
  local: scenario(3, 0.2, 0.4),
  conventional: scenario(2, 0.5, 0.1),
};
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1000,
  items: [{ id: 'a', product: 'Apples', quantity: 2, unit: 'kg' }],
};
describe('life-cycle CO2e', () => {
  it('sums three mutually exclusive stages once and preserves a negative result', () => {
    const result = lifecycleSummary([visit], { [itemEvidenceKey('v', 'a')]: { lifecycle: comparison } });
    expect(result.value).toBeCloseTo(-2);
    expect(result.sources).toHaveLength(6);
    expect(result.methodVersion).toBe('market-impact/1.0.0');
    expect(result.assumptions.join(' ')).toContain('Never add');
  });
  it('refuses mismatched boundaries, functional units, product, or missing stages', () => {
    for (const patch of [
      { boundary: 'cradle-to-farmgate' },
      { functionalUnit: 'kg-edible-food' },
      { gwp: 'AR6' },
      { product: 'Beef' },
      { local: { ...comparison.local, freight: undefined } },
    ]) {
      const invalid = { ...comparison, ...patch } as unknown as LifecycleComparison;
      expect(
        lifecycleSummary([visit], { [itemEvidenceKey('v', 'a')]: { lifecycle: invalid } }).value,
      ).toBeNull();
    }
    expect(lifecycleSummary([visit]).quality).toBe('unavailable');
  });
  it('does not turn partially covered baskets into total savings', () => {
    const result = lifecycleSummary(
      [{ ...visit, items: [...visit.items, { id: 'b', product: 'Eggs', quantity: 12, unit: 'each' }] }],
      { [itemEvidenceKey('v', 'a')]: { lifecycle: comparison } },
    );
    expect(result).toMatchObject({
      value: null,
      knownSubtotal: -2,
      quality: 'partial',
      covered: 1,
      expected: 2,
    });
  });
});
