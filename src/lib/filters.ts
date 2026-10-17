import type { MarketSummary, PaymentMethodId, ProductCategoryId, ProgramId } from '../types';
import { distanceKm, type LatLng } from './geo';
import { marketStatus, occurrencesOn, opensWithin, localNow, addDays, weekdayOf } from './schedule/occurs';

// Filters live in the URL query so filtered views can be shared. All filtering is client-side.

export type When = 'any' | 'now' | 'today' | 'week' | `day${0 | 1 | 2 | 3 | 4 | 5 | 6}`;
export type Filters = {
  when: When;
  maxKm?: number;
  products: ProductCategoryId[];
  pay: PaymentMethodId[];
  programs: ProgramId[];
  winter?: boolean;
  indoor?: boolean;
  minScore?: number;
  lila?: boolean;
  q?: string;
};

export const DEFAULT_FILTERS: Filters = { when: 'any', products: [], pay: [], programs: [] };

const list = <T extends string>(v: string | null) => (v ? (v.split(',').filter(Boolean) as T[]) : []);

export function parseFilters(sp: URLSearchParams): Filters {
  const when = (sp.get('when') ?? 'any') as When;
  return {
    when: /^(any|now|today|week|day[0-6])$/.test(when) ? when : 'any',
    maxKm: sp.get('km') ? Number(sp.get('km')) : undefined,
    products: list(sp.get('p')),
    pay: list(sp.get('pay')),
    programs: list(sp.get('prog')),
    winter: sp.get('winter') === '1' || undefined,
    indoor: sp.get('indoor') === '1' || undefined,
    minScore: sp.get('score') ? Number(sp.get('score')) : undefined,
    lila: sp.get('lila') === '1' || undefined,
    q: sp.get('q') || undefined,
  };
}

export function filtersToParams(f: Filters, base = new URLSearchParams()): URLSearchParams {
  const sp = new URLSearchParams(base);
  const set = (k: string, v: string | undefined) => (v ? sp.set(k, v) : sp.delete(k));
  set('when', f.when === 'any' ? undefined : f.when);
  set('km', f.maxKm ? String(f.maxKm) : undefined);
  set('p', f.products.join(','));
  set('pay', f.pay.join(','));
  set('prog', f.programs.join(','));
  set('winter', f.winter ? '1' : undefined);
  set('indoor', f.indoor ? '1' : undefined);
  set('score', f.minScore ? String(f.minScore) : undefined);
  set('lila', f.lila ? '1' : undefined);
  set('q', f.q);
  return sp;
}

export const activeFilterCount = (f: Filters) =>
  (f.when !== 'any' ? 1 : 0) +
  (f.maxKm ? 1 : 0) +
  f.products.length +
  f.pay.length +
  f.programs.length +
  (f.winter ? 1 : 0) +
  (f.indoor ? 1 : 0) +
  (f.minScore ? 1 : 0) +
  (f.q ? 1 : 0);

export type MarketView = MarketSummary & { geo: LatLng; closures: string[] };

export function matchesWhen(m: MarketView, when: When, now: Date): boolean {
  if (when === 'any') return true;
  if (!m.scheduleParsed) return false;
  if (when === 'now') {
    const s = marketStatus(m.schedules, true, now, m.closures).state;
    return s === 'open' || s === 'closing_soon';
  }
  if (when === 'today') return occurrencesOn(m.schedules, localNow(now), m.closures).length > 0;
  if (when === 'week') return opensWithin(m.schedules, now, 7, m.closures);
  // A specific weekday: the next date with that weekday.
  const wd = Number(when.slice(3));
  const today = localNow(now);
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    if (weekdayOf(day) === wd) return occurrencesOn(m.schedules, day, m.closures).length > 0;
  }
  return false;
}

export function applyFilters(markets: MarketView[], f: Filters, now: Date, origin?: LatLng): MarketView[] {
  const q = f.q?.toLowerCase().trim();
  return markets.filter((m) => {
    if (!matchesWhen(m, f.when, now)) return false;
    if (f.maxKm && origin && distanceKm(origin, m.geo) > f.maxKm) return false;
    if (f.products.length && !f.products.every((p) => m.products.includes(p))) return false;
    if (f.pay.length && !f.pay.every((p) => m.paymentMethods.includes(p))) return false;
    if (f.programs.length && !f.programs.every((p) => m.programs.includes(p))) return false;
    if (f.winter && !m.winter) return false;
    if (f.indoor && !m.indoor) return false;
    if (f.minScore && m.sustainabilityMax < f.minScore) return false;
    if (q && !`${m.name} ${m.city}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
