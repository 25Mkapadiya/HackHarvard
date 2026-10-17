import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarkets, useVendors } from '../app/data';
import { scoreBreakdown, PRACTICE_LABELS } from '../lib/score';
import { money } from '../lib/format';
import { ErrorState, Loading, SampleBadge } from '../components/Badges';
import { ScoreBreakdown } from '../features/vendor/ScoreBreakdown';

export default function VendorDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const vendors = useVendors();
  const markets = useMarkets();
  if (vendors.loading) return <Loading />;
  const v = vendors.data?.find((x) => x.id === id);
  if (!v) return <ErrorState message={t('vendor.notFound')} />;
  const marketsById = new Map((markets.data ?? []).map((m) => [m.id, m]));

  return (
    <article className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <SampleBadge long />
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold">{v.name}</h1>
        <p className="text-ink-soft">{v.town}</p>
        <p>{v.description}</p>
      </header>

      <section className="card space-y-3 p-5" aria-labelledby="vp">
        <h2 id="vp" className="font-display text-xl font-extrabold">
          {t('vendor.products')}
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2">{t('vendor.products')}</th>
              <th className="py-2">{t('vendor.price')}</th>
              <th className="py-2">
                <span className="sr-only">{t('vendor.inStock')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {v.products.map((p) => {
              const price = v.prices[p.id];
              return (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">
                    {price ? `${money(price.amount)} / ${t(`units.${price.unit}`)}` : '—'}
                  </td>
                  <td className="py-2 text-sm">
                    {p.inStock ? (
                      t('vendor.inStock')
                    ) : (
                      <span className="text-beet">{t('vendor.outOfStock')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card space-y-2 p-5" aria-labelledby="vm">
        <h2 id="vm" className="font-display text-xl font-extrabold">
          {t('vendor.markets')}
        </h2>
        <ul className="list-inside list-disc">
          {v.marketIds.map((mid) => (
            <li key={mid}>
              <Link to={`/market/${mid}`}>{marketsById.get(mid)?.name ?? mid}</Link>
            </li>
          ))}
        </ul>
        {v.foodMiles !== undefined && (
          <p className="text-ink-soft">{t('vendor.foodMiles', { miles: Math.round(v.foodMiles) })}</p>
        )}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="vs">
        <h2 id="vs" className="font-display text-xl font-extrabold">
          {t('vendor.score')}: {v.sustainabilityScore}/100
        </h2>
        {v.certifications.length > 0 && (
          <ul>
            {v.certifications.map((c) => (
              <li key={c.id}>
                <span className="font-bold">{c.label}</span> —{' '}
                {c.verified ? t('vendor.verified') : t('vendor.selfReported')}
                {c.verifyUrl && (
                  <>
                    {' · '}
                    <a href={c.verifyUrl} target="_blank" rel="noreferrer">
                      {t('vendor.verify')}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm">
          {v.practices
            .map(
              (p) =>
                PRACTICE_LABELS[p.id] +
                (p.selfReported ? ` (${t('vendor.selfReported').toLowerCase()})` : ''),
            )
            .join(' · ')}
        </p>
        <ScoreBreakdown cats={scoreBreakdown(v)} />
        <Link to="/how-scores-work">{t('nav.scores')}</Link>
      </section>
    </article>
  );
}
