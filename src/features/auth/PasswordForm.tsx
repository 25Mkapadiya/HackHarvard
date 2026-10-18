import { useState, type FormEvent } from 'react';
import { useLocation, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from './authContext';
import { authErrorKey } from './authErrors';
import { RequireUser, Page } from '../community/Common';

export function PasswordForm({ recovery = false }: { recovery?: boolean }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailure('');
    setMessage('');
    if (password.length < 8) {
      setFailure('auth.passwordShort');
      return;
    }
    if (password !== confirm) {
      setFailure('auth.passwordMismatch');
      return;
    }
    const state = getSupabaseClient();
    if (state.status !== 'ready') {
      setFailure('auth.unavailable');
      return;
    }
    setBusy(true);
    try {
      if (!recovery) {
        const r = await state.client.auth.signInWithPassword({
          email: auth.user?.email ?? '',
          password: current,
        });
        if (r.error) throw r.error;
      }
      const { error } = await state.client.auth.updateUser({ password });
      if (error) throw error;
      setCurrent('');
      setPassword('');
      setConfirm('');
      setMessage('account.passwordChanged');
    } catch (error) {
      setFailure(authErrorKey(error, 'community.error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card space-y-4 p-5" onSubmit={submit}>
      <h2 className="section-title">{t('account.changePassword')}</h2>
      <fieldset disabled={busy} className="space-y-3">
        {!recovery && (
          <label className="label">
            {t('account.currentPassword')}
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
        )}
        <label className="label">
          {t('account.newPassword')}
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="label">
          {t('auth.confirmPassword')}
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button className="btn-primary">{t(busy ? 'auth.submitting' : 'community.save')}</button>
      </fieldset>
      {failure && <p role="alert">{t(failure)}</p>}
      {message && <p role="status">{t(message)}</p>}
    </form>
  );
}
export default function ResetPassword() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <Page title={t('account.reset')}>
      <RequireUser>
        {location.state?.recovery ? (
          <PasswordForm recovery />
        ) : (
          <div role="alert">
            <p>{t('account.invalidLink')}</p>
            <Link to="/forgot-password">{t('account.forgot')}</Link>
          </div>
        )}
      </RequireUser>
    </Page>
  );
}
