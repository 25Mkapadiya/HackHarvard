import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, rank, recommend, regionalMarkets, reportedMarkets } from './ranking';
import type { Crop } from '../../types';
import type { MarketView } from '../../lib/filters';
const crop = {
  id: 'apple',
  name: 'Apple',
  nameEs: 'Manzana',
  category: 'fruits',
  months: { NE: [10], SW: [8] },
} satisfies Crop;
const market = (state: string, sample = false) =>
  ({
    id: state,
    state,
    geo: { lat: 42, lng: -71 },
    products: ['fruits'],
    productsAreSample: sample,
  }) as MarketView;
describe('seasonal ranking', () => {
  it('uses configured weights and redistributes missing signals', () => {
    expect(rank({ A: 1, M: 0, P: 1, R: 0 })).toBeCloseTo(0.6);
    expect(rank({ A: 1 })).toBe(1);
    expect(rank({})).toBeNull();
    expect(rank({ A: 1 }, { ...DEFAULT_WEIGHTS, A: 0, M: 0, P: 0, R: 0 })).toBeNull();
    expect(() => rank({ A: NaN })).toThrow();
    expect(() => rank({}, { ...DEFAULT_WEIGHTS, P: -1 })).toThrow();
  });
  it('responds to region and month without inventing missing calendars', () => {
    expect(recommend([crop], 'NE', 10, [])[0].signals.A).toBe(1);
    expect(recommend([crop], 'SW', 10, [])[0].signals.A).toBe(0);
    expect(recommend([crop], 'unknown', 10, [])[0].score).toBeNull();
  });
  it('excludes sample availability and filters the selected region and radius', () => {
    expect(reportedMarkets(crop, [market('MA', true)])).toEqual([]);
    expect(regionalMarkets([market('MA'), market('CA')], ['MA'], { lat: 42, lng: -71 })).toHaveLength(1);
    expect(regionalMarkets([market('MA')], ['MA'], { lat: 0, lng: 0 }, 50)).toEqual([]);
  });
});
