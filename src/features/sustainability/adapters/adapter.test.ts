import { describe, expect, it } from 'vitest';
import { createEvidenceAdapter, type EvidenceRequest } from './adapter';
import type { EvidenceCatalog } from './schema';
/** Synthetic catalog tests contracts; these values are NOT environmental observations. */
const fixture = (): EvidenceCatalog => ({
  version: 'synthetic-only',
  products: [{ id: 'apples', aliases: ['Apples', 'Apple'] }],
  sources: [
    {
      id: 'test',
      name: 'SYNTHETIC fixture',
      url: 'https://example.org/synthetic',
      publicationDate: '2020-01-01',
      observedFrom: '2019-01-01',
      observedTo: '2019-12-31',
      observationPeriod: 'Synthetic 2019 observations',
      reviewedAt: '2026-10-18',
      geography: 'Synthetic Syracuse example',
      destinationScopes: [{ state: 'NY', cities: ['Syracuse'] }],
      products: ['apples'],
      sourceUnits: ['mile'],
      methodology: 'Synthetic published product miles',
      license: 'Synthetic test fixture',
      licenseUrl: 'https://example.org/test-license',
      sourceLocator: 'Synthetic table',
    },
  ],
  comparisons: [
    {
      id: 'test',
      sourceId: 'test',
      label: 'SYNTHETIC scenario',
      basis: 'modeled-scenario',
      productId: 'apples',
      scope: { state: 'NY', cities: ['Syracuse'] },
      applicableFrom: '2020-01-01',
      applicableTo: '2026-12-31',
      months: [9, 10],
      distanceMethod: 'published-product-miles',
      boundary: 'farm-to-retail',
      local: {
        originLabel: 'Synthetic origin A',
        destinationLabel: 'Synthetic endpoint',
        sourceLocator: 'Synthetic table A',
        distance: { value: 200, unit: 'mile' },
      },
      conventional: {
        originLabel: 'Synthetic origin B',
        destinationLabel: 'Synthetic endpoint',
        sourceLocator: 'Synthetic table B',
        distance: { value: 100, unit: 'mile' },
      },
      assumptions: ['Synthetic values only'],
    },
  ],
});
const request = (): EvidenceRequest => ({
  item: { id: 'a', product: 'Apples', quantity: 2, unit: 'lb' },
  market: { id: 'm', city: 'Syracuse', state: 'NY' },
  purchaseDate: '2026-10-17',
  scenarioId: 'test',
});
describe('evidence adapter contracts (synthetic)', () => {
  it('matches explicit products and scenarios, preserving units, metadata and provenance', () => {
    const result = createEvidenceAdapter(fixture()).resolve(request());
    expect(result.basis).toBe('modeled-scenario');
    expect(result.evidence.distances?.local).toMatchObject({
      value: 200,
      unit: 'mile',
      provenance: { quality: 'regional-baseline' },
    });
    expect(result.sources[0].publicationDate).toBe('2020-01-01');
    expect(result.sources[0].license).toContain('Synthetic');
  });
  it('never infers an origin or comparison from product and market alone', () => {
    const resolve = createEvidenceAdapter(fixture()).resolve;
    const result = resolve({ ...request(), scenarioId: undefined });
    expect(result.basis).toBe('unknown');
    expect(result.evidence).toEqual({});
    expect(result.missing.map((m) => m.field)).toContain('origin');
    const documented = resolve({
      ...request(),
      scenarioId: undefined,
      origin: {
        label: 'Synthetic origin A',
        documentUrl: 'https://example.org/origin',
        validFrom: '2026-01-01',
        validTo: '2026-12-31',
      },
    });
    expect(documented.missing.map((m) => m.field)).toContain('comparison');
    expect(documented.evidence).toEqual({});
  });
  it('rejects other products, regions, seasons, invalid dates and unsupported mass', () => {
    const resolve = createEvidenceAdapter(fixture()).resolve;
    for (const patch of [
      { item: { ...request().item, product: 'Apple pie' } },
      { market: { id: 'm', city: 'Boston', state: 'MA' } },
      { purchaseDate: '2026-01-01' },
      { purchaseDate: '2027-10-17' },
      { purchaseDate: '2026-02-30' },
    ])
      expect(resolve({ ...request(), ...patch }).basis).toBe('unknown');
    expect(
      resolve({ ...request(), item: { ...request().item, unit: 'each' } }).missing.map((m) => m.field),
    ).toContain('mass');
  });
  it('rejects incompatible distance units, LCA boundaries and source dates', () => {
    const wrongUnit = fixture();
    (wrongUnit.comparisons[0].local.distance as { unit: string }).unit = 'km';
    expect(() => createEvidenceAdapter(wrongUnit)).toThrow();
    const wrongLca = fixture();
    Object.assign(wrongLca.comparisons[0], { lifecycle: { boundary: 'cradle-to-farmgate' } });
    expect(() => createEvidenceAdapter(wrongLca)).toThrow();
    const wrongScope = fixture();
    wrongScope.sources[0].destinationScopes[0].state = 'MA';
    expect(() => createEvidenceAdapter(wrongScope)).toThrow();
    const wrongSourceUnits = fixture();
    wrongSourceUnits.sources[0].sourceUnits = ['km'];
    expect(() => createEvidenceAdapter(wrongSourceUnits)).toThrow();
    const wrongDate = fixture();
    wrongDate.sources[0].observedTo = '2028-01-01';
    expect(() => createEvidenceAdapter(wrongDate)).toThrow();
  });
  it('observed records require exact market and matching dated origin documentation', () => {
    const catalog = fixture();
    const record = catalog.comparisons[0];
    record.basis = 'actual-observed';
    record.scope.marketIds = ['m'];
    record.originDocumentUrl = 'https://example.org/origin';
    record.applicableFrom = '2019-01-01';
    record.applicableTo = '2019-12-31';
    const resolve = createEvidenceAdapter(catalog).resolve;
    const input = {
      ...request(),
      scenarioId: undefined,
      purchaseDate: '2019-10-01',
      origin: {
        label: 'Synthetic origin A',
        documentUrl: 'https://example.org/origin',
        validFrom: '2019-01-01',
        validTo: '2019-12-31',
      },
    };
    expect(resolve(input).basis).toBe('actual-observed');
    expect(resolve({ ...input, origin: { ...input.origin, validTo: '2019-09-01' } }).basis).toBe('unknown');
    expect(resolve({ ...input, market: { ...input.market, id: 'another-market' } }).basis).toBe('unknown');
  });
});

it('preserves negative food-mile differences from compatible evidence (SYNTHETIC)', async () => {
  const { foodMilesSummary } = await import('../foodMiles');
  const { itemEvidenceKey } = await import('../evidence');
  const input = request();
  const resolved = createEvidenceAdapter(fixture()).resolve(input);
  const visit = {
    submissionId: 'v',
    marketId: 'm',
    date: input.purchaseDate,
    submittedAt: '',
    totalCents: 100,
    items: [input.item],
  };
  const result = foodMilesSummary([visit], { [itemEvidenceKey('v', 'a')]: resolved.evidence });
  expect(result.weightedDifference.value).toBeCloseTo(2 * 0.45359237 * -100);
  expect(result.averageDifference.value).toBe(-100);
});
