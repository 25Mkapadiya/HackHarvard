import { z } from 'zod';
import { validateVisit, type Visit } from '../purchases/model';
import { evidence, itemEvidenceKey, metric, type Evidence, type Provenance } from './evidence';
export type LocalAttribution = Record<string, Evidence<'fraction'>>;
const attribution = evidence('fraction').extend({ value: z.number().finite().min(0).max(1) });
export function spendingSummary(visits: Visit[], local: LocalAttribution = {}) {
  const seen = new Set<string>();
  const valid = visits.map((v) => {
    const parsed = validateVisit(v);
    if (seen.has(parsed.submissionId)) throw new Error('Duplicate visit ID in aggregation');
    seen.add(parsed.submissionId);
    return parsed;
  });
  const totalCents = valid.reduce((sum, v) => sum + v.totalCents, 0);
  if (!Number.isSafeInteger(totalCents)) throw new Error('Spending total exceeds safe currency precision');
  const values: number[] = [],
    missing: string[] = [],
    sources: Provenance[] = [];
  let expected = 0;
  for (const visit of valid) {
    let pricedCents = 0;
    for (const item of visit.items) {
      expected++;
      pricedCents += item.spendingCents ?? 0;
      const raw = local[itemEvidenceKey(visit.submissionId, item.id)];
      const factor = attribution.safeParse(raw);
      if (item.spendingCents === undefined || !factor.success) {
        missing.push(
          `${visit.date} · ${item.product}: ${item.spendingCents === undefined ? 'item price unknown' : 'verified local attribution unknown'}`,
        );
        continue;
      }
      values.push((item.spendingCents / 100) * factor.data.value);
      sources.push(factor.data.provenance);
    }
    if (pricedCents < visit.totalCents) {
      expected++;
      missing.push(
        `${visit.date}: $${((visit.totalCents - pricedCents) / 100).toFixed(2)} of trip total is not allocated to priced items`,
      );
    }
  }
  return {
    visits: valid.length,
    uniqueMarkets: new Set(valid.map((v) => v.marketId)).size,
    marketSpendingCents: totalCents,
    localSpending: metric(values, expected, 'USD', missing, sources, [
      'Market location does not establish production origin or local attribution.',
      'Only priced items with sourced local fractions contribute; unallocated spending stays unknown.',
    ]),
  };
}
