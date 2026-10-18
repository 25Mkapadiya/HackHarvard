import { z } from 'zod';
import type { PurchaseItem, Visit } from '../purchases/model';
import { evidence, itemEvidenceKey, metric, type Evidence, type Provenance } from './evidence';
const priceSchema = z.object({
  product: z.string().min(1),
  region: z.string().min(1),
  validFrom: z.iso.date(),
  validTo: z.iso.date(),
  price: evidence('USD/kg').extend({ value: z.number().positive().finite() }),
});
export type RegionalPrice = z.infer<typeof priceSchema>;
export type Mass = { kg: number; sources: Provenance[]; assumptions: string[] };
export function quantityKg(
  item: PurchaseItem,
  context: { region: string; date: string },
  price?: RegionalPrice,
): Mass | null {
  const conversions: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 };
  const multiplier = conversions[item.unit];
  if (item.quantity !== undefined && multiplier !== undefined) {
    const kg = item.quantity * multiplier;
    return Number.isFinite(kg) && kg > 0
      ? { kg, sources: [], assumptions: ['User-recorded mass; exact avoirdupois conversion to kg.'] }
      : null;
  }
  const parsed = priceSchema.safeParse(price);
  if (!parsed.success || item.spendingCents === undefined) return null;
  const p = parsed.data;
  if (
    p.product.toLowerCase() !== item.product.toLowerCase() ||
    p.region !== context.region ||
    context.date < p.validFrom ||
    context.date > p.validTo ||
    p.price.provenance.quality === 'user-reported'
  )
    return null;
  const kg = item.spendingCents / 100 / p.price.value;
  return Number.isFinite(kg) && kg > 0
    ? {
        kg,
        sources: [p.price.provenance],
        assumptions: [
          'Mass estimated from item spending divided by matched regional, dated product price; not a measured weight.',
        ],
      }
    : null;
}
const distances = z.object({ conventional: evidence('mile'), local: evidence('mile') });
export type DistanceComparison = { conventional: Evidence<'mile'>; local: Evidence<'mile'> };
export type FoodEvidence = { distances?: DistanceComparison; price?: RegionalPrice; region?: string };
export type FoodEvidenceMap = Record<string, FoodEvidence>;
export function foodMilesSummary(visits: Visit[], data: FoodEvidenceMap = {}) {
  const values: number[] = [],
    missing: string[] = [],
    sources: Provenance[] = [],
    assumptions: string[] = [];
  let totalMass = 0,
    expected = 0;
  for (const visit of visits)
    for (const item of visit.items) {
      expected++;
      const e = data[itemEvidenceKey(visit.submissionId, item.id)];
      const mass = quantityKg(item, { region: e?.region ?? '', date: visit.date }, e?.price);
      const comparison = distances.safeParse(e?.distances);
      if (!mass || !comparison.success) {
        missing.push(
          `${visit.date} · ${item.product}: mass or sourced local/conventional supply distances unknown`,
        );
        continue;
      }
      values.push(mass.kg * (comparison.data.conventional.value - comparison.data.local.value));
      totalMass += mass.kg;
      sources.push(
        ...mass.sources,
        comparison.data.conventional.provenance,
        comparison.data.local.provenance,
      );
      assumptions.push(...mass.assumptions);
    }
  if (!expected) missing.push('No recorded purchases');
  const weightedDifference = metric(values, expected, 'kg·mile', missing, sources, [
    ...new Set([
      ...assumptions,
      'Supply-chain distances are not the distance from home to market.',
      'Positive differences mean a shorter local chain; negative differences are preserved.',
    ]),
  ]);
  const averageDifference = {
    ...weightedDifference,
    unit: 'mile',
    value: weightedDifference.value !== null && totalMass > 0 ? weightedDifference.value / totalMass : null,
    knownSubtotal:
      weightedDifference.knownSubtotal !== null && totalMass > 0
        ? weightedDifference.knownSubtotal / totalMass
        : null,
  };
  return { weightedDifference, averageDifference, coveredMassKg: totalMass };
}
