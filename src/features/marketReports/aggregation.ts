import { seasonalCatalog } from '../seasonal/catalog/catalog';
import { reportAuthority, utcDay, type ValidatedReport } from './models';

export type FreshnessPolicy = { recentDays: number; olderDays: number };
export const DEFAULT_FRESHNESS: FreshnessPolicy = { recentDays: 7, olderDays: 30 };
export function freshness(observedAt: string, now: Date, policy = DEFAULT_FRESHNESS) {
  if (!Number.isInteger(policy.recentDays) || !Number.isInteger(policy.olderDays) ||
      policy.recentDays < 0 || policy.olderDays < policy.recentDays) throw new Error('Invalid freshness policy');
  const day = utcDay(now);
  const date = new Date(`${observedAt}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== observedAt || observedAt > day)
    throw new Error('Invalid observation date');
  const ageDays = Math.round((Date.parse(`${day}T00:00:00Z`) - date.getTime()) / 86400000);
  return { ageDays, category: ageDays <= policy.recentDays ? 'recent' as const :
    ageDays <= policy.olderDays ? 'older' as const : 'historical' as const };
}
export type ProductEvidence = {
  marketId: string;
  productId: string;
  latestObservationDate: string;
  observations: readonly ValidatedReport[];
  latest: ValidatedReport;
  freshness: ReturnType<typeof freshness>;
  hasConflictingObservations: boolean;
  /** null means source independence cannot be reliably established. Never raw submission count. */
  independentReporterCount: number | null;
  label: string;
};
/** Only validated records enter. Keeps opposing observations and deterministic latest ordering.
 * Local demo is allowed for isolated analysis, but cannot become official evidence. */
export function aggregateReports(reports: readonly ValidatedReport[], now: Date, policy = DEFAULT_FRESHNESS): ProductEvidence[] {
  const ids = new Map<string, ValidatedReport>();
  const groups = new Map<string, ValidatedReport[]>();
  for (const r of reports) {
    reportAuthority(r);
    freshness(r.observedAt, now, policy);
    const previous = ids.get(r.id);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(r)) throw new Error('Conflicting duplicate report ID');
      continue;
    }
    ids.set(r.id, r);
    const key = JSON.stringify([r.marketId, r.productId]);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map(group => {
    const observations = [...group].sort((a, b) =>
      b.observedAt.localeCompare(a.observedAt) || Date.parse(b.submittedAt) - Date.parse(a.submittedAt) || a.id.localeCompare(b.id));
    const latest = observations[0];
    const keys = observations.map(r => reportAuthority(r)?.independentReporterKey);
    const source = latest.source.kind === 'local_demo' ? 'Local demo customer observation' :
      latest.reporterType === 'market_representative' && latest.verificationStatus === 'verified'
        ? 'Verified market representative observation' : 'Customer observation';
    return {
      marketId: latest.marketId, productId: latest.productId,
      latestObservationDate: latest.observedAt, observations, latest,
      freshness: freshness(latest.observedAt, now, policy),
      hasConflictingObservations: new Set(observations.map(r => r.availabilityStatus)).size > 1,
      independentReporterCount: keys.every(k => !!k) ? new Set(keys).size : null,
      label: `${latest.productName}: ${source.toLowerCase()} on ${latest.observedAt} — ${latest.availabilityStatus === 'observed' ? 'reported seen' : 'not observed by this reporter'}. Does not establish current stock.`,
    };
  }).sort((a, b) => a.marketId.localeCompare(b.marketId) || a.productId.localeCompare(b.productId));
}
export type SearchMarket = { id: string; products: readonly string[]; productsAreSample: boolean };
export type ReportSearchResult<T> = {
  market: T;
  evidence?: ProductEvidence;
  basis: 'verified_market' | 'recent_customer' | 'older_customer' | 'historical_report' | 'directory_category' | 'unknown';
  relevance: number;
  label: string;
};
/** Explicit trusted-data adapter seam. Not connected to the live seasonal page.
 * Never pass the local reporting component's state here. A demo record rejects the entire batch. */
export function rankMarketsWithTrustedReports<T extends SearchMarket>(
  markets: readonly T[], productId: string, reports: readonly ValidatedReport[], now: Date,
  policy = DEFAULT_FRESHNESS,
): ReportSearchResult<T>[] {
  const product = seasonalCatalog.products.find(p => p.id === productId);
  if (!product) throw new Error('Unknown product');
  const marketIds = new Set(markets.map(m => m.id));
  for (const r of reports) {
    if (!reportAuthority(r) || r.source.kind !== 'trusted_backend') throw new Error('Demo/untrusted data cannot enter market search');
    if (!marketIds.has(r.marketId)) throw new Error('Report outside search directory');
  }
  const evidence = new Map(aggregateReports(reports, now, policy)
    .filter(e => e.productId === productId).map(e => [e.marketId, e]));
  return markets.map(market => {
    const e = evidence.get(market.id);
    const category = !market.productsAreSample && market.products.includes(product.category);
    let basis: ReportSearchResult<T>['basis'] = category ? 'directory_category' : 'unknown';
    let relevance = category ? 1 : 0;
    if (e?.latest.availabilityStatus === 'observed') {
      if (e.freshness.category === 'historical') { basis = 'historical_report'; relevance = 2; }
      else if (e.latest.reporterType === 'market_representative' && e.latest.verificationStatus === 'verified') {
        basis = 'verified_market'; relevance = e.freshness.category === 'recent' ? 5 : 3;
      } else if (e.freshness.category === 'recent') { basis = 'recent_customer'; relevance = 4; }
      else { basis = 'older_customer'; relevance = 3; }
    }
    return { market, evidence: e, basis, relevance,
      label: e?.label ?? (category
        ? `Historical directory lists ${product.category}; exact ${product.name.toLowerCase()} availability unknown.`
        : `${product.name} availability unknown.`),
    };
  }).sort((a, b) => b.relevance - a.relevance ||
    (b.evidence?.latestObservationDate ?? '').localeCompare(a.evidence?.latestObservationDate ?? '') ||
    a.market.id.localeCompare(b.market.id));
}
