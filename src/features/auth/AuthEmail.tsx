import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { callbackUrl } from './callback';
import { authErrorKey } from './authErrors';

export default function AuthEmail({ resend = false }: { resend?: boolean }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 60000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || cooldown) return;
    const state = getSupabaseClient();
    if (state.status !== 'ready') {
      setFailure('auth.unavailable');
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailure('');
    setMessage('');
    try {
      const { error } = resend
        ? await state.client.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: { emailRedirectTo: callbackUrl('signup') },
          })
        : await state.client.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: callbackUrl('recovery'),
          });
      if (error) throw error;
      setMessage('account.emailSent');
      setCooldown(true);
    } catch (error) {
      setFailure(authErrorKey(error, 'auth.signupError'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <h1 className="section-title">{t(resend ? 'account.resend' : 'account.forgot')}</h1>
      <form className="card space-y-4 p-5" onSubmit={submit}>
        <label className="label" htmlFor="recovery-email">
          {t('auth.email')}
        </label>
        <input
          className="field"
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {failure && (
          <p role="alert" className="text-beet">
            {t(failure)}
          </p>
        )}
        {message && <p role="status">{t(message)}</p>}
        <button className="btn-primary disabled:opacity-60" disabled={busy || cooldown}>
          {t(busy ? 'auth.submitting' : cooldown ? 'account.waitEmail' : 'account.sendEmail')}
        </button>
      </form>
      <Link to="/login">{t('auth.login')}</Link>
    </div>
  );
}
