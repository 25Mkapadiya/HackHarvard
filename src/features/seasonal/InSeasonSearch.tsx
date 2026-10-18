import { PurchaseWorkspace } from '../purchases/PurchaseWorkspace';
import { useSearchParams, Link } from 'react-router';
import { useCrops, useMarkets } from '../../app/data';
import { useLocationState, useNow } from '../../app/context';
import { useRegion } from '../../app/useRegion';
import { localNow } from '../../lib/schedule/occurs';
import { monthName } from '../../lib/format';
import { LocationPicker } from '../markets/LocationPicker';
import { MarketCard } from '../markets/MarketCard';
import { Loading, ErrorState } from '../../components/Badges';
import { recommend, regionalMarkets, VERIFIED_MA } from './ranking';

export default function InSeasonSearch() {
  const [sp, setSp] = useSearchParams();
  const crops = useCrops();
  const markets = useMarkets();
  const inferred = useRegion(sp.get('region'));
  const { origin } = useLocationState();
  const { now } = useNow();
  const region = sp.get('region') === 'verified-ma' ? 'verified-ma' : inferred.id;
  const requestedMonth = Number(sp.get('month'));
  const month =
    requestedMonth >= 1 && requestedMonth <= 12 && Number.isInteger(requestedMonth)
      ? requestedMonth
      : localNow(now).m;
  const q = (sp.get('q') ?? '').trim().toLocaleLowerCase();
  const maxKm = sp.get('near') === '1' ? 80 : undefined;
  function param(key: string, value: string) {
    const next = new URLSearchParams(sp);
    next.set(key, value);
    setSp(next, { replace: true });
  }
  if (crops.error || markets.error)
    return (
      <ErrorState
        retry={() => {
          crops.retry();
          markets.retry();
        }}
      />
    );
  if (!crops.data || !markets.data) return <Loading />;
  const regions: Record<string, { name: string; states: string[] }> = {
    ...crops.data.regions,
    'verified-ma': VERIFIED_MA,
  };
  const selected = regions[region];
  const nearby = regionalMarkets(markets.data, selected.states, origin, maxKm);
  const calendar = crops.data.crops.map((c) => ({
    ...c,
    months: { ...c.months, ...(VERIFIED_MA.months[c.id] ? { 'verified-ma': VERIFIED_MA.months[c.id] } : {}) },
  }));
  const ranked = recommend(calendar, region, month, nearby);
  const foods = ranked.filter(
    ({ crop }) =>
      !q || `${crop.name} ${crop.nameEs} ${crop.category.replaceAll('_', ' ')}`.toLowerCase().includes(q),
  );
  const matches = q ? new Set(foods.flatMap((f) => f.reported.map((m) => m.id))) : null;
  const results = nearby.filter(
    (m) =>
      !q ||
      matches?.has(m.id) ||
      (!m.productsAreSample && m.products.some((p) => p.replaceAll('_', ' ').includes(q))) ||
      `${m.name} ${m.city}`.toLowerCase().includes(q),
  );
  const seasonal = foods.filter((f) => f.signals.A === 1);
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold">In Season Search</h1>
      <p>
        Discover seasonal food and reported market offerings. Directory categories are not live inventory;
        contact markets before travelling.
      </p>
      <div className="flex gap-3">
        <button className="btn-secondary" onClick={() => param('view', 'search')}>
          Seasonal search
        </button>
        <button className="btn-secondary" onClick={() => param('view', 'purchases')}>
          Purchases & sustainability
        </button>
      </div>
      {sp.get('view') === 'purchases' ? (
        <PurchaseWorkspace markets={markets.data} />
      ) : (
        <>
          <LocationPicker />
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Growing region
              <select className="field" value={region} onChange={(e) => param('region', e.target.value)}>
                {Object.entries(regions).map(([id, r]) => (
                  <option key={id} value={id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Month
              <select className="field" value={month} onChange={(e) => param('month', e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {monthName(i + 1, 'en')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Food or market search
              <input
                className="field"
                type="search"
                value={sp.get('q') ?? ''}
                onChange={(e) => param('q', e.target.value)}
                placeholder="Apples, eggs, market name…"
              />
            </label>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={maxKm !== undefined}
              onChange={(e) => param('near', e.target.checked ? '1' : '0')}
            />
            Within 80 km of selected location, in this region
          </label>
          <section className="card space-y-2 p-4">
            <h2 className="section-title">
              {monthName(month, 'en')} · {selected.name}
            </h2>
            <p className="text-sm">
              {region === 'verified-ma' ? VERIFIED_MA.note : `Approximate regional guide: ${crops.data.note}`}
            </p>
            <a
              href={region === 'verified-ma' ? VERIFIED_MA.url : crops.data.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {region === 'verified-ma' ? VERIFIED_MA.source : crops.data.source}
            </a>
            <ul className="flex flex-wrap gap-2">
              {seasonal.map(({ crop }) => (
                <li key={crop.id}>
                  <button className="chip" onClick={() => param('q', crop.name)}>
                    {crop.name}
                  </button>
                </li>
              ))}
            </ul>
            {!seasonal.length && (
              <p>No matching seasonal entries in this guide. Missing entries do not prove unavailability.</p>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="section-title">Commonly reported food categories</h2>
            <p>
              Popularity and agricultural relevance measurements are unavailable. Ranking uses seasonal
              guidance and non-sample directory category reports, redistributing missing weights.
            </p>
            <ul className="grid gap-3 sm:grid-cols-3">
              {foods
                .filter((f) => f.reported.length)
                .slice(0, 12)
                .map(({ crop, reported, score }) => (
                  <li key={crop.id} className="card p-3">
                    <button className="font-bold underline" onClick={() => param('q', crop.name)}>
                      {crop.name}
                    </button>
                    <p>
                      {reported.length} markets report {crop.category}; exact product unconfirmed.
                    </p>
                    <p>Recommendation: {score?.toFixed(2)} / 1</p>
                  </li>
                ))}
            </ul>
          </section>
          <section className="space-y-3">
            <h2 className="section-title">
              Markets in {selected.name} ({results.length})
            </h2>
            <p>
              Ordered by distance to your selected location. Schedules may be unknown. A recent download does
              not mean recent reporting: some USDA records originate in 2014. Seasonal results update with the
              month; market data follows the existing weekly publication schedule. Reload to retrieve
              published updates.
            </p>
            {!results.length && (
              <p>
                No matching reported offerings. Try a food category, change region, or widen the distance
                filter.
              </p>
            )}
            <ul className="grid gap-4 sm:grid-cols-2">
              {results.slice(0, 20).map((m) => (
                <li key={m.id}>
                  <MarketCard m={m} now={now} origin={origin} compact />
                  <p className="text-sm">
                    {m.scheduleRaw || 'Operating information unavailable — confirm with market.'} · Dataset
                    update: {m.lastUpdated || 'unknown'}
                  </p>
                </li>
              ))}
            </ul>
            {results.length > 20 && (
              <p>
                Showing the nearest 20. Refine your search or <Link to="/explore">use the map</Link>.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
