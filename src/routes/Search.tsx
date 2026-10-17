import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type MiniSearch from 'minisearch';
import { loadJson, useCrops, useMarkets, useVendors } from '../app/data';
import { useLocationState, useNow } from '../app/context';
import { SEARCH_OPTIONS, type SearchDoc } from '../lib/search/options';
import { localNow, nextOpening, marketStatus, opensWithin } from '../lib/schedule/occurs';
import { monthName } from '../lib/format';
import { distanceKm } from '../lib/geo';
import { MarketCard } from '../features/markets/MarketCard';
import { Loading, SampleBadge } from '../components/Badges';
import { Icon } from '../components/Icon';
import type { ProductCategoryId } from '../types';
import type { MarketView } from '../lib/filters';

let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null;
function loadIndex() {
  indexPromise ??= Promise.all([import('minisearch'), loadJson<object>('search-index.json')]).then(
    ([mod, json]) => mod.default.loadJSON<SearchDoc>(JSON.stringify(json), SEARCH_OPTIONS),
  );
  return indexPromise;
}

type Hit = SearchDoc & { score: number };
const EXAMPLES = ['Strawberries', 'Eggs', 'Apples', 'Bread', 'Mushrooms', 'Fish'];

/** Months like [6,7] → "June and July"; consecutive runs → "June–October". */
function monthsText(months: number[], lang: string) {
  if (!months.length) return '';
  const sorted = [...months].sort((a, b) => a - b);
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 2)
    return `${monthName(sorted[0], lang)}–${monthName(sorted.at(-1)!, lang)}`;
  return sorted.map((m) => monthName(m, lang)).join(', ');
}

function SearchForm({ initial, onSubmit }: { initial: string; onSubmit: (q: string) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(draft.trim());
  };
  return (
    <form onSubmit={submit} role="search" className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        {t('search.label')}
      </label>
      <input
        id="q"
        className="field text-lg"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('search.placeholder')}
      />
      <button className="btn-primary" type="submit">
        <Icon name="search" /> {t('search.go')}
      </button>
    </form>
  );
}

export default function Search() {
  const { t, i18n } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const [found, setFound] = useState<{ q: string; hits: Hit[] } | null>(null);
  const hits = q && found?.q === q ? found.hits : null;
  const { now } = useNow();
  const { origin } = useLocationState();
  const markets = useMarkets();
  const vendors = useVendors();
  const crops = useCrops();

  useEffect(() => {
    if (!q) return;
    let live = true;
    loadIndex().then((idx) => live && setFound({ q, hits: idx.search(q) as unknown as Hit[] }));
    return () => {
      live = false;
    };
  }, [q]);

  const result = useMemo(() => {
    if (!hits || !markets.data || !vendors.data) return null;
    const top = hits[0];
    if (!top) return { kind: 'none' as const };
    if (top.kind === 'market')
      return { kind: 'markets' as const, markets: hits.filter((h) => h.kind === 'market').slice(0, 10) };
    if (top.kind === 'vendor')
      return { kind: 'vendors' as const, vendors: hits.filter((h) => h.kind === 'vendor').slice(0, 10) };
    // Crop or category: find markets selling it that open in the next 7 days.
    // Open now sorts first, then by the next opening.
    const soonest = (m: MarketView) => {
      const s = marketStatus(m.schedules, true, now, m.closures);
      if (s.state === 'open' || s.state === 'closing_soon') return 0;
      const n = nextOpening(m.schedules, now, m.closures, 7);
      return n
        ? n.day.y * 1e8 + n.day.m * 1e6 + n.day.d * 1e4 + Number(n.openTime.replace(':', ''))
        : Infinity;
    };
    const crop = top.kind === 'crop' ? crops.data?.crops.find((c) => c.id === top.ref) : undefined;
    const category = (top.category ?? top.ref) as ProductCategoryId;
    const sellers = vendors.data.filter((v) =>
      v.products.some((p) => p.inStock && (crop ? p.crop === crop.id : p.category === category)),
    );
    const sellerMarkets = new Set(sellers.flatMap((v) => v.marketIds));
    const list = markets.data
      .filter((m) => (crop ? sellerMarkets.has(m.id) : m.products.includes(category)))
      .filter((m) => m.scheduleParsed && opensWithin(m.schedules, now, 7, m.closures))
      .map((m) => ({ m, when: soonest(m) }))
      .sort((a, b) => a.when - b.when || distanceKm(origin, a.m.geo) - distanceKm(origin, b.m.geo))
      .map((x) => x.m);
    return { kind: 'food' as const, crop, category, sellers, markets: list };
  }, [hits, markets.data, vendors.data, crops.data, now, origin]);

  const month = localNow(now).m;
  const es = i18n.language.startsWith('es');

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('search.title')}</h1>
      <SearchForm key={q} initial={q} onSubmit={(v) => setSp(v ? { q: v } : {})} />
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-ink-soft">{t('search.examples')}</span>
        {EXAMPLES.map((e) => (
          <Link key={e} to={`/search?q=${e}`} className="chip no-underline">
            {e}
          </Link>
        ))}
      </p>

      {q && !result && <Loading />}
      {result?.kind === 'none' && <p>{t('search.nothing', { q })}</p>}

      {result?.kind === 'markets' && (
        <ul className="space-y-2">
          {result.markets.map((h) => (
            <li key={h.id}>
              <Link to={`/market/${h.ref}`} className="font-bold">
                {h.name}
              </Link>{' '}
              · {h.city}
            </li>
          ))}
        </ul>
      )}

      {result?.kind === 'vendors' && (
        <ul className="space-y-2">
          {result.vendors.map((h) => (
            <li key={h.id}>
              <Link to={`/vendors/${h.ref}`} className="font-bold">
                {h.name}
              </Link>{' '}
              · {h.city} <SampleBadge />
            </li>
          ))}
        </ul>
      )}

      {result?.kind === 'food' && (
        <section className="space-y-4" aria-live="polite">
          {result.crop && (
            <p
              className={`rounded-lg p-3 ${result.crop.months.includes(month) ? 'bg-kale-light' : 'bg-squash-light'}`}
            >
              <Icon name="leaf" className="mr-1 inline" />
              {result.crop.months.includes(month)
                ? t('search.inSeason', { crop: es ? result.crop.nameEs : result.crop.name })
                : t('search.outOfSeason', {
                    crop: es ? result.crop.nameEs : result.crop.name,
                    months: monthsText(result.crop.months, i18n.language),
                  })}
            </p>
          )}
          <h2 className="section-title">
            {t('search.resultsFor', {
              what: result.crop
                ? (es ? result.crop.nameEs : result.crop.name).toLowerCase()
                : t(`categories.${result.category}`).toLowerCase(),
            })}
          </h2>
          <SampleBadge />
          {result.markets.length === 0 ? (
            <p>
              {t('search.noMatch', {
                what: (result.crop?.name ?? t(`categories.${result.category}`)).toLowerCase(),
              })}{' '}
              <Link to="/explore">{t('search.tryMap')}</Link>
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {result.markets.slice(0, 12).map((m) => (
                <li key={m.id}>
                  <MarketCard m={m} now={now} origin={origin} compact />
                </li>
              ))}
            </ul>
          )}
          {result.sellers.length > 0 && (
            <>
              <h3 className="font-bold">{t('search.vendorsCarrying')}</h3>
              <ul className="flex flex-wrap gap-2">
                {result.sellers.map((v) => (
                  <li key={v.id}>
                    <Link to={`/vendors/${v.id}`} className="chip">
                      {v.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
