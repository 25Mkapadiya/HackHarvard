import { dedupe, jaroWinkler, mergeCluster } from './dedupe';
import type { SourceMarket } from './lib/types';

const rec = (over: Partial<SourceMarket>): SourceMarket => ({
  source: 'a',
  sourceName: 'A',
  sourceId: '1',
  sourceUrl: '',
  fetchedAt: '2026-10-17',
  name: 'Central Square',
  city: 'Cambridge',
  state: 'MA',
  lat: 42.3651,
  lng: -71.1037,
  programs: [],
  paymentMethods: [],
  products: [],
  lastUpdated: '2023',
  ...over,
});

describe('jaroWinkler', () => {
  it('scores identical strings 1 and unrelated strings low', () => {
    expect(jaroWinkler('copley square', 'copley square')).toBe(1);
    expect(jaroWinkler('copley', 'harvard university')).toBeLessThan(0.8);
  });
  it('shared suffixes score high, which is why the 150 m gate matters', () => {
    expect(jaroWinkler('copley square', 'dewey square')).toBeGreaterThan(0.8);
  });
  it('tolerates small typos', () =>
    expect(jaroWinkler('central square', 'centrl square')).toBeGreaterThan(0.9));
});

describe('dedupe', () => {
  it('merges the same market from two sources within 150 m', () => {
    const { clusters, log } = dedupe([
      rec({}),
      rec({
        source: 'b',
        sourceId: '9',
        name: 'Central Square Farmers Market',
        lat: 42.3655,
        lastUpdated: '2024',
        programs: ['hip'],
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(log).toHaveLength(1);
    const merged = mergeCluster(clusters[0]);
    expect(merged.source).toBe('b'); // most recently updated wins
    expect(merged.programs).toEqual(['hip']);
  });
  it('does not merge records more than 150 m apart', () => {
    expect(dedupe([rec({}), rec({ source: 'b', lat: 42.368 })]).clusters).toHaveLength(2);
  });
  it('does not merge different names at the same spot', () => {
    expect(dedupe([rec({}), rec({ source: 'b', name: 'Harvard University' })]).clusters).toHaveLength(2);
  });
  it('never merges two records from the same source (summer vs winter)', () => {
    expect(dedupe([rec({}), rec({ sourceId: '2', winter: true })]).clusters).toHaveLength(2);
  });
  it('keeps summer and winter markets apart across sources too', () => {
    expect(dedupe([rec({ winter: false }), rec({ source: 'b', winter: true })]).clusters).toHaveLength(2);
  });
  it('attaches confirm-only SNAP records without creating markets', () => {
    const { clusters } = dedupe([
      rec({}),
      rec({ source: 'snap', name: 'Central Square Farmers Market', programs: ['snap'], confirmOnly: true }),
      rec({
        source: 'snap',
        sourceId: '3',
        name: 'Some Farm',
        lat: 42.5,
        programs: ['snap'],
        confirmOnly: true,
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(mergeCluster(clusters[0]).programs).toEqual(['snap']);
  });
  it('treats a differently named SNAP retailer at the same site as a vendor there', () => {
    const { clusters, unmatched } = dedupe([
      rec({}),
      rec({ source: 'snap', name: 'Nubia Farms', lat: 42.3653, programs: ['snap'], confirmOnly: true }),
      rec({
        source: 'snap',
        sourceId: '4',
        name: 'Hilltop Farm',
        lat: 42.37,
        programs: ['snap'],
        confirmOnly: true,
      }),
    ]);
    expect(mergeCluster(clusters[0]).programs).toEqual(['snap']);
    expect(unmatched.map((u) => u.name)).toEqual(['Hilltop Farm']);
  });
});
