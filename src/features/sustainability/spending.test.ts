import { describe, expect, it } from 'vitest';
import { spendingSummary } from './spending';
import { itemEvidenceKey, type Evidence } from './evidence';
import type { Visit } from '../purchases/model';
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '2026-10-17T12:00Z',
  totalCents: 1000,
  items: [
    { id: 'a', product: 'Apples', quantity: 2, unit: 'kg', spendingCents: 600 },
    { id: 'b', product: 'Bread', unit: 'loaf', spendingCents: 400 },
  ],
};
const fraction = (value: number): Evidence<'fraction'> => ({
  value,
  unit: 'fraction',
  provenance: {
    source: 'Test origin evidence',
    url: 'https://example.org/origin',
    assumptions: ['Synthetic fixture, not real farm evidence'],
    quality: 'measured',
  },
});
describe('visits and spending', () => {
  it('counts trips and distinct markets, not products', () => {
    expect(spendingSummary([visit, { ...visit, submissionId: 'v2' }])).toMatchObject({
      visits: 2,
      uniqueMarkets: 1,
      marketSpendingCents: 2000,
    });
    expect(spendingSummary([])).toMatchObject({ visits: 0, uniqueMarkets: 0, marketSpendingCents: 0 });
    expect(() => spendingSummary([visit, visit])).toThrow('Duplicate');
  });
  it('keeps unknown attribution distinct from zero local spending', () => {
    expect(spendingSummary([visit]).localSpending.value).toBeNull();
    const local = { [itemEvidenceKey('v', 'a')]: fraction(0.5), [itemEvidenceKey('v', 'b')]: fraction(0) };
    expect(spendingSummary([visit], local).localSpending.value).toBe(3);
    delete local[itemEvidenceKey('v', 'b')];
    expect(spendingSummary([visit], local).localSpending).toMatchObject({
      value: null,
      knownSubtotal: 3,
      quality: 'partial',
    });
  });
  it('does not silently allocate unpriced trip remainder or accept invalid fractions', () => {
    expect(
      spendingSummary([{ ...visit, totalCents: 1500 }], {
        [itemEvidenceKey('v', 'a')]: fraction(1),
        [itemEvidenceKey('v', 'b')]: fraction(1),
      }).localSpending.value,
    ).toBeNull();
    expect(spendingSummary([visit], { [itemEvidenceKey('v', 'a')]: fraction(2) }).localSpending.covered).toBe(
      0,
    );
  });
});
