import { describe, expect, it } from 'vitest';
import { seasonalCatalog, validateCatalog, productMatches } from './catalog/catalog';
import { nearbyState, recommendForPlace, regionForState, resolveSeason } from './recommendations';
import { CropCalendar, type Crop } from '../../types';
import legacy from '../../../data/manual/crop-calendar.json';
import type { MarketView } from '../../lib/filters';
const calendar = CropCalendar.parse(legacy);
const crop = (id: string): Crop => {
  const p = seasonalCatalog.products.find((p) => p.id === id)!;
  return calendar.crops.find((c) => c.id === id) ?? { ...p, months: {} };
};
const fresh = () => structuredClone(seasonalCatalog);
describe('source-backed seasonal calendars', () => {
  it.each([
    ['MA', 'strawberries', 6],
    ['NY', 'apples', 10],
    ['CA', 'pumpkins', 10],
    ['FL', 'strawberries', 1],
    ['TX', 'pecans', 12],
    ['WA', 'apples', 10],
    ['MI', 'blueberries', 8],
    ['GA', 'peaches', 6],
  ])('resolves %s %s for month %s', (state, id, month) => {
    expect(resolveSeason(crop(id), state, regionForState(calendar, state), Number(month))).toMatchObject({
      level: 'verified-state',
      active: true,
    });
  });
  it('does not replace an out-of-season state record with an approximate summer window', () => {
    const result = resolveSeason(crop('strawberries'), 'FL', 'SE', 7);
    expect(result).toMatchObject({ level: 'verified-state', active: false });
    expect(result.status).toContain('Outside documented harvest');
  });
  it('distinguishes storage, general availability, peak and extended seasons', () => {
    expect(resolveSeason(crop('apples'), 'MI', 'MW', 1).status).toContain('storage');
    expect(resolveSeason(crop('apples'), 'NY', 'NE', 1).status).toContain('harvest unspecified');
    expect(resolveSeason(crop('apples'), 'WA', 'NW', 10).status).toContain('peak harvest');
    expect(resolveSeason(crop('strawberries'), 'MI', 'MW', 9).status).toContain('Extended season');
    expect(resolveSeason(crop('basil'), 'GA', 'SE', 10).status).toContain('Limited availability');
  });
  it('falls back per food, without making a whole state verified', () => {
    expect(resolveSeason(crop('apples'), 'MA', 'NE', 10).level).toBe('approximate');
    expect(resolveSeason(crop('apples'), 'AZ', 'SW', 8).level).toBe('approximate');
    expect(resolveSeason(crop('blackberries'), 'AZ', 'SW', 8).level).toBe('unknown');
  });
  it.each(['AK', 'HI', 'PR', 'ZZ'])('keeps unsupported %s unknown', (state) => {
    const region = regionForState(calendar, state);
    expect(region).toBeUndefined();
    expect(resolveSeason(crop('apples'), state, region, 10)).toMatchObject({
      level: 'unknown',
      active: undefined,
    });
  });
  it('uses explicitly applicable broader sources before approximations, but state evidence first', () => {
    const data = fresh();
    data.sources.push({ ...data.sources[0], id: 'test-region', states: ['MA', 'ME'] });
    data.records.push({
      product: 'apples',
      scope: { kind: 'region', id: 'test-ne', states: ['MA', 'ME'] },
      windows: [{ kind: 'harvest', months: [9] }],
      sourceIds: ['test-region'],
      locator: 'Test-only regional fixture',
    });
    const checked = validateCatalog(data);
    expect(resolveSeason(crop('apples'), 'MA', 'NE', 9, checked).level).toBe('verified-region');
    expect(resolveSeason(crop('strawberries'), 'MA', 'NE', 6, checked).level).toBe('verified-state');
    expect(resolveSeason(crop('apples'), 'VT', 'NE', 9, checked).level).toBe('approximate');
  });
  it('keeps missing ranking signals absent; category reports are not crop inventory', () => {
    const unknown = recommendForPlace([crop('blackberries')], 'AK', undefined, 1, [])[0];
    expect(unknown.score).toBeNull();
    const market = {
      id: '1',
      state: 'AK',
      geo: { lat: 64, lng: -147 },
      products: ['fruits'],
      productsAreSample: false,
    } as MarketView;
    const reported = recommendForPlace([crop('blackberries')], 'AK', undefined, 1, [market])[0];
    expect(reported.signals).toEqual({ A: undefined, M: 1 });
    expect(reported.signals.P).toBeUndefined();
    expect(reported.season.level).toBe('unknown');
  });
  it('never infers a distant state from the directory', () => {
    const markets = [{ id: 'boston', state: 'MA', geo: { lat: 42.36, lng: -71.06 } }] as MarketView[];
    expect(nearbyState(markets, { lat: 42.36, lng: -71.06 })).toBe('MA');
    expect(nearbyState(markets, { lat: 21.3, lng: -157.8 })).toBeUndefined();
  });
  it.each([
    ['apples', 'apple'],
    ['summer_squash', 'courgette'],
    ['green_beans', 'snap bean'],
    ['scallions', 'green onion'],
    ['apples', 'manzanas'],
  ])('matches %s alias %s', (id, query) => {
    expect(productMatches(crop(id), query)).toBe(true);
  });
  it('does not turn a specific orange or bell pepper into an alias of a broad crop', () => {
    expect(productMatches(crop('citrus'), 'orange')).toBe(false);
    expect(productMatches(crop('peppers'), 'bell pepper')).toBe(false);
  });
  it.each([0, 13, 1.5, NaN])('rejects invalid displayed month %s', (month) => {
    expect(() => resolveSeason(crop('apples'), 'NY', 'NE', month)).toThrow();
  });
});
describe('offline import validation', () => {
  it('accepts reviewed catalog and corroborating references on one record', () => {
    const data = fresh();
    data.sources.push({ ...data.sources[0], id: 'corroboration' });
    data.records[0].sourceIds.push('corroboration');
    expect(validateCatalog(data).records).toHaveLength(113);
  });
  it.each([
    'month',
    'product',
    'source',
    'metadata',
    'alias',
    'scope',
    'conflict',
    'duplicate',
    'date',
    'kind',
  ])('rejects invalid %s', (failure) => {
    const data = fresh();
    if (failure === 'month') data.records[0].windows[0].months = [0, 13];
    if (failure === 'product') data.records[0].product = 'not_a_food';
    if (failure === 'source') data.records[0].sourceIds = ['missing'];
    if (failure === 'metadata') data.sources[0].organization = '';
    if (failure === 'alias') data.products[1].aliases.push(data.products[0].name);
    if (failure === 'scope') data.records[0].scope.states = ['HI'];
    if (failure === 'date') data.sources[0].published = '2099-01-01';
    if (failure === 'kind') data.records[0].windows.push(data.records[0].windows[0]);
    if (failure === 'conflict' || failure === 'duplicate') {
      const record = structuredClone(data.records[0]);
      if (failure === 'conflict') record.windows[0].months = [1];
      data.records.push(record);
    }
    expect(() => validateCatalog(data)).toThrow();
  });
});
