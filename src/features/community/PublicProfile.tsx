import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarkets, useMarket } from '../../app/data';
import { useAuth } from '../auth/authContext';
import { affiliations, client, command, imageUrl, result, type Identity } from './api';
import { useRemote, useTask } from './hooks';
import { Feedback, Page, RemoteState } from './Common';
import { FeedStream } from './Feed';
import { describeRule, describeMonthDay } from '../../lib/schedule/describe';

function DiscoverySchedule({ source }: { source: string }) {
  const market = useMarket(source);
  const { t, i18n } = useTranslation();
  return market.data ? (
    <div className="space-y-2">
      <p>
        {market.data.address.street} · {market.data.address.city}, {market.data.address.state}
      </p>
      {market.data.schedules.map((s, index) => (
        <p key={index}>
          {s.dates
            ? s.dates.map((d) => describeMonthDay(d, i18n.language)).join(', ')
            : s.rrule
              ? describeRule(s.rrule, i18n.language)
              : ''}{' '}
          {s.openTime} – {s.closeTime}
        </p>
      ))}
      <p className="text-sm text-ink-soft">
        {t('market.raw')}: {market.data.scheduleRaw}
      </p>
    </div>
  ) : null;
}

function ProfileView({ identity }: { identity: Identity }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const task = useTask();
  const relations = useRemote(useCallback(() => affiliations(), []));
  const approved = (relations.data ?? []).filter(
    (a) => a.status === 'approved' && (a.vendor_id === identity.id || a.market_id === identity.id),
  );
  return (
    <Page title={identity.display_name}>
      <section className="card space-y-4 p-5">
        {identity.image_path && (
          <img
            className="h-32 w-32 rounded-xl object-cover"
            src={imageUrl(identity.image_path)}
            alt={t('community.profileImage')}
          />
        )}
        <p className="chip">{t(`community.kind.${identity.kind}`)}</p>
        <p className="whitespace-pre-wrap break-words">{identity.description}</p>
        <p>{identity.location}</p>
        <p className="whitespace-pre-wrap break-words">{identity.details}</p>
        <p className="text-sm text-ink-soft">{t('community.publicInfo')}</p>
        {identity.kind !== 'customer' && (
          <p>{t('community.followers', { count: identity.follower_count ?? 0 })}</p>
        )}
        {identity.kind === 'market' && (
          <p>{t(identity.organizer_approved ? 'community.approvedOrganizer' : 'community.pendingLabel')}</p>
        )}
        {identity.source_market_id && (
          <Link className="btn-secondary" to={`/market/${identity.source_market_id}`}>
            {t('community.viewDiscovery')}
          </Link>
        )}
        {identity.source_market_id && <DiscoverySchedule source={identity.source_market_id} />}
        {identity.managed && (
          <Link className="btn-secondary" to="/account/identities">
            {t('community.manage')}
          </Link>
        )}
        {auth.user && identity.kind !== 'customer' && (
          <button
            className="btn-primary"
            disabled={task.busy}
            aria-pressed={!!identity.following}
            onClick={() =>
              void task.run(() => command('follow', { id: identity.id, enabled: !identity.following }), '')
            }
          >
            {t(identity.following ? 'community.unfollow' : 'community.follow')}
          </button>
        )}
        <Feedback task={task} />
      </section>
      {identity.kind !== 'customer' && (
        <section className="card space-y-3 p-5">
          <h2 className="section-title">{t('community.affiliations')}</h2>
          <p className="text-sm">{t('community.verificationNote')}</p>
          <RemoteState remote={relations} />
          {approved.map((a) => (
            <p key={a.id}>
              <Link to={`/community/profile/${identity.kind === 'vendor' ? a.market_id : a.vendor_id}`}>
                {identity.kind === 'vendor'
                  ? t('community.verification', { market: a.market?.display_name })
                  : a.vendor?.display_name}
              </Link>
            </p>
          ))}
          {!approved.length && <p>{t('community.noAffiliations')}</p>}
        </section>
      )}
      <FeedStream
        showComposer={false}
        {...(identity.kind === 'market' ? { market: identity.id } : { author: identity.id })}
      />
    </Page>
  );
}
export default function PublicProfile() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const remote = useRemote(
    useCallback(
      async () => result<Identity | null>(await client().rpc('community_identity', { p_id: id })),
      [id],
    ),
  );
  return remote.data ? (
    <ProfileView identity={remote.data} />
  ) : (
    <Page title={t('community.viewProfile')}>
      <RemoteState remote={remote} />
      {!remote.loading && !remote.error && <p>{t('community.emptyProfile')}</p>}
    </Page>
  );
}
export function MarketCommunity() {
  const { sourceId = '' } = useParams();
  const { t } = useTranslation();
  const data = useMarket(sourceId);
  const remote = useRemote(
    useCallback(async () => {
      const identity = result<Identity | null>(
        await client()
          .from('community_identities')
          .select('id')
          .eq('source_market_id', sourceId)
          .maybeSingle(),
      );
      return identity
        ? result<Identity>(await client().rpc('community_identity', { p_id: identity.id }))
        : null;
    }, [sourceId]),
  );
  if (remote.data) return <ProfileView identity={remote.data} />;
  return (
    <Page title={data.data?.name ?? t('community.directory')}>
      <RemoteState remote={remote} />
      {!remote.loading && !remote.error && <p>{t('community.marketNotCreated')}</p>}
      <Link className="btn-primary" to={`/market/${sourceId}`}>
        {t('community.viewDiscovery')}
      </Link>{' '}
      <Link className="btn-secondary" to="/account/identities">
        {t('community.marketRequest')}
      </Link>
    </Page>
  );
}
export function MarketDirectory() {
  const { t } = useTranslation();
  const markets = useMarkets();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const matches = (markets.data ?? []).filter((m) =>
    `${m.name} ${m.city} ${m.state}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Page title={t('community.directory')}>
      <label className="label">
        {t('community.searchMarket')}
        <input
          className="field"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(40);
          }}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {matches.slice(0, limit).map((m) => (
          <article key={m.id} className="card space-y-2 p-4">
            <h2 className="text-xl font-bold">
              <Link to={`/community/markets/${m.id}`}>{m.name}</Link>
            </h2>
            <p>
              {m.city}, {m.state}
            </p>
            <Link to={`/market/${m.id}`}>{t('community.viewDiscovery')}</Link>
          </article>
        ))}
      </div>
      {markets.loading && <p role="status">{t('community.loading')}</p>}
      {markets.error && <p role="alert">{t('community.unavailable')}</p>}
      {limit < matches.length && (
        <button className="btn-secondary" onClick={() => setLimit((n) => n + 40)}>
          {t('community.more')}
        </button>
      )}
    </Page>
  );
}
