import { z } from 'zod';
import type { PurchaseItem, Visit } from '../../purchases/model';
import { canonicalProductId } from '../../purchases/products';
import { distanceKm } from '../../../lib/geo';
import { foodMilesSummary, quantityKg, type FoodEvidenceMap } from '../foodMiles';
import { itemEvidenceKey, type Evidence, type Provenance } from '../evidence';
import { pointSchema, regionalCatalog, type RegionalCatalog, type RegionalScenario } from './catalog';
export type RegionalMarket = { id: string; state: string; geo?: { lat: number; lng: number } };
export type RegionalAlternative = {
  scenario: RegionalScenario;
  distances: { local: Evidence<'mile'>; conventional: Evidence<'mile'> };
  regionalOrigin: string;
  conventionalOrigin: string;
  kg: number;
};
export function lookupRegionalScenarios(
  item: PurchaseItem, date: string, market: RegionalMarket | undefined,
  catalog: RegionalCatalog = regionalCatalog, now = new Date(),
): { alternatives: RegionalAlternative[]; missing: string[] } {
  const productId = canonicalProductId(item.product);
  const point = pointSchema.safeParse(market?.geo);
  if (!z.iso.date().safeParse(date).success || date > now.toISOString().slice(0,10) || date < catalog.applicableFrom || date > catalog.applicableTo)
    return { alternatives: [], missing: ['Visit date outside the reviewed regional model period or invalid.'] };
  if (!market || !point.success) return { alternatives: [], missing: ['Directory market destination coordinates unavailable.'] };
  if (!productId || (item.productId && item.productId !== productId)) return { alternatives: [], missing: ['No compatible catalog product identifier.'] };
  const mass = quantityKg(item, { region: market.state, date });
  if (!mass) return { alternatives: [], missing: ['Recorded mass required (kg, g, lb or oz); no count/price conversion assumed.'] };
  const month = Number(date.slice(5,7));
  const matches = catalog.scenarios.filter(r => r.productId === productId && r.destinationState === market.state && r.months.includes(month));
  const alternatives = matches.map(scenario => {
    const local = catalog.production.find(p => p.id === scenario.regionalProductionId)!;
    const conventional = catalog.production.find(p => p.id === scenario.conventionalProductionId)!;
    function miles(origin: typeof local): Evidence<'mile'> {
      const source = catalog.sources.find(s => s.id === origin.sourceId)!;
      const provenance: Provenance = {
        source: `${source.organization}: ${origin.productId}, ${origin.state}, crop ${origin.cropYear}; ${catalog.version}`,
        url: source.url, quality: 'regional-baseline',
        assumptions: [
          `${origin.locator}; production ${origin.production} ${origin.unit} establishes producer-state context only, not destination sourcing shares.`,
          `Origin proxy: ${origin.state} Census internal point (${catalog.points[origin.state].lat}, ${catalog.points[origin.state].lng}); not a farm or production-weighted center.`,
          `Census reference: ${catalog.pointSource.url}; ${catalog.pointSource.locator}.`,
          `Great-circle straight-line distance to directory market ${market!.id}; NOT road mileage or an actual supply chain. No road multiplier.`,
          `Regional boundary: ${scenario.regionalBoundary}. Neither origin is attributed to this purchase.`,
          `Calendar sources: ${origin.calendarSourceIds.join(', ')}; ${origin.calendarLocator}; availability/storage is not necessarily harvest.`,
          'Excludes distribution detours, consolidation, last-mile routing and consumer travel. A geometric proxy, not a validated freight route.',
        ],
      };
      return { value: distanceKm(catalog.points[origin.state], point.data!) / 1.609344, unit: 'mile', provenance };
    }
    return { scenario, regionalOrigin: local.state, conventionalOrigin: conventional.state,
      distances: { local: miles(local), conventional: miles(conventional) }, kg: mass.kg };
  });
  return { alternatives, missing: alternatives.length ? [] : ['No reviewed product/destination/season combination; seasonal coverage alone is not transport evidence.'] };
}
/** Deduplicate replayed visits and reject changed payloads; never add scenario alternatives together. */
export function uniqueRegionalVisits(visits: Visit[]) {
  const ids = new Map<string, Visit>();
  for (const visit of visits) {
    const prior = ids.get(visit.submissionId);
    if (prior && JSON.stringify(prior) !== JSON.stringify(visit)) throw new Error('Conflicting duplicate visit');
    if (new Set(visit.items.map(i => i.id)).size !== visit.items.length) throw new Error('Duplicate item ID');
    ids.set(visit.submissionId, visit);
  }
  return [...ids.values()];
}
export function resolveRegionalVisits(
  visits: Visit[], markets: readonly RegionalMarket[], choices: Record<string,string> = {},
  catalog = regionalCatalog, now = new Date(),
) {
  const unique = uniqueRegionalVisits(visits);
  const data: FoodEvidenceMap = {};
  const items = unique.flatMap(visit => visit.items.map(item => {
    const key = itemEvidenceKey(visit.submissionId, item.id);
    const found = lookupRegionalScenarios(item, visit.date, markets.find(m => m.id === visit.marketId), catalog, now);
    const selected = found.alternatives.length === 1 ? found.alternatives[0] :
      found.alternatives.find(a => a.scenario.id === choices[key]);
    if (selected) data[key] = { distances: selected.distances };
    const missing = !selected && found.alternatives.length > 1
      ? ['Several origin alternatives apply; select an illustration to calculate a comparable basket. No actual route is known.'] : found.missing;
    return { key, visit, item, ...found, missing, selected };
  }));
  return { visits: unique, items, data, foodMiles: foodMilesSummary(unique, data), modelVersion: catalog.version };
}
export type RegionalResolution = ReturnType<typeof resolveRegionalVisits>;
