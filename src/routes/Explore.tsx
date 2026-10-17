import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarkets } from '../app/data';
import { useLocationState, useNow } from '../app/context';
import { activeFilterCount, applyFilters, filtersToParams, parseFilters, type Filters } from '../lib/filters';
import { distanceKm } from '../lib/geo';
import { FilterPanel } from '../features/map/FilterPanel';
import { MarketCard } from '../features/markets/MarketCard';
import { ErrorState, Loading } from '../components/Badges';
import { Icon } from '../components/Icon';
import { useMedia } from '../lib/useMedia';

const MarketMap = lazy(() => import('../features/map/MarketMap'));

export default function Explore() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const f = parseFilters(sp);
  const view = sp.get('view') === 'map' ? 'map' : 'list';
  const { now } = useNow();
  const { origin, isDefault } = useLocationState();
  const markets = useMarkets();
  const desktop = useMedia('(min-width: 1024px)');
  const showMap = desktop || view === 'map';

  const query = sp.toString();
  const results = useMemo(() => {
    if (!markets.data) return [];
    const filters = parseFilters(new URLSearchParams(query));
    return applyFilters(markets.data, filters, now, origin).sort(
      (a, b) => distanceKm(origin, a.geo) - distanceKm(origin, b.geo),
    );
  }, [markets.data, query, now, origin]);

  const update = (next: Filters) => setSp(filtersToParams(next, sp), { replace: true });
  const setView = (v: 'map' | 'list') => {
    const n = new URLSearchParams(sp);
    n.set('view', v);
    setSp(n, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold">{t('explore.title')}</h1>
        <p className="font-bold" role="status" aria-live="polite">
          {t('explore.results', { count: results.length })}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)_minmax(0,1.3fr)]">
        <aside className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-auto">
          <details className="card p-4" open={desktop}>
            <summary className="flex cursor-pointer items-center gap-2 font-bold">
              <Icon name="filter" />
              {t('explore.filters')}
              {activeFilterCount(f) > 0 && <span className="chip">{activeFilterCount(f)}</span>}
            </summary>
            <div className="mt-4">
              <FilterPanel f={f} onChange={update} hasLocation={!isDefault} />
            </div>
          </details>
        </aside>

        <div className="flex gap-2 lg:hidden" role="group" aria-label="View">
          <button
            className={view === 'list' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <Icon name="list" /> {t('explore.showList')}
          </button>
          <button
            className={view === 'map' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
            aria-pressed={view === 'map'}
            onClick={() => setView('map')}
          >
            <Icon name="map" /> {t('explore.showMap')}
          </button>
        </div>

        <section
          className={`${view === 'map' ? 'hidden lg:block' : ''} space-y-3`}
          aria-label={t('explore.showList')}
        >
          {markets.loading && <Loading />}
          {markets.error && <ErrorState retry={markets.retry} />}
          {markets.data && results.length === 0 && (
            <div className="card p-4">
              <p className="font-bold">{t('explore.noResults')}</p>
              <p className="text-ink-soft">{t('explore.loosen')}</p>
            </div>
          )}
          <ul className="space-y-3">
            {results.slice(0, 80).map((m) => (
              <li key={m.id}>
                <MarketCard m={m} now={now} origin={origin} />
              </li>
            ))}
          </ul>
        </section>

        <section
          className={`${view === 'list' ? 'hidden lg:block' : ''} lg:sticky lg:top-28 lg:h-[calc(100vh-8rem)]`}
        >
          <label className="toggle mb-2 text-sm">
            <input
              type="checkbox"
              checked={!!f.lila}
              onChange={() => update({ ...f, lila: !f.lila || undefined })}
            />
            {t('explore.lilaLayer')}
          </label>
          {f.lila && <p className="mb-2 text-sm text-ink-soft">{t('explore.lilaLegend')}</p>}
          <div className="h-[65vh] overflow-hidden rounded-xl border border-line lg:h-[calc(100%-3rem)]">
            {showMap && (
              <Suspense fallback={<Loading />}>
                <MarketMap markets={results} now={now} origin={origin} showTracts={!!f.lila} />
              </Suspense>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
