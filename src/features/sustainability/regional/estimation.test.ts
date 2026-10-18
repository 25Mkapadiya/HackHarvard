import { describe, expect, it } from 'vitest';
import type { Visit } from '../../purchases/model';
import { itemEvidenceKey } from '../evidence';
import { freightKgCO2ePerKgMile, transportSummary } from '../transport';
import { regionalCatalog, validateRegionalCatalog } from './catalog';
import { lookupRegionalScenarios, resolveRegionalVisits } from './food';
import { alternativeFreight, regionalFreightSummary } from './freight';
import { originSensitivity } from './sensitivity';
const now = new Date('2026-10-18T12:00:00Z');
// All transactions and destinations below are synthetic fixtures, not observed routes.
const market = { id: 'synthetic-market', state: 'MA', geo: { lat: 42.36, lng: -71.06 } };
const visit: Visit = {
  submissionId: 'synthetic-visit',
  marketId: market.id,
  date: '2026-10-17',
  submittedAt: now.toISOString(),
  totalCents: 1000,
  items: [{ id: 'i', product: 'Apples', unit: 'kg', quantity: 2 }],
};
const lookup = (
  product = 'Apples',
  date = '2026-10-17',
  state = 'MA',
  unit: Visit['items'][number]['unit'] = 'kg',
) =>
  lookupRegionalScenarios(
    { ...visit.items[0], product, unit },
    date,
    { ...market, state },
    regionalCatalog,
    now,
  );
const resolve = (v: Visit[] = [visit], choices: Record<string, string> = {}, catalog = regionalCatalog) =>
  resolveRegionalVisits(v, [market], choices, catalog, now);
