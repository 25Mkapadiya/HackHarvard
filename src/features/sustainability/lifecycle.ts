import { z } from 'zod';
import type { Visit } from '../purchases/model';
import { evidence, itemEvidenceKey, metric, type Provenance } from './evidence';
import { quantityKg, type FoodEvidence } from './foodMiles';
import { consumerTripDifference, type TripComparison } from './transport';
const stage = <S extends string>(component: S) =>
  evidence('kg CO2e/kg-product').extend({ component: z.literal(component) });
const scenario = z.object({
  production: stage('agriculture-and-land-use-excluding-freight-and-other'),
  freight: stage('well-to-wheel-freight-only'),
  other: stage('processing-storage-packaging-retail-excluding-production-and-freight'),
});
export const LifecycleComparison = z.object({
  product: z.string().trim().min(1),
  boundary: z.literal('cradle-to-retail'),
  functionalUnit: z.literal('kg-product-as-purchased'),
  allocation: z.literal('mass'),
  gwp: z.literal('IPCC-AR5-100'),
  local: scenario,
  conventional: scenario,
});
export type LifecycleComparison = z.infer<typeof LifecycleComparison>;
/** Future refinements are sourced measurements attached to a compatible scenario, never score multipliers. */
export type FarmMeasurements = Partial<
  Record<
    | 'fertilizer'
    | 'irrigation'
    | 'greenhouseHeating'
    | 'machinery'
    | 'energySources'
    | 'cropYields'
    | 'livestockPractices'
    | 'soilManagement',
    { measurement: string; provenance: Provenance }
  >
>;
export type LifecycleEvidence = FoodEvidence & {
  lifecycle?: LifecycleComparison;
  farmMeasurements?: FarmMeasurements;
};
export function lifecycleSummary(
  visits: Visit[],
  data: Record<string, LifecycleEvidence> = {},
  trips: Record<string, TripComparison> = {},
) {
  const values: number[] = [],
    missing: string[] = [],
    sources: Provenance[] = [];
  const assumptions = [
    'Cradle-to-retail, as-purchased mass, mass allocation, AR5 100-year GWP; use only compatible stage-resolved comparisons.',
    'Production includes relevant land use; other excludes production and freight.',
    'Freight is included exactly once in this result. Never add the separate transport metric to this total.',
    'Generic product averages alone cannot establish the impact of a specific local farm.',
  ];
  let expected = 0;
  for (const visit of visits) {
    for (const item of visit.items) {
      expected++;
      const e = data[itemEvidenceKey(visit.submissionId, item.id)];
      const mass = quantityKg(item, { region: e?.region ?? '', date: visit.date }, e?.price);
      const parsed = LifecycleComparison.safeParse(e?.lifecycle);
      if (!mass || !parsed.success || parsed.data.product.toLowerCase() !== item.product.toLowerCase()) {
        missing.push(
          `${visit.date} · ${item.product}: mass or compatible, product-matched local/conventional life-cycle stages unknown`,
        );
        continue;
      }
      const comparison = parsed.data;
      const components = ['production', 'freight', 'other'] as const;
      values.push(
        mass.kg *
          components.reduce(
            (sum, key) => sum + comparison.conventional[key].value - comparison.local[key].value,
            0,
          ),
      );
      sources.push(
        ...mass.sources,
        ...components.flatMap((key) => [
          comparison.local[key].provenance,
          comparison.conventional[key].provenance,
        ]),
      );
      assumptions.push(...mass.assumptions);
    }
    if (trips[visit.submissionId] !== undefined) {
      expected++;
      const trip = consumerTripDifference(trips[visit.submissionId], 'well-to-wheel');
      if (!trip)
        missing.push(`${visit.date}: consumer travel requires a compatible well-to-wheel comparison`);
      else {
        values.push(trip.value);
        sources.push(...trip.sources);
      }
    } else assumptions.push(`${visit.date}: consumer travel excluded; no allocated comparison supplied.`);
  }
  if (!expected) missing.push('No recorded purchases');
  return metric(values, expected, 'kg CO2e', missing, sources, [...new Set(assumptions)]);
}
