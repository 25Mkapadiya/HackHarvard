import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { hasAuthCallback, takeAuthCallback } from './callback';

export default function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'ready' | 'busy' | 'success' | 'error'>(
    hasAuthCallback() ? 'ready' : 'error',
  );
  const working = useRef(false);
  async function verify() {
    if (working.current) return;
    working.current = true;
    setStatus('busy');
    const payload = takeAuthCallback();
    const state = getSupabaseClient();
    try {
      if (!payload || payload.kind === 'invalid' || state.status !== 'ready') throw new Error('invalid');
      const api = state.client.auth;
      const result =
        payload.kind === 'token'
          ? await api.verifyOtp({ token_hash: payload.token, type: payload.type })
          : payload.kind === 'implicit'
            ? await api.setSession({ access_token: payload.access, refresh_token: payload.refresh })
            : await api.exchangeCodeForSession(payload.code);
      if (result.error || !result.data.session) throw new Error('invalid');
      const verified = await api.getUser();
      if (verified.error || !verified.data.user) throw new Error('invalid');
      if (payload.type === 'recovery')
        navigate('/reset-password', { replace: true, state: { recovery: true } });
      else setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      working.current = false;
    }
  }
  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <h1 className="section-title">{t('account.verifyTitle')}</h1>
      <div className="card space-y-4 p-5">
        {status === 'ready' && (
          <>
            <p>{t('account.verifyExplain')}</p>
            <button className="btn-primary" onClick={verify}>
              {t('account.verify')}
            </button>
          </>
        )}
        {status === 'busy' && <p role="status">{t('auth.submitting')}</p>}
        {status === 'success' && (
          <>
            <p role="status">{t('account.verified')}</p>
            <Link className="btn-primary" to="/account">
              {t('account.title')}
            </Link>
          </>
        )}
        {status === 'error' && <p role="alert">{t('account.invalidLink')}</p>}
        <p>
          <Link to="/login">{t('auth.login')}</Link> ·{' '}
          <Link to="/forgot-password">{t('account.forgot')}</Link> ·{' '}
          <Link to="/resend-confirmation">{t('account.resend')}</Link>
        </p>
      </div>
    </div>
  );
}