const key = itemEvidenceKey(visit.submissionId, 'i');
describe('synthetic regional lookup and engine adapter behavior', () => {
  it('finds alternatives without assuming an actual origin or choosing maximum savings', () => {
    expect(lookup().alternatives).toHaveLength(2);
    expect(resolve().items[0].selected).toBeUndefined();
    expect(resolve().foodMiles.weightedDifference.value).toBeNull();
    expect(resolve().items[0].missing.join(' ')).toContain('Several origin alternatives');
    expect(lookup('apple').alternatives).toHaveLength(2);
    expect(lookup('Manzanas').alternatives).toHaveLength(2);
  });
  it.each(['TX', 'GA', 'AK'])('keeps unsupported destination %s unavailable', (state) =>
    expect(lookup('Apples', '2026-10-17', state).alternatives).toEqual([]),
  );
  it.each(['Carrots', 'Potatoes', 'Tomatoes', 'Bell peppers', 'Lettuce', 'Onions', 'unknown'])(
    'keeps unsupported product %s unavailable',
    (product) => expect(lookup(product).alternatives).toEqual([]),
  );
  it('rejects unsupported dates, missing destinations, invalid coordinates and mismatched product IDs', () => {
    expect(lookup('Apples', '2027-01-01').alternatives).toEqual([]);
    expect(lookup('Apples', '2026-02-30').alternatives).toEqual([]);
    expect(lookup('Apples', '2026-10-19').alternatives).toEqual([]);
    expect(
      lookupRegionalScenarios(visit.items[0], visit.date, undefined, regionalCatalog, now).missing.join(),
    ).toContain('coordinates');
    expect(
      lookupRegionalScenarios(
        visit.items[0],
        visit.date,
        { ...market, geo: { lat: NaN, lng: 0 } },
        regionalCatalog,
        now,
      ).alternatives,
    ).toEqual([]);
    expect(
      lookupRegionalScenarios(
        { ...visit.items[0], productId: 'carrots' },
        visit.date,
        market,
        regionalCatalog,
        now,
      ).alternatives,
    ).toEqual([]);
  });
  it('automatically resolves exactly one seasonal alternative without changing observations', () => {
    const summer = { ...visit, date: '2026-07-17' };
    const r = resolve([summer]);
    expect(r.items[0].alternatives).toHaveLength(1);
    expect(r.items[0].selected?.conventionalOrigin).toBe('WA');
    expect(r.foodMiles.weightedDifference.value).not.toBeNull();
    expect(lookup('Strawberries', '2026-03-17', 'FL').alternatives).toHaveLength(1);
    expect(lookup('Strawberries', '2026-01-17', 'FL').alternatives).toEqual([]);
  });
  it.each([
    ['kg', 2],
    ['g', 0.002],
    ['lb', 0.90718474],
    ['oz', 0.05669904625],
  ] as const)('uses existing mass conversion for %s', (unit, mass) =>
    expect(lookup('Apples', '2026-10-17', 'MA', unit).alternatives[0].kg).toBeCloseTo(mass, 10),
  );
  it.each(['each', 'bunch', 'pint'] as const)('does not invent a mass for %s', (unit) =>
    expect(lookup('Apples', '2026-10-17', 'MA', unit).alternatives).toEqual([]),
  );
  it('preserves source assumptions and calculates totals through the unchanged engines', () => {
    const id = lookup().alternatives[0].scenario.id;
    const r = resolve([visit], { [key]: id });
    const a = r.items[0].selected!;
    const expected = 2 * (a.distances.conventional.value - a.distances.local.value);
    expect(r.foodMiles.weightedDifference.value).toBeCloseTo(expected, 8);
    expect(r.foodMiles.averageDifference.value).toBeCloseTo(expected / 2, 8);
    const freight = regionalFreightSummary(r);
    expect(freight.difference.value).toBeCloseTo(expected * freightKgCO2ePerKgMile('truck'), 10);
    expect(freight.conventional.value! - freight.regional.value!).toBeCloseTo(freight.difference.value!, 10);
    expect(a.distances.local.provenance.assumptions.join(' ')).toContain('NOT road mileage');
    expect(a.distances.local.provenance.assumptions.join(' ')).toContain('not destination sourcing shares');
    expect(freight.difference.sources.some((s) => s.source.includes('EPA'))).toBe(true);
  });
  it.each([
    [50, 500, 1],
    [500, 50, -1],
    [100, 100, 0],
  ] as const)('preserves signed synthetic distances %s/%s', (local, conventional, sign) => {
    const a = structuredClone(lookup().alternatives[0]);
    a.distances.local.value = local;
    a.distances.conventional.value = conventional;
    for (const d of Object.values(a.distances))
      d.provenance = {
        source: 'Synthetic behavior fixture',
        url: 'https://example.org/synthetic',
        quality: 'regional-baseline',
        assumptions: ['Synthetic distances; not admitted regional catalog data.'],
      };
    const result = alternativeFreight(visit, 'i', a).value!;
    expect(Math.sign(result)).toBe(sign);
    expect(result).toBeCloseTo(2 * (conventional - local) * freightKgCO2ePerKgMile('truck'), 10);
  });
  it('keeps missing transport modes unavailable without suppressing food-distance coverage', () => {
    const c = structuredClone(regionalCatalog);
    c.scenarios[0].regionalMode = null;
    const valid = validateRegionalCatalog(c);
    const r = resolve([visit], { [key]: c.scenarios[0].id }, valid);
    expect(r.foodMiles.weightedDifference.value).not.toBeNull();
    expect(regionalFreightSummary(r, valid).difference.value).toBeNull();
  });
  it('handles partial baskets, rejects stale choices and avoids double-counting retries or alternatives', () => {
    const id = lookup().alternatives[0].scenario.id;
    const r = resolve([visit, visit], { [key]: id });
    expect(r.foodMiles.weightedDifference.covered).toBe(1);
    const mixed = {
      ...visit,
      items: [...visit.items, { id: 'j', product: 'Carrots', quantity: 1, unit: 'kg' as const }],
    };
    const partial = resolve([mixed], { [key]: id });
    expect(partial.foodMiles.weightedDifference.value).toBeNull();
    expect(partial.foodMiles.weightedDifference.knownSubtotal).not.toBeNull();
    expect(partial.foodMiles.weightedDifference.covered).toBe(1);
    expect(partial.foodMiles.weightedDifference.expected).toBe(2);
    expect(regionalFreightSummary(partial).difference.value).toBeNull();
    expect(resolve([visit], { [key]: 'invalid' }).items[0].selected).toBeUndefined();
    expect(() => resolve([visit, { ...visit, totalCents: 999 }])).toThrow('Conflicting duplicate');
  });
  it('shows separate discrete sensitivity cases without a probability mean', () => {
    const s = originSensitivity(resolve().items[0]);
    expect(s.alternatives).toHaveLength(2);
    expect(s.extrema?.min).toBeLessThanOrEqual(s.extrema!.max);
    expect(s.note).toContain('no probabilities');
    expect(s).not.toHaveProperty('mean');
  });
  it('allows a shorter synthetic truck chain to emit more than a longer efficient rail chain', () => {
    const distance = lookup().alternatives[0].distances.local;
    const data = {
      [key]: {
        transport: {
          local: [{ mode: 'truck' as const, distance: { ...distance, value: 200 } }],
          conventional: [{ mode: 'rail' as const, distance: { ...distance, value: 1000 } }],
          boundary: 'tank-to-wheel' as const,
          allocation: 'mass' as const,
        },
      },
    };
    expect(transportSummary([visit], data).value).toBeLessThan(0);
    // This mode comparison tests engine behavior only; no rail case is shipped as a regional origin scenario.
  });
});
