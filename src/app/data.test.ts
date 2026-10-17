import { withSummaryDefaults } from './data';

describe('withSummaryDefaults', () => {
  it('restores values the pipeline omitted', () => {
    const m = withSummaryDefaults({
      id: 'a',
      name: 'A',
      city: 'X',
      state: 'VT',
      lastUpdated: '2026-10-17',
      programs: ['snap'],
    });
    expect(m).toMatchObject({
      type: 'farmers_market',
      schedules: [],
      scheduleParsed: false,
      programs: ['snap'],
      stale: false,
      vendorIds: [],
    });
  });
});
