import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarkets } from '../../app/data';
import { useAuth } from '../auth/authContext';
import {
  affiliations,
  identityFields,
  command,
  workspace,
  client,
  result,
  upload,
  removeImage,
  type Identity,
  type Claim,
} from './api';
import { useRemote, useTask } from './hooks';
import { Feedback, Page, RequireUser, RemoteState } from './Common';

export function MarketPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const markets = useMarkets();
  const [query, setQuery] = useState('');
  const options = (markets.data ?? [])
    .filter((m) => `${m.name} ${m.city} ${m.state}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);
  const selected = markets.data?.find((m) => m.id === value);
  return (
    <div className="space-y-2">
      <label className="label">
        {t('community.searchMarket')}
        <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
      </label>
      <label className="label">
        {t('community.chooseMarket')}
        <select className="field" value={value} required onChange={(e) => onChange(e.target.value)}>
          <option value="">{t('community.chooseMarket')}</option>
          {selected && !options.some((m) => m.id === value) && (
            <option value={selected.id}>{selected.name}</option>
          )}
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.city}, {m.state}
            </option>
          ))}
        </select>
      </label>
      {markets.loading && <p role="status">{t('community.loading')}</p>}
      {markets.error && <p role="alert">{t('community.unavailable')}</p>}
    </div>
  );
}
function IdentityForm({ identity }: { identity?: Identity }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const task = useTask();
  const [name, setName] = useState(identity?.display_name ?? '');
  const [description, setDescription] = useState(identity?.description ?? '');
  const [location, setLocation] = useState(identity?.location ?? '');
  const [details, setDetails] = useState(identity?.details ?? '');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(identity?.image_path ?? null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    let uploaded: string | null = null;
    await task.run(async () => {
      try {
        if (file && auth.user) uploaded = await upload(file, auth.user.id);
        await command(identity ? 'identity_save' : 'vendor_create', {
          id: identity?.id,
          display_name: name.trim(),
          description,
          location,
          details,
          image_path: uploaded ?? path,
        });
        if (uploaded) {
          setPath(uploaded);
          setFile(null);
          if (fileInput.current) fileInput.current.value = '';
        }
        if (!identity) {
          setName('');
          setDescription('');
          setLocation('');
          setDetails('');
        }
        if (identity?.image_path && identity.image_path !== (uploaded ?? path))
          await removeImage(identity.image_path);
      } catch (error) {
        if (uploaded) await removeImage(uploaded);
        throw error;
      }
    });
  }
  return (
    <form className="card space-y-4 p-5" onSubmit={submit}>
      <h2 className="section-title">{identity ? identity.display_name : t('community.vendorCreate')}</h2>
      {!identity && <p>{t('community.vendorHint')}</p>}
      <fieldset disabled={task.busy} className="space-y-3">
        <label className="label">
          {t('community.name')}
          <input
            className="field"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="label">
          {t('community.description')}
          <textarea
            className="field"
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="label">
          {t('community.location')}
          <input
            className="field"
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="label">
          {t('community.details')}
          <textarea
            className="field"
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        {identity && (
          <>
            <label className="label">
              {t('community.photo')}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {path && (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setPath(null);
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = '';
                }}
              >
                {t('community.removeImage')}
              </button>
            )}
          </>
        )}
        <button className="btn-primary">{t('community.save')}</button>
      </fieldset>
      <Feedback task={task} />
      {identity && <Link to={`/community/profile/${identity.id}`}>{t('community.viewProfile')}</Link>}
    </form>
  );
}
function MarketRequest() {
  const { t } = useTranslation();
  const task = useTask();
  const [source, setSource] = useState('');
  const [propose, setPropose] = useState(false);
  const [name, setName] = useState('');
  const [evidence, setEvidence] = useState('');
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void task.run(async () => {
          await command('market_request', {
            source_market_id: propose ? null : source,
            display_name: name,
            evidence,
          });
          setEvidence('');
        });
      }}
    >
      <h2 className="section-title">{t('community.marketRequest')}</h2>
      <p>{t('community.marketHint')}</p>
      <fieldset className="space-y-3" disabled={task.busy}>
        <label>
          <input type="checkbox" checked={propose} onChange={(e) => setPropose(e.target.checked)} />{' '}
          {t('community.proposeMarket')}
        </label>
        {propose ? (
          <label className="label">
            {t('community.name')}
            <input
              className="field"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        ) : (
          <MarketPicker value={source} onChange={setSource} />
        )}
        <label className="label">
          {t('community.evidence')}
          <textarea
            className="field"
            required
            minLength={10}
            maxLength={2000}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
        <button className="btn-primary">{t('community.submit')}</button>
      </fieldset>
      <Feedback task={task} />
    </form>
  );
}
function VendorRequest({ vendor }: { vendor: Identity }) {
  const { t } = useTranslation();
  const [source, setSource] = useState('');
  const task = useTask();
  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void task.run(async () => {
          const m = await command('market_reference', { source_market_id: source });
          await command('affiliation_request', { vendor_id: vendor.id, market_id: m.id });
        });
      }}
    >
      <h3 className="text-xl font-bold">
        {vendor.display_name}: {t('community.requestAffiliation')}
      </h3>
      <fieldset className="space-y-3" disabled={task.busy}>
        <MarketPicker value={source} onChange={setSource} />
        <button className="btn-primary">{t('community.submit')}</button>
      </fieldset>
      <Feedback task={task} />
    </form>
  );
}
function AdminQueue() {
  const { t } = useTranslation();
  const task = useTask();
  const queue = useRemote(
    useCallback(
      async () => ({
        claims: result<Claim[]>(
          await client()
            .from('community_organizer_requests')
            .select(`*,market:community_identities(${identityFields})`)
            .eq('status', 'pending'),
        ),
        reports: result<{ id: string; target_kind: string; target_id: string; reason: string }[]>(
          await client().from('community_reports').select('*').eq('resolved', false),
        ),
        members: result<{ identity_id: string; user_id: string; identity: Identity }[]>(
          await client()
            .from('community_members')
            .select(`*,identity:community_identities(${identityFields})`),
        ),
      }),
      [],
    ),
  );
  return (
    <section className="card space-y-4 p-5">
      <h2 className="section-title">{t('community.admin')}</h2>
      <p>{t('community.adminHint')}</p>
      <RemoteState remote={queue} />
      <Feedback task={task} />
      <h3 className="text-xl font-bold">{t('community.organizerQueue')}</h3>
      {queue.data?.claims.map((c) => (
        <article className="border-t border-line py-3" key={c.id}>
          <p className="font-bold">{c.market?.display_name ?? c.proposed_name}</p>
          <p className="whitespace-pre-wrap break-words">{c.evidence}</p>
          <p className="break-all text-sm">{c.applicant_id}</p>
          <button
            disabled={task.busy}
            className="btn-primary"
            onClick={() => void task.run(() => command('market_review', { id: c.id, status: 'approved' }))}
          >
            {t('community.approve')}
          </button>{' '}
          <button
            className="btn-secondary"
            disabled={task.busy}
            onClick={() => void task.run(() => command('market_review', { id: c.id, status: 'rejected' }))}
          >
            {t('community.reject')}
          </button>
        </article>
      ))}
      <h3 className="text-xl font-bold">{t('community.reports')}</h3>
      {queue.data?.reports.map((r) => (
        <article key={r.id} className="space-y-2 border-t border-line py-3">
          <p>
            {t('community.reportTarget', {
              kind: r.target_kind === 'post' ? t('community.feed') : t('community.comment'),
              id: r.target_id,
            })}
          </p>
          <p>{r.reason}</p>
          <button
            disabled={task.busy}
            className="btn-secondary"
            onClick={() =>
              void task.run(() =>
                command(r.target_kind === 'post' ? 'post_delete' : 'comment_delete', { id: r.target_id }),
              )
            }
          >
            {t('community.delete')}
          </button>{' '}
          <button
            disabled={task.busy}
            className="btn-secondary"
            onClick={() => void task.run(() => command('report_resolve', { id: r.id }))}
          >
            {t('community.resolve')}
          </button>
        </article>
      ))}
      <h3 className="text-xl font-bold">{t('community.members')}</h3>
      {queue.data?.members
        .filter((m) => m.identity.kind === 'market')
        .map((m) => (
          <div key={`${m.identity_id}${m.user_id}`} className="border-t border-line py-3">
            <p>{m.identity.display_name}</p>
            <p className="break-all text-sm">{m.user_id}</p>
            <button
              className="btn-secondary"
              disabled={task.busy}
              onClick={() =>
                void task.run(() => command('member_revoke', { id: m.identity_id, user_id: m.user_id }))
              }
            >
              {t('community.revokeMember')}
            </button>
          </div>
        ))}
    </section>
  );
}
export default function Manage() {
  const auth = useAuth();
  const { t } = useTranslation();
  const task = useTask();
  const mine = useRemote(useCallback(() => workspace(auth.user?.id ?? null), [auth.user?.id]));
  const relations = useRemote(useCallback(() => affiliations(), []));
  const owns = (id: string) => mine.data?.identities.some((i) => i.id === id);
  return (
    <Page title={t('community.manage')}>
      <RequireUser>
        <RemoteState remote={mine} />
        <Link to="/account">{t('account.title')}</Link>
        {mine.data?.identities
          .filter((i) => i.kind !== 'customer')
          .map((i) => (
            <IdentityForm key={i.id} identity={i} />
          ))}
        {mine.data?.profile && (
          <>
            <IdentityForm />
            <MarketRequest />
            {mine.data.identities
              .filter((i) => i.kind === 'vendor')
              .map((i) => (
                <VendorRequest key={i.id} vendor={i} />
              ))}
          </>
        )}
        <section className="card space-y-3 p-5">
          <h2 className="section-title">{t('community.requests')}</h2>
          {mine.data?.claims.map((c) => (
            <p key={c.id}>
              {c.market?.display_name ?? c.proposed_name} · {t(`community.status.${c.status}`)}
            </p>
          ))}
          {mine.data?.claims.length === 0 && <p>{t('community.emptyRequests')}</p>}
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="section-title">{t('community.affiliationQueue')}</h2>
          <p>{t('community.verificationNote')}</p>
          <RemoteState remote={relations} />
          <Feedback task={task} />
          {relations.data
            ?.filter((a) => owns(a.vendor_id) || owns(a.market_id))
            .map((a) => (
              <article className="space-y-2 border-t border-line py-3" key={a.id}>
                <p>
                  <Link to={`/community/profile/${a.vendor_id}`}>{a.vendor?.display_name}</Link> ·{' '}
                  <Link to={`/community/profile/${a.market_id}`}>{a.market?.display_name}</Link> ·{' '}
                  {t(`community.status.${a.status}`)}
                </p>
                {owns(a.market_id) && !owns(a.vendor_id) && (
                  <div className="flex flex-wrap gap-2">
                    {(a.status === 'pending'
                      ? ['approved', 'rejected']
                      : a.status === 'approved'
                        ? ['revoked']
                        : []
                    ).map((status) => (
                      <button
                        className="btn-secondary"
                        key={status}
                        disabled={task.busy}
                        onClick={() =>
                          void task.run(() => command('affiliation_review', { id: a.id, status }))
                        }
                      >
                        {t(
                          status === 'approved'
                            ? 'community.approve'
                            : status === 'rejected'
                              ? 'community.reject'
                              : 'community.revoke',
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
        </section>
        {mine.data?.admin && <AdminQueue />}
      </RequireUser>
    </Page>
  );
}
