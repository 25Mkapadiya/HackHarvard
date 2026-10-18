import { describe, expect, it } from 'vitest';
import { environmentalEvidence } from './catalog';
import extract from './usda-err99.extract.json';
import { foodMilesSummary } from '../foodMiles';
import { itemEvidenceKey } from '../evidence';
import type { Visit } from '../../purchases/model';
/** Integration fixture: actual numeric extract from USDA ERS ERR-99 Table 3, p.16. */
const visit: Visit = {
  submissionId: 'v',
  marketId: 'central-ny-regional-market-syracuse-ny',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1000,
  items: [{ id: 'a', product: 'Apples', quantity: 2, unit: 'kg' }],
};
const request = {
  item: visit.items[0],
  market: { id: visit.marketId, state: 'NY', city: 'Syracuse' },
  purchaseDate: visit.date,
  scenarioId: 'syracuse-direct-vs-wa',
};
describe('public USDA numeric extract integration', () => {
  it('retains source facts, vintage, locator and digest rather than synthetic route data', () => {
    expect(extract.chains.directNy.distance.value).toBe(61);
    expect(extract.chains.mainstreamNy.distance.value).toBe(225);
    expect(extract.chains.mainstreamWa.distance.value).toBe(2850);
    const resolved = environmentalEvidence.resolve(request);
    expect(resolved.basis).toBe('modeled-scenario');
    expect(resolved.sources[0]).toMatchObject({
      publicationDate: '2010-06-21',
      observedFrom: null,
      observedTo: null,
      sha256: '1b77d3961022603139f443531cf397c0c8be04590c4915f08a963f0ccf2e956d',
    });
    expect(resolved.sources[0].observationPeriod).toContain('2008');
    expect(resolved.sources[0].sourceLocator).toContain('Table 3');
  });
  it('feeds unchanged kg-mile and weighted-mile calculations, including lb conversion', () => {
    const resolved = environmentalEvidence.resolve(request);
    const data = { [itemEvidenceKey('v', 'a')]: resolved.evidence };
    expect(foodMilesSummary([visit], data).weightedDifference.value).toBe(5578);
    expect(foodMilesSummary([visit], data).averageDifference.value).toBe(2789);
    const pounds = { ...visit, items: [{ ...visit.items[0], quantity: 1, unit: 'lb' as const }] };
    expect(foodMilesSummary([pounds], data).weightedDifference.value).toBeCloseTo(2789 * 0.45359237);
    expect(foodMilesSummary([visit], data).weightedDifference.sources[0].assumptions.join(' ')).toContain(
      'modeled-scenario',
    );
  });
  it('never automatically applies the historical case to actual purchases or other products/locations', () => {
    for (const input of [
      { ...request, scenarioId: undefined },
      { ...request, item: { ...request.item, product: 'Potatoes' } },
      { ...request, market: { ...request.market, city: 'Boston', state: 'MA' } },
      { ...request, market: { ...request.market, city: 'Albany' } },
      { ...request, purchaseDate: '2026-02-01' },
      { ...request, purchaseDate: '2027-10-17' },
    ])
      expect(environmentalEvidence.resolve(input).basis).toBe('unknown');
  });
  it('retains partial-basket coverage and never creates local attribution or LCA', () => {
    const resolved = environmentalEvidence.resolve(request);
    const mixed = {
      ...visit,
      items: [...visit.items, { id: 'b', product: 'Carrots', quantity: 1, unit: 'kg' as const }],
    };
    expect(
      foodMilesSummary([mixed], { [itemEvidenceKey('v', 'a')]: resolved.evidence }).weightedDifference,
    ).toMatchObject({ value: null, knownSubtotal: 5578, covered: 1, expected: 2 });
    expect(resolved.evidence.lifecycle).toBeUndefined();
    expect(resolved.missing.map((m) => m.field)).toEqual(
      expect.arrayContaining(['localSpending', 'price', 'transport', 'lifecycle']),
    );
  });
});
