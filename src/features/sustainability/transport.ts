import { z } from 'zod';
import type { Visit } from '../purchases/model';
import { evidence, itemEvidenceKey, metric, type Provenance } from './evidence';
import { quantityKg, type FoodEvidence } from './foodMiles';
export const EPA_SOURCE: Provenance = {
  source: 'US EPA Emission Factors for Greenhouse Gas Inventories, 15 January 2025, Tables 8 and 11',
  url: 'https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf',
  quality: 'regional-baseline',
  assumptions: [
    'US distance-based freight combustion averages; not farm-specific or well-to-wheel.',
    'Short ton = 907.18474 kg; CH4/N2O grams converted to kg; AR5 100-year GWP 28/265.',
  ],
};
/** Table 8 columns: kg CO2, g CH4, g N2O per short ton-mile. */
export const EPA_FREIGHT = {
  truck: [0.186, 0.0016, 0.0054],
  rail: [0.021, 0.0016, 0.0005],
  ship: [0.077, 0.031, 0.002],
  air: [1.086, 0, 0.0334],
} as const;
export type FreightMode = keyof typeof EPA_FREIGHT;
export function freightKgCO2ePerKgMile(mode: FreightMode) {
  const [co2, ch4, n2o] = EPA_FREIGHT[mode];
  return (co2 + (ch4 / 1000) * 28 + (n2o / 1000) * 265) / 907.18474;
}
const legSchema = z.object({ mode: z.enum(['truck', 'rail', 'ship', 'air']), distance: evidence('mile') });
export type FreightLeg = z.infer<typeof legSchema>;
const routeSchema = z.object({
  local: z.array(legSchema).min(1),
  conventional: z.array(legSchema).min(1),
  boundary: z.literal('tank-to-wheel'),
  allocation: z.literal('mass'),
});
export type TransportComparison = z.infer<typeof routeSchema>;
export type TransportEvidence = FoodEvidence & { transport?: TransportComparison };
export const TripComparison = z.object({
  local: evidence('kg CO2e'),
  conventional: evidence('kg CO2e'),
  boundary: z.enum(['tank-to-wheel', 'well-to-wheel']),
  allocation: z.literal('purpose-allocated-round-trip'),
});
export type TripComparison = z.infer<typeof TripComparison>;
/** Consumer-trip values must already include return travel and allocation to the trip purpose. */
export function consumerTripDifference(input: unknown, boundary: TripComparison['boundary']) {
  const parsed = TripComparison.safeParse(input);
  if (!parsed.success || parsed.data.boundary !== boundary) return null;
  return {
    value: parsed.data.conventional.value - parsed.data.local.value,
    sources: [parsed.data.local.provenance, parsed.data.conventional.provenance],
  };
}
function freightPerKg(legs: FreightLeg[]) {
  return legs.reduce((sum, leg) => sum + leg.distance.value * freightKgCO2ePerKgMile(leg.mode), 0);
}
export function transportSummary(
  visits: Visit[],
  data: Record<string, TransportEvidence> = {},
  trips: Record<string, TripComparison> = {},
) {
  const values: number[] = [],
    missing: string[] = [],
    sources: Provenance[] = [];
  let expected = 0;
  const assumptions = [
    'Freight combustion emissions only (tank-to-wheel); excludes production, refrigeration and upstream fuel emissions.',
    'Positive difference = conventional minus local; negative values indicate higher local emissions.',
  ];
  for (const visit of visits) {
    for (const item of visit.items) {
      expected++;
      const e = data[itemEvidenceKey(visit.submissionId, item.id)];
      const mass = quantityKg(item, { region: e?.region ?? '', date: visit.date }, e?.price);
      const route = routeSchema.safeParse(e?.transport);
      if (!mass || !route.success) {
        missing.push(`${visit.date} · ${item.product}: mass or complete sourced freight legs unknown`);
        continue;
      }
      values.push(mass.kg * (freightPerKg(route.data.conventional) - freightPerKg(route.data.local)));
      sources.push(
        EPA_SOURCE,
        ...mass.sources,
        ...[...route.data.local, ...route.data.conventional].map((l) => l.distance.provenance),
      );
      assumptions.push(...mass.assumptions);
    }
    if (trips[visit.submissionId] !== undefined) {
      expected++;
      const trip = consumerTripDifference(trips[visit.submissionId], 'tank-to-wheel');
      if (!trip) missing.push(`${visit.date}: consumer trip evidence invalid or boundary incompatible`);
      else {
        values.push(trip.value);
        sources.push(...trip.sources);
      }
    } else assumptions.push(`${visit.date}: consumer travel excluded; no allocated comparison supplied.`);
  }
  if (!expected) missing.push('No recorded purchases');
  return metric(values, expected, 'kg CO2e', missing, sources, [...new Set(assumptions)]);
}
