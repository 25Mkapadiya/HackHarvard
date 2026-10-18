import { describe, expect, it } from 'vitest';
import { EPA_FREIGHT, freightKgCO2ePerKgMile, transportSummary, type TripComparison } from './transport';
import { itemEvidenceKey, type Evidence } from './evidence';
import type { Visit } from '../purchases/model';
const provenance = {
  source: 'Synthetic transport evidence',
  url: 'https://example.org/test',
  quality: 'measured' as const,
  assumptions: ['Synthetic fixture, not actual farm evidence'],
};
const miles = (value: number): Evidence<'mile'> => ({ value, unit: 'mile', provenance });
const kg = (value: number): Evidence<'kg CO2e'> => ({ value, unit: 'kg CO2e', provenance });
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1000,
  items: [{ id: 'a', product: 'Apples', quantity: 1, unit: 'kg' }],
};
describe('transportation CO2e', () => {
  it('converts all four EPA gas rows and short-ton units', () => {
    for (const mode of ['truck', 'rail', 'ship', 'air'] as const) {
      const [co2, ch4, n2o] = EPA_FREIGHT[mode];
      expect(freightKgCO2ePerKgMile(mode) * 907.18474).toBeCloseTo(co2 + ch4 * 0.028 + n2o * 0.265, 12);
    }
    expect(freightKgCO2ePerKgMile('truck') * 907.18474).toBeCloseTo(0.1874758, 7);
  });
  it('sums multimodal freight and adds a consumer trip once per visit', () => {
    const transport = {
      boundary: 'tank-to-wheel' as const,
      allocation: 'mass' as const,
      local: [{ mode: 'truck' as const, distance: miles(200) }],
      conventional: [
        { mode: 'rail' as const, distance: miles(100) },
        { mode: 'ship' as const, distance: miles(10) },
      ],
    };
    const data = { [itemEvidenceKey('v', 'a')]: { transport } };
    const freight =
      100 * freightKgCO2ePerKgMile('rail') +
      10 * freightKgCO2ePerKgMile('ship') -
      200 * freightKgCO2ePerKgMile('truck');
    expect(transportSummary([visit], data).value).toBeCloseTo(freight);
    expect(freight).toBeLessThan(0);
    const trip: TripComparison = {
      boundary: 'tank-to-wheel',
      allocation: 'purpose-allocated-round-trip',
      local: kg(2),
      conventional: kg(1),
    };
    expect(transportSummary([visit], data, { v: trip }).value).toBeCloseTo(freight - 1);
    expect(transportSummary([visit], data).assumptions.join(' ')).toContain('consumer travel excluded');
    expect(transportSummary([visit], data, { v: { ...trip, boundary: 'well-to-wheel' } }).value).toBeNull();
  });
  it('requires evidence instead of assuming truck mode, origins or routes', () => {
    expect(transportSummary([visit]).value).toBeNull();
    expect(
      transportSummary([visit], {
        [itemEvidenceKey('v', 'a')]: {
          transport: { boundary: 'tank-to-wheel', allocation: 'mass', local: [], conventional: [] },
        },
      }).value,
    ).toBeNull();
  });
});
