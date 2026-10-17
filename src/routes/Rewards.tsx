import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useEmissionFactors, useMarkets, useVendors } from '../app/data';
import { useStoreState } from '../app/context';
import { money } from '../lib/format';
import { Loading } from '../components/Badges';

export default function Rewards() {
  const { t } = useTranslation();
  const { checkins } = useStoreState();
  const ef = useEmissionFactors();
  const markets = useMarkets();
  const vendors = useVendors();
  if (!ef.data) return <Loading />;
  const f = ef.data;
  const byId = new Map((markets.data ?? []).map((m) => [m.id, m]));

  const points = checkins.reduce((s, c) => s + c.points, 0);
  const visits = checkins.length;
  // Food miles avoided per visit = basket weight × (conventional miles − average local miles at that market).
  let tonMilesAvoided = 0;
  let milesAvoided = 0;
  for (const c of checkins) {
    const vs = (vendors.data ?? []).filter(
      (v) => v.marketIds.includes(c.marketId) && v.foodMiles !== undefined,
    );
    const local = vs.length ? vs.reduce((s, v) => s + v.foodMiles!, 0) / vs.length : 50;
    const saved = Math.max(0, f.conventionalProduceMiles - local);
    milesAvoided += saved;
    tonMilesAvoided += (f.basketLbsPerVisit / 2000) * saved;
  }
  const co2 = tonMilesAvoided * f.truckKgCO2ePerTonMile;

  const stats = [
    [t('rewards.points'), String(points)],
    [t('rewards.visits'), String(visits)],
    [t('rewards.dollars'), money(visits * f.basketDollarsPerVisit)],
    [t('rewards.miles'), Math.round(milesAvoided).toLocaleString()],
    [t('rewards.co2'), `${co2.toFixed(1)} kg`],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('rewards.title')}</h1>
      <p>{t('rewards.lede')}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="text-sm text-ink-soft">{k}</dt>
            <dd className="font-display text-3xl font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="card space-y-2 p-5" aria-labelledby="hist">
        <h2 id="hist" className="section-title">
          {t('rewards.history')}
        </h2>
        {checkins.length === 0 ? (
          <p>
            {t('rewards.empty')} <Link to="/explore">{t('nav.explore')}</Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {[...checkins].reverse().map((c) => (
              <li key={c.at} className="flex justify-between py-2">
                <Link to={`/market/${c.marketId}`}>{byId.get(c.marketId)?.name ?? c.marketId}</Link>
                <span>
                  {c.date} · {t('common.points', { n: c.points })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-1 text-sm text-ink-soft">
        <h2 className="font-bold text-ink">{t('rewards.method')}</h2>
        <p>
          {t('rewards.methodBody', {
            dollars: money(f.basketDollarsPerVisit),
            lbs: f.basketLbsPerVisit,
            conv: f.conventionalProduceMiles.toLocaleString(),
            factor: f.truckKgCO2ePerTonMile,
          })}{' '}
          <a href={f.sourceUrl} target="_blank" rel="noreferrer">
            EPA
          </a>
        </p>
      </section>
    </div>
  );
}
