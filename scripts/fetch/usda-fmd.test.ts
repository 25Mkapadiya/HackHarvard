import { usdaToMarkets, usdaUpdated } from './usda-fmd';
import { stateCode } from '../lib/states';

const feature = (p: Record<string, unknown>) => ({
  properties: {
    FMID: 1,
    marketname: 'Test Market',
    city: 'Town',
    x: -71.06,
    y: 42.36,
    state: 'Massachusetts',
    ...p,
  },
  geometry: null,
});
const run = (...ps: Record<string, unknown>[]) =>
  usdaToMarkets({ type: 'FeatureCollection', features: ps.map(feature) }, '2026-10-17');

describe('USDA directory mapping', () => {
  it('maps benefit flags, credit and products', () => {
    const [m] = run({
      SNAP: 'Y',
      WIC: 'Y',
      SFMNP: 'N',
      WICcash: 'Y',
      credit: 'Y',
      veggies: 'Y',
      bakedgoods: 'Y',
      fruit: 'N',
    });
    expect(m.programs).toEqual(['snap', 'wic_fmnp', 'wic_cvb']);
    expect(m.paymentMethods).toEqual(['credit']);
    expect(m.products.sort()).toEqual(['baked_goods', 'vegetables']);
    expect(m.state).toBe('MA');
  });
  it('keeps only the contiguous US and DC', () => {
    const kept = run(
      { FMID: 1, state: 'Hawaii', x: -157.8, y: 21.3 },
      { FMID: 2, state: 'Alaska', x: -149.9, y: 61.2 },
      { FMID: 3, state: 'Virgin Islands', x: -64.9, y: 18.3 },
      { FMID: 4, state: 'District of Columbia', x: -77.03, y: 38.9 },
      { FMID: 5, state: 'Calafornia', x: -118.2, y: 34.05 },
      { FMID: 6, state: 'Texas', x: 0, y: 0 },
    );
    expect(kept.map((m) => m.state)).toEqual(['DC', 'CA']);
  });
  it('drops program-wide placeholder rows', () =>
    expect(run({ city: 'Various Cities and Towns' })).toEqual([]));
  it('parses update stamps', () => {
    expect(usdaUpdated('3/31/14 20:18')).toBe('2014-03-31');
    expect(usdaUpdated('2009')).toBe('2009');
  });
  it('normalizes state names', () => {
    expect(stateCode('new york')).toBe('NY');
    expect(stateCode('Virigina')).toBe('VA');
    expect(stateCode('Narnia')).toBeUndefined();
  });
});
