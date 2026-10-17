import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useCrops, useMarkets } from '../app/data';
import { useRegion } from '../app/useRegion';
import { useLocationState, useNow } from '../app/context';
import { marketStatus, nextOpening, localNow } from '../lib/schedule/occurs';
import { distanceKm } from '../lib/geo';
import { MarketCard } from '../features/markets/MarketCard';
import { LocationPicker } from '../features/markets/LocationPicker';
import { ErrorState, Loading } from '../components/Badges';
import { Icon } from '../components/Icon';

const NEARBY_KM = 30;

export default function Home() {
  const { t, i18n } = useTranslation();
  const { now } = useNow();
  const { origin } = useLocationState();
  const markets = useMarkets();
  const crops = useCrops();
  const month = localNow(now).m;
  const region = useRegion();

  const { openNow, soon } = useMemo(() => {
    const near = (markets.data ?? [])
      .map((m) => ({ m, km: distanceKm(origin, m.geo) }))
      .filter((x) => x.km <= NEARBY_KM)
      .sort((a, b) => a.km - b.km);
    const openNow = near.filter(({ m }) => {
      const s = marketStatus(m.schedules, m.scheduleParsed, now, m.closures, m.tz, 0).state;
      return s === 'open' || s === 'closing_soon';
    });
    const soon = near
      .map((x) => ({
        ...x,
        next: x.m.scheduleParsed ? nextOpening(x.m.schedules, now, x.m.closures, 14, x.m.tz) : undefined,
      }))
      .filter((x) => x.next)
      .sort(
        (a, b) =>
          a.next!.day.y * 1e4 +
            a.next!.day.m * 100 +
            a.next!.day.d -
            (b.next!.day.y * 1e4 + b.next!.day.m * 100 + b.next!.day.d) ||
          a.next!.openTime.localeCompare(b.next!.openTime) ||
          a.km - b.km,
      );
    return { openNow: openNow.slice(0, 6), soon: soon.slice(0, 6) };
  }, [markets.data, origin, now]);

  const inSeason = crops.data?.crops.filter((c) => c.months[region.id]?.includes(month)).slice(0, 12) ?? [];
  const list = openNow.length ? openNow : soon;

  return (
    <div>
      <section className="border-b border-line bg-kale-light">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:py-12">
          <h1 className="max-w-2xl text-4xl font-extrabold sm:text-5xl">{t('home.title')}</h1>
          <p className="max-w-2xl text-lg">{t('home.lede')}</p>
          <LocationPicker />
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 py-8" aria-labelledby="near-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="near-h" className="section-title">
            {openNow.length ? t('home.openNow') : t('home.openSoon')}
          </h2>
          <Link to="/explore" className="btn-quiet">
            <Icon name="map" /> {t('home.seeMap')}
          </Link>
        </div>
        {markets.loading && <Loading />}
        {markets.error && <ErrorState retry={markets.retry} />}
        {markets.data && !openNow.length && (
          <p className="text-ink-soft">
            {t('home.noneOpen')} <Link to="/explore?when=week">{t('home.showWeekend')}</Link>
          </p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ m }) => (
            <li key={m.id}>
              <MarketCard m={m} now={now} origin={origin} />
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <Icon name="info" size={16} className="mt-0.5" />
          {t('home.staleNote')}
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-4 md:grid-cols-2">
        <div className="card space-y-3 p-5">
          <h2 className="section-title">{t('home.inSeason')}</h2>
          {region.name && <p className="text-sm text-ink-soft">{region.name}</p>}
          <ul className="flex flex-wrap gap-2">
            {inSeason.map((c) => (
              <li key={c.id}>
                <Link
                  className="chip no-underline hover:border-kale"
                  to={`/search?q=${encodeURIComponent(c.name)}`}
                >
                  {i18n.language.startsWith('es') ? c.nameEs : c.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link to={`/seasonal?region=${region.id}`} className="font-bold">
            {t('home.seeSeason')}
          </Link>
        </div>
        <div className="card space-y-3 border-squash bg-squash-light p-5">
          <h2 className="section-title">{t('home.benefitsTitle')}</h2>
          <p>{t('home.benefitsBody')}</p>
          <Link to="/benefits" className="btn-primary">
            {t('home.benefitsCta')} <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </div>
  );
}
