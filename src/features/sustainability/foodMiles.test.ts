import { describe, expect, it } from 'vitest';
import { foodMilesSummary, quantityKg, type RegionalPrice } from './foodMiles';
import { itemEvidenceKey, type Evidence } from './evidence';
import type { Visit } from '../purchases/model';
const provenance = {
  source: 'Synthetic distance fixture',
  url: 'https://example.org/test',
  quality: 'regional-baseline' as const,
  assumptions: ['Fixture only, not observed farm data'],
};
const miles = (value: number): Evidence<'mile'> => ({ value, unit: 'mile', provenance });
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1000,
  items: [
    { id: 'a', product: 'Apples', quantity: 2, unit: 'kg' },
    { id: 'b', product: 'Bread', quantity: 1, unit: 'kg' },
  ],
};
describe('food miles', () => {
  it('uses kg·miles for the weighted sum and miles for the mass-weighted average', () => {
    const result = foodMilesSummary([visit], {
      [itemEvidenceKey('v', 'a')]: { distances: { conventional: miles(100), local: miles(20) } },
      [itemEvidenceKey('v', 'b')]: { distances: { conventional: miles(10), local: miles(30) } },
    });
    expect(result.weightedDifference).toMatchObject({ value: 140, unit: 'kg·mile' });
    expect(result.averageDifference.value).toBeCloseTo(140 / 3);
  });
  it('preserves negative differences and refuses whole-basket claims for partial data', () => {
    const result = foodMilesSummary([visit], {
      [itemEvidenceKey('v', 'a')]: { distances: { conventional: miles(10), local: miles(30) } },
    });
    expect(result.weightedDifference).toMatchObject({ value: null, knownSubtotal: -40, covered: 1 });
    expect(result.averageDifference).toMatchObject({ value: null, knownSubtotal: -20 });
    expect(foodMilesSummary([]).averageDifference.value).toBeNull();
    expect(
      foodMilesSummary([{ ...visit, items: [{ ...visit.items[0], quantity: 0 }] }]).averageDifference.value,
    ).toBeNull();
  });
  it('converts mass exactly without inventing count or volume weights', () => {
    expect(
      quantityKg({ ...visit.items[0], quantity: 1, unit: 'lb' }, { region: '', date: visit.date })?.kg,
    ).toBe(0.45359237);
    expect(
      quantityKg({ ...visit.items[0], quantity: 1000, unit: 'g' }, { region: '', date: visit.date })?.kg,
    ).toBe(1);
    expect(quantityKg({ ...visit.items[0], unit: 'each' }, { region: '', date: visit.date })).toBeNull();
  });
  it('only estimates mass with matching product, region, time and an item price', () => {
    const price: RegionalPrice = {
      product: 'Apples',
      region: 'MA',
      validFrom: '2026-10-01',
      validTo: '2026-10-31',
      price: { value: 5, unit: 'USD/kg', provenance },
    };
    const item = { ...visit.items[0], quantity: undefined, spendingCents: 1000 };
    expect(quantityKg(item, { region: 'MA', date: visit.date }, price)?.kg).toBe(2);
    expect(quantityKg(item, { region: 'CA', date: visit.date }, price)).toBeNull();
    expect(quantityKg(item, { region: 'MA', date: '2026-11-01' }, price)).toBeNull();
    expect(quantityKg(item, { region: 'MA', date: visit.date }, { ...price, product: 'Bread' })).toBeNull();
    expect(
      quantityKg({ ...item, spendingCents: undefined }, { region: 'MA', date: visit.date }, price),
    ).toBeNull();
  });
});
