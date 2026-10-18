import type { Visit } from '../../purchases/model';
import { itemEvidenceKey } from '../evidence';
import type { ImpactData } from '../summary';
import { environmentalEvidence } from './catalog';
import type { EvidenceResolution, EvidenceRequest } from './adapter';
export type VisitEvidence = {
  impact: ImpactData;
  items: { key: string; product: string; date: string; resolution: EvidenceResolution }[];
};
/** Look up only the recorded market; never substitute a nearby market or guess an origin. */
export function resolveVisitEvidence(
  visits: Visit[],
  markets: EvidenceRequest['market'][],
  scenarioId?: string,
): VisitEvidence {
  const byId = new Map(markets.map((m) => [m.id, m]));
  const impact: ImpactData = { items: {} };
  const items: VisitEvidence['items'] = [];
  for (const visit of visits)
    for (const item of visit.items) {
      const key = itemEvidenceKey(visit.submissionId, item.id);
      const market = byId.get(visit.marketId);
      const resolution = market
        ? environmentalEvidence.resolve({ item, market, purchaseDate: visit.date, scenarioId })
        : {
            basis: 'unknown' as const,
            evidence: {},
            sources: [],
            catalogVersion: environmentalEvidence.catalog.version,
            missing: [
              {
                field: 'location' as const,
                reason:
                  'Recorded market is absent from the available directory; no location or origin is guessed.',
              },
            ],
          };
      impact.items![key] = resolution.evidence;
      items.push({ key, product: item.product, date: visit.date, resolution });
    }
  return { impact, items };
}
