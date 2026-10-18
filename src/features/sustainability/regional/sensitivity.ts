import { foodMilesSummary } from '../foodMiles';
import { itemEvidenceKey } from '../evidence';
import { alternativeFreight } from './freight';
import type { RegionalResolution } from './food';
import { regionalCatalog } from './catalog';
/** Alternative origins only. Extrema describe these discrete cases, not uncertainty bounds. */
export function originSensitivity(row: RegionalResolution['items'][number], catalog = regionalCatalog) {
  const visit = { ...row.visit, items: [row.item] };
  const alternatives = row.alternatives.map((a) => ({
    alternative: a,
    food: foodMilesSummary([visit], {
      [itemEvidenceKey(visit.submissionId, row.item.id)]: { distances: a.distances },
    }),
    freight: alternativeFreight(visit, row.item.id, a, catalog),
  }));
  const values = alternatives.flatMap((a) => (a.freight.value === null ? [] : [a.freight.value]));
  return {
    alternatives,
    extrema: values.length ? { min: Math.min(...values), max: Math.max(...values) } : null,
    note: 'Discrete origin sensitivity cases; no probabilities, weighted mean, confidence interval or actual sourcing inference.',
  };
}
