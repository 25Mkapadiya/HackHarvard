import { lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarket, usePrograms, useVendors } from '../app/data';
import { useNow, useStoreState } from '../app/context';
import { isoDay, localNow, marketStatus, nextOpening, occurrencesOn } from '../lib/schedule/occurs';
import { describeMonthDay, describeRule } from '../lib/schedule/describe';
import { hours } from '../lib/format';
import { REPO_URL } from '../app/config';
import { ErrorState, Loading, ProgramChip, SampleBadge, StaleNote } from '../components/Badges';
import { StatusBadge } from '../components/StatusBadge';
import { Icon } from '../components/Icon';
import { Calendar } from '../features/markets/Calendar';
import { Weather } from '../features/markets/Weather';
import { CheckInQr } from '../features/markets/CheckInQr';

const LocationMap = lazy(() => import('../features/map/LocationMap'));

/** "Pacific Daylight Time" for a zone at a given moment. */
const zoneName = (tz: string, lang: string, at: Date) =>
  new Intl.DateTimeFormat(lang, { timeZone: tz, timeZoneName: 'long' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value ?? tz;

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="card space-y-3 p-5">
      <h2 id={id} className="font-display text-xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MarketDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const es = lang.startsWith('es');
  const { now } = useNow();
  const market = useMarket(id);
  const vendors = useVendors();
  const programs = usePrograms();
  const { surplus } = useStoreState();

  if (market.loading) return <Loading />;
  // Ids gained a state suffix when the map went national; every older id was a Massachusetts market.
  if (market.error && id && !/-[a-z]{2}$/.test(id)) return <Navigate to={`/market/${id}-ma`} replace />;
  if (market.error || !market.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState message={t('market.notFound')} />
        <Link to="/explore">{t('market.back')}</Link>
      </div>
    );

  const m = market.data;
  const status = marketStatus(m.schedules, m.scheduleParsed, now, m.closures, m.tz);
  const next =
    status.state === 'open' || status.state === 'closing_soon'
      ? occurrencesOn(m.schedules, localNow(now, m.tz), m.closures)[0]
      : m.scheduleParsed
        ? nextOpening(m.schedules, now, m.closures, 7, m.tz)
        : undefined;
  const marketVendors = (vendors.data ?? []).filter((v) => v.marketIds.includes(m.id));
  const marketSurplus = surplus.filter((s) => s.marketId === m.id);
  const biweekly = m.schedules.some((s) => s.rrule?.includes('INTERVAL=2'));
  const correction = `${REPO_URL}/issues/new?${new URLSearchParams({
    title: `Correction: ${m.name} (${m.address.city})`,
    body: `Market id: ${m.id}\n\nWhat's wrong or out of date?\n\n`,
    labels: 'data-correction',
  })}`;
  const tractWhat = m.tract
    ? m.tract.lowIncome && m.tract.lowAccess
      ? t('market.both')
      : m.tract.lowIncome
        ? t('market.lowIncome')
        : m.tract.lowAccess
          ? t('market.lowAccess')
          : null
    : null;

  return (
    <article className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <Link to="/explore" className="inline-flex items-center gap-1 font-bold">
        <Icon name="back" size={18} /> {t('market.back')}
      </Link>

      <header className="stall-sign space-y-3 rounded-xl p-5 text-white">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{m.name}</h1>
        <Link className="font-bold text-white underline" to={`/community/markets/${m.id}`}>
          {t('community.feed')}
        </Link>
        <p className="text-lg">
          {m.address.city}, {m.address.state}
          {m.winter ? ` · ${t('filters.winter')}` : ''} · {t(`types.${m.type}`)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} now={now} onDark tz={m.tz} />
          {next && (
            <span className="font-display text-xl font-semibold text-squash">{hours(next, lang)}</span>
          )}
        </div>
      </header>
      {m.stale && <StaleNote date={m.lastUpdated} />}

      <div className="grid gap-5 md:grid-cols-2">
        <Section title={t('market.schedule')} id="sched">
          {m.scheduleParsed ? (
            <ul className="space-y-2">
              {m.schedules.map((s, i) => (
                <li key={i}>
                  <p className="font-bold">
                    {s.dates
                      ? s.dates.map((d) => describeMonthDay(d, lang)).join(', ')
                      : describeRule(s.rrule!, lang)}{' '}
                    · {hours(s as { openTime: string; closeTime: string }, lang)}
                  </p>
                  {!s.dates && (
                    <p className="text-ink-soft">
                      {t('market.season')}:{' '}
                      {s.seasonStart
                        ? `${describeMonthDay(s.seasonStart, lang)} – ${describeMonthDay(s.seasonEnd!, lang)}`
                        : t('market.yearRound')}
                    </p>
                  )}
                  {s.exceptions?.map((e) => (
                    <p key={e.date} className="text-sm text-beet">
                      {t('market.noMarketOn', { date: describeMonthDay(e.date.slice(-5), lang) })}
                    </p>
                  ))}
                  {s.note && <p className="text-sm text-ink-soft">“{s.note}”</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {t('status.unknownHelp')} <span className="font-bold">{m.scheduleRaw}</span>
            </p>
          )}
          {biweekly && <p className="text-sm text-ink-soft">{t('market.biweekly')}</p>}
          <p className="text-sm text-ink-soft">{t('market.timeZone', { zone: zoneName(m.tz, lang, now) })}</p>
          {m.scheduleParsed && (
            <>
              <h3 className="pt-2 font-bold">{t('market.nextFourWeeks')}</h3>
              <Calendar
                tz={m.tz}
                schedules={m.schedules}
                closures={m.closures}
                closureNotes={m.closureNotes}
                now={now}
              />
            </>
          )}
          <p className="text-sm text-ink-soft">
            {t('market.raw')}: {m.scheduleRaw}
          </p>
        </Section>

        <div className="space-y-5">
          <Section title={t('market.programs')} id="prog">
            {m.programs.length ? (
              <>
                <ul className="flex flex-wrap gap-2">
                  {m.programs.map((p) => (
                    <li key={p}>
                      <ProgramChip id={p} />
                    </li>
                  ))}
                </ul>
                <h3 className="font-bold">{t('market.howToUse')}</h3>
                <ul className="space-y-2">
                  {(programs.data ?? [])
                    .filter((p) => m.programs.includes(p.id))
                    .map((p) => (
                      <li key={p.id}>
                        <span className="font-bold">{es && p.es ? p.es.name : p.name}:</span>{' '}
                        {es && p.es ? p.es.howToRedeem : p.howToRedeem}
                      </li>
                    ))}
                </ul>
                <Link to="/benefits">{t('nav.benefits')} →</Link>
              </>
            ) : (
              <p className="text-ink-soft">—</p>
            )}
          </Section>

          <Section title={t('market.location')} id="there">
            <p>
              {m.address.street && <span className="block font-bold">{m.address.street}</span>}
              {m.locationNote && <span className="block">{m.locationNote}</span>}
              <span className="block">
                {m.address.city}, {m.address.state} {m.address.zip}
              </span>
            </p>
            <Suspense fallback={null}>
              <LocationMap geo={m.geo} label={`${m.name}, ${m.address.city}, ${m.address.state}`} />
            </Suspense>
            {m.website && (
              <a href={m.website} target="_blank" rel="noreferrer">
                {t('market.website')}
              </a>
            )}
            {tractWhat && <p className="text-sm text-ink-soft">{t('market.tract', { what: tractWhat })}</p>}
          </Section>

          {next && (
            <Section title={t('market.weather')} id="wx">
              <Weather geo={m.geo} day={next.day} />
            </Section>
          )}
        </div>
      </div>

      <Section title={t('market.vendors')} id="vendors">
        {marketVendors.length ? (
          <>
            <p className="text-sm">
              <SampleBadge /> {t('vendor.sampleList')}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {marketVendors.map((v) => (
                <li key={v.id} className="rounded-lg border border-line p-3">
                  <Link to={`/vendors/${v.id}`} className="font-bold">
                    {v.name}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {v.town} · {t('vendor.score')}: {v.sustainabilityScore}/100
                  </p>
                  <p className="text-sm">
                    {v.products
                      .filter((p) => p.inStock)
                      .map((p) => p.name)
                      .join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-ink-soft">{t('market.noVendors')}</p>
        )}
        {marketSurplus.length > 0 && (
          <div className="rounded-lg bg-squash-light p-3">
            <h3 className="font-bold">{t('vendor.surplus')}</h3>
            <ul>
              {marketSurplus.map((s) => (
                <li key={s.id}>
                  {s.item} — {s.quantity} {s.donate ? '(free)' : s.price ? `$${s.price}` : ''} ·{' '}
                  {marketVendors.find((v) => v.id === s.vendorId)?.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title={t('market.products')} id="products">
          {m.products.length ? (
            <>
              <ul className="flex flex-wrap gap-2">
                {m.products.map((p) => (
                  <li key={p} className="chip">
                    {t(`categories.${p}`)}
                  </li>
                ))}
              </ul>
              {m.productsAreSample && <SampleBadge />}
            </>
          ) : (
            <p className="text-ink-soft">—</p>
          )}
          <h3 className="font-bold">{t('market.payment')}</h3>
          {m.paymentMethods.length ? (
            <p>
              {m.paymentMethods.map((p) => t(`pay.${p}`)).join(', ')} {m.paymentsAreSample && <SampleBadge />}
            </p>
          ) : (
            <p className="text-ink-soft">—</p>
          )}
        </Section>

        <Section title={t('market.checkinTitle')} id="checkin">
          <CheckInQr marketId={m.id} today={isoDay(localNow(now))} />
        </Section>
      </div>

      <Section title={t('market.sources')} id="sources">
        <ul className="list-inside list-disc">
          {m.sources.map((s) => (
            <li key={`${s.name}${s.id}`}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>{' '}
              (#{s.id}, {s.fetchedAt})
            </li>
          ))}
        </ul>
        <p>{t('market.lastUpdated', { date: m.lastUpdated })}</p>
        <a className="btn-secondary" href={correction} target="_blank" rel="noreferrer">
          {t('market.correction')}
        </a>
      </Section>
    </article>
  );
}
