import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/authContext';
import { PasswordForm } from '../auth/PasswordForm';
import { command, client, workspace, result, identityFields, type Identity, type Profile } from './api';
import { useRemote, useTask } from './hooks';
import { Page, RequireUser, Feedback, RemoteState } from './Common';

function ProfileForm({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState(profile.display_name);
  const [language, setLanguage] = useState(profile.preferred_language);
  const task = useTask();
  function save(event: FormEvent) {
    event.preventDefault();
    void task.run(async () => {
      await command('profile_save', { display_name: name.trim(), preferred_language: language });
      await i18n.changeLanguage(language);
    });
  }
  return (
    <form className="card space-y-4 p-5" onSubmit={save}>
      <label className="label">
        {t('auth.displayName')}
        <input
          className="field"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="label">
        {t('account.language')}
        <select
          className="field"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <button className="btn-primary" disabled={task.busy}>
        {t('community.save')}
      </button>
      <Feedback task={task} />
    </form>
  );
}
export default function Account() {
  const auth = useAuth();
  const { t } = useTranslation();
  const task = useTask();
  const remote = useRemote(useCallback(() => workspace(auth.user?.id ?? null), [auth.user?.id]));
  const userId = auth.user?.id;
  const following = useRemote(
    useCallback(
      async () =>
        userId
          ? result<{ identity: Identity }[]>(
              await client()
                .from('community_follows')
                .select(`identity:community_identities(${identityFields})`)
                .eq('user_id', userId)
                .limit(100),
            )
          : [],
      [userId],
    ),
  );
  return (
    <Page title={t('account.title')}>
      <RequireUser>
        <p>
          {t('auth.email')}: {auth.user?.email}
        </p>
        <p>{t(auth.user?.email_confirmed_at ? 'account.confirmed' : 'account.unconfirmed')}</p>
        <RemoteState remote={remote} />
        {remote.data?.profile && <ProfileForm key={remote.data.profile.id} profile={remote.data.profile} />}
        <div className="flex flex-wrap gap-3">
          <Link className="btn-secondary" to="/account/identities">
            {t('community.manage')}
          </Link>
          {remote.data?.identities
            .filter((i) => i.kind === 'customer')
            .map((i) => (
              <Link className="btn-secondary" key={i.id} to={`/community/profile/${i.id}`}>
                {t('community.myProfile')}
              </Link>
            ))}
          <Link className="btn-secondary" to="/feed?mode=saved">
            {t('community.savedPosts')}
          </Link>
        </div>
        <PasswordForm />
        <section className="card space-y-3 p-5">
          <h2 className="section-title">{t('community.following')}</h2>
          <RemoteState remote={following} />
          {following.data?.map(({ identity }) => (
            <div key={identity.id} className="flex flex-wrap items-center gap-3">
              <Link to={`/community/profile/${identity.id}`}>{identity.display_name}</Link>
              <button
                className="btn-quiet"
                disabled={task.busy}
                onClick={() =>
                  void task.run(() => command('follow', { id: identity.id, enabled: false }), '')
                }
              >
                {t('community.unfollow')}
              </button>
            </div>
          ))}
          {following.data?.length === 0 && <p>{t('community.noFollowing')}</p>}
        </section>
        <button
          className="btn-secondary"
          disabled={task.busy}
          onClick={() =>
            void task.run(async () => {
              const r = await client().auth.signOut({ scope: 'local' });
              if (r.error) throw r.error;
            }, 'auth.loggedOut')
          }
        >
          {t('auth.logout')}
        </button>
        <Feedback task={task} />
      </RequireUser>
    </Page>
  );
}
