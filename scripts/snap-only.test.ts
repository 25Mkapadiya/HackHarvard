import { cleanSnapName, snapLocationType, snapOnlyClusters } from './snap-only';
import type { SourceMarket } from './lib/types';

const rec = (over: Partial<SourceMarket>): SourceMarket => ({
  source: 'usda-snap-retailers',
  sourceName: 'SNAP',
  sourceId: '1',
  sourceUrl: '',
  fetchedAt: '2026-10-17',
  name: 'Hilltop Farm',
  city: 'Town',
  state: 'VT',
  lat: 44,
  lng: -72.5,
  programs: ['snap'],
  paymentMethods: [],
  products: [],
  lastUpdated: '2026-10-17',
  confirmOnly: true,
  ...over,
});

describe('SNAP-only locations', () => {
  it('classifies markets vs farm stands', () => {
    expect(snapLocationType('WESTFIELD FARMERS MARKET')).toBe('farmers_market');
    expect(snapLocationType('Downtown Mkt Assoc')).toBe('farmers_market');
    expect(snapLocationType('Nubia Farms NAFMNP')).toBe('farm_stand');
  });
  it('cleans retailer names', () => {
    expect(cleanSnapName('SMITH FAMILY FARM LLC NAFMNP 2')).toBe('Smith Family Farm LLC');
    expect(cleanSnapName('Stoneham Farmers Market 285')).toBe('Stoneham Farmers Market');
  });
  it('collapses the same retailer listed twice', () => {
    const c = snapOnlyClusters([
      rec({}),
      rec({ sourceId: '2', name: 'HILLTOP FARM', lat: 44.0005 }),
      rec({ sourceId: '3', name: 'Valley Farm' }),
    ]);
    expect(c).toHaveLength(2);
    expect(c[0].confirmations).toHaveLength(1);
    expect(c[0].records[0]).toMatchObject({ confirmOnly: false, type: 'farm_stand', name: 'Hilltop Farm' });
  });
});
