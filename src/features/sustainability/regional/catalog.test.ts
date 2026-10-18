import { describe, expect, it } from 'vitest';
import { regionalCatalog, validateRegionalCatalog } from './catalog';
import raw from './scenarios-v1.json';
// Assertions of reviewed public-source facts; no synthetic route is presented as research.
describe('reviewed regional source facts', () => {
  it('retains the NASS 2025 totals and units from printed pp.13/58', () => {
    const facts = Object.fromEntries(
      regionalCatalog.production.map((p) => [p.id, [p.production, p.unit, p.cropYear]]),
    );
    expect(facts).toEqual({
      'apples-NY': [1495, 'million lb', 2025],
      'apples-MI': [1065, 'million lb', 2025],
      'apples-WA': [7540, 'million lb', 2025],
      'strawberries-CA': [27700, 'thousand cwt', 2025],
      'strawberries-FL': [3570, 'thousand cwt', 2025],
    });
    expect(regionalCatalog.sources[0].publishedAt).toBe('2026-05-01');
    expect(regionalCatalog.sources[0].observedTo).toBe('2025-12-31');
  });
  it('retains geographic references and intersects both sourced origin calendars', () => {
    expect(regionalCatalog.points.NY).toEqual({ lat: 42.913397, lng: -75.596272 });
    expect(regionalCatalog.points.FL).toEqual({ lat: 28.398978, lng: -82.5143 });
    expect(regionalCatalog.scenarios).toHaveLength(10);
    expect(
      regionalCatalog.scenarios
        .filter((s) => s.productId === 'strawberries')
        .every((s) => s.months.join(',') === '3,4'),
    ).toBe(true);
    expect(
      regionalCatalog.scenarios
        .filter((s) => s.regionalProductionId === 'apples-MI')
        .every((s) => !s.months.includes(7)),
    ).toBe(true);
    expect(
      regionalCatalog.scenarios.every(
        (s) => s.basis === 'modeled-regional' && s.quality === 'coarse-illustration',
      ),
    ).toBe(true);
  });
});
describe('synthetic invalid catalog alterations', () => {
  const mutate = (change: (c: typeof raw) => void) => {
    const c = structuredClone(raw);
    change(c);
    return c;
  };
  it.each([
    (c: typeof raw) => {
      c.scenarios[0].months = [13];
    },
    (c: typeof raw) => {
      c.scenarios[0].months = [1, 1];
    },
    (c: typeof raw) => {
      c.scenarios[0].conventionalProductionId = 'missing';
    },
    (c: typeof raw) => {
      c.scenarios[0].productId = 'carrots';
    },
    (c: typeof raw) => {
      c.scenarios[0].destinationState = 'TX';
    },
    (c: typeof raw) => {
      c.scenarios[0].basis = 'actual-observed';
    },
    (c: typeof raw) => {
      c.scenarios[0].regionalMode = 'van';
    },
    (c: typeof raw) => {
      c.production[0].production = -1;
    },
    (c: typeof raw) => {
      c.production[0].sourceId = 'missing';
    },
    (c: typeof raw) => {
      c.production[0].calendarSourceIds = ['made-up'];
    },
    (c: typeof raw) => {
      c.points.NY.lat = 100;
    },
    (c: typeof raw) => {
      c.sources[0].publishedAt = '2027-01-01';
    },
    (c: typeof raw) => {
      c.scenarios.push(c.scenarios[0]);
    },
    (c: typeof raw) => {
      c.seasonalVersion = 'changed';
    },
  ])('rejects unsupported data %#', (change) =>
    expect(() => validateRegionalCatalog(mutate(change))).toThrow(),
  );
});
