import { jaroWinkler, metersBetween, MAX_METERS, type Cluster } from './dedupe';
import { matchName, titleCase } from './normalize/text';
import type { SourceMarket } from './lib/types';

// SNAP retailers ("Farmers and Markets") that matched no market are still real, current places
// to buy food with SNAP: farmers markets missing from the 2014 directory, farm stands, and
// farmers who sell direct. Each becomes its own location.

const MARKET_WORDS = /\b(market|markets|mkt|mercado|bazaar|marketplace|farmers'? ?mkt)\b/i;

export const snapLocationType = (name: string) => (MARKET_WORDS.test(name) ? 'farmers_market' : 'farm_stand');

/** "SMITH FAMILY FARM LLC NAFMNP 2" → "Smith Family Farm LLC". */
export function cleanSnapName(name: string): string {
  return titleCase(
    name
      .replace(/\b(NAFMNP|FMNP|SFMNP)\b/gi, ' ')
      .replace(/\s+#?\d+$/, '')
      .replace(/\s+/g, ' ')
      .trim(),
  ).replace(/\b(Llc|Inc)\b/g, (w) => (w === 'Llc' ? 'LLC' : 'Inc'));
}

/** Collapses the same retailer listed twice (same name within 150 m) and turns each into a location. */
export function snapOnlyClusters(unmatched: SourceMarket[]): Cluster[] {
  const out: { rec: SourceMarket; extra: SourceMarket[] }[] = [];
  const byName = new Map<string, number[]>();
  for (const r of unmatched) {
    const key = matchName(r.name);
    const candidates = byName.get(key.slice(0, 6)) ?? [];
    const dup = candidates.find((i) => {
      const o = out[i].rec;
      return (
        metersBetween(o as never, r as never) <= MAX_METERS && jaroWinkler(matchName(o.name), key) >= 0.92
      );
    });
    if (dup !== undefined) {
      out[dup].extra.push(r);
      continue;
    }
    byName.set(key.slice(0, 6), [...candidates, out.length]);
    out.push({ rec: r, extra: [] });
  }
  return out.map(({ rec, extra }) => ({
    records: [
      { ...rec, confirmOnly: false, type: snapLocationType(rec.name), name: cleanSnapName(rec.name) },
    ],
    confirmations: extra,
  }));
}
