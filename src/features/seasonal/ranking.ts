import type { Crop } from '../../types';
import type { MarketView } from '../../lib/filters';
import { distanceKm, type LatLng } from '../../lib/geo';

export type Signals = { A?: number; M?: number; P?: number; R?: number };
export const DEFAULT_WEIGHTS: Required<Signals> = { A: 0.45, M: 0.3, P: 0.15, R: 0.1 };
export function rank(signals: Signals, weights = DEFAULT_WEIGHTS): number | null {
  let sum = 0,
    total = 0;
  for (const key of Object.keys(weights) as (keyof Signals)[]) {
    const w = weights[key];
    if (!Number.isFinite(w) || w < 0) throw new Error('Invalid ranking weight');
    const value = signals[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid ranking signal');
    sum += value * w;
    total += w;
  }
  return total ? sum / total : null;
}

export function regionalMarkets(markets: MarketView[], states: string[], origin: LatLng, maxKm?: number) {
  return markets
    .filter((m) => states.includes(m.state) && (maxKm === undefined || distanceKm(origin, m.geo) <= maxKm))
    .sort((a, b) => distanceKm(origin, a.geo) - distanceKm(origin, b.geo) || a.id.localeCompare(b.id));
}

/** A directory category is weaker than product-specific inventory. Never use sample vendors. */
export function reportedMarkets(crop: Crop, markets: MarketView[]) {
  return markets.filter((m) => !m.productsAreSample && m.products.includes(crop.category));
}
export function recommend(
  crops: Crop[],
  region: string,
  month: number,
  markets: MarketView[],
  weights = DEFAULT_WEIGHTS,
) {
  return crops
    .map((crop) => {
      const months = crop.months[region];
      const reported = reportedMarkets(crop, markets);
      const signals: Signals = {
        A: months ? Number(months.includes(month)) : undefined,
        // No reports means unknown, not proof of absence. Presence is category-level only.
        M: reported.length ? 1 : undefined,
      };
      return { crop, score: rank(signals, weights), signals, reported };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.crop.name.localeCompare(b.crop.name));
}

export const VERIFIED_MA = {
  name: 'Massachusetts — sourced harvest guide',
  states: ['MA'],
  source: 'Massachusetts Department of Agricultural Resources',
  url: 'https://www.mass.gov/guides/pick-your-own-farms',
  note: 'Limited harvest guide: strawberries June–July (partial months), pumpkins September–October. Other crops are unknown here, not out of season.',
  months: { strawberries: [6, 7], pumpkins: [9, 10] } as Record<string, number[]>,
};
