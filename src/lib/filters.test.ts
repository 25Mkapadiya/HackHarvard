import { applyFilters, DEFAULT_FILTERS, filtersToParams, parseFilters, type MarketView } from './filters';

const base: MarketView = {
  id: 'a',
  name: 'Copley Square Farmers Market',
  type: 'farmers_market',
  city: 'Boston',
  schedules: [
    {
      rrule: 'FREQ=WEEKLY;BYDAY=TU,FR',
      openTime: '11:00',
      closeTime: '18:00',
      seasonStart: '05-15',
      seasonEnd: '11-24',
    },
  ],
  scheduleParsed: true,
  products: ['vegetables', 'fruits'],
  productsAreSample: true,
  paymentMethods: ['cash', 'credit'],
  paymentsAreSample: true,
  programs: ['snap', 'hip'],
  winter: false,
  stale: true,
  lastUpdated: '2023',
  vendorIds: [],
  sustainabilityMax: 70,
  geo: { lat: 42.3497, lng: -71.0779 },
  closures: [],
};
const winter: MarketView = {
  ...base,
  id: 'b',
  name: 'Somerville Winter Farmers Market',
  city: 'Somerville',
  winter: true,
  indoor: true,
  programs: ['snap'],
  sustainabilityMax: 40,
  schedules: [
    {
      rrule: 'FREQ=WEEKLY;BYDAY=SA',
      openTime: '09:30',
      closeTime: '14:00',
      seasonStart: '11-01',
      seasonEnd: '04-30',
    },
  ],
  geo: { lat: 42.3967, lng: -71.1226 },
};
const all = [base, winter];
const tueNoon = new Date('2026-06-16T16:00:00Z'); // Tue 12:00 EDT

describe('filters', () => {
  it('round-trips through the URL', () => {
    const f = {
      ...DEFAULT_FILTERS,
      when: 'now' as const,
      programs: ['snap' as const, 'hip' as const],
      maxKm: 5,
      winter: true,
    };
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });
  it('open now', () =>
    expect(applyFilters(all, { ...DEFAULT_FILTERS, when: 'now' }, tueNoon).map((m) => m.id)).toEqual(['a']));
  it('open on a chosen weekday', () => {
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, when: 'day6' }, new Date('2026-12-01T16:00:00Z')).map(
        (m) => m.id,
      ),
    ).toEqual(['b']);
  });
  it('requires every selected program', () => {
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, programs: ['snap', 'hip'] }, tueNoon).map((m) => m.id),
    ).toEqual(['a']);
  });
  it('distance from the user', () => {
    const origin = { lat: 42.3496, lng: -71.078 };
    expect(applyFilters(all, { ...DEFAULT_FILTERS, maxKm: 2 }, tueNoon, origin).map((m) => m.id)).toEqual([
      'a',
    ]);
  });
  it('winter, indoor and sustainability filters', () => {
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, winter: true, indoor: true }, tueNoon).map((m) => m.id),
    ).toEqual(['b']);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, minScore: 60 }, tueNoon).map((m) => m.id)).toEqual(['a']);
  });
  it('excludes unparsed schedules from "open now"', () => {
    const raw = { ...base, scheduleParsed: false, schedules: [] };
    expect(applyFilters([raw], { ...DEFAULT_FILTERS, when: 'now' }, tueNoon)).toEqual([]);
  });
  it('one-off closures remove a market from open now', () => {
    expect(
      applyFilters([{ ...base, closures: ['2026-06-16'] }], { ...DEFAULT_FILTERS, when: 'now' }, tueNoon),
    ).toEqual([]);
  });
});
