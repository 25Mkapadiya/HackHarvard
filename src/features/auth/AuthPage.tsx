import { useRef, useState, type FormEvent, type HTMLInputAutoCompleteAttribute } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from './authContext';
import { authErrorKey } from './authErrors';
import { callbackUrl } from './callback';

type Field = 'displayName' | 'email' | 'password' | 'confirmPassword';
type Values = Record<Field, string>;

function AuthField({
  name,
  value,
  onChange,
  error,
  signup,
}: {
  name: Field;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  signup: boolean;
}) {
  const { t } = useTranslation();
  const password = name === 'password' || name === 'confirmPassword';
  const autoComplete: HTMLInputAutoCompleteAttribute = password
    ? signup
      ? 'new-password'
      : 'current-password'
    : name === 'email'
      ? 'email'
      : 'nickname';
  return (
    <div>
      <label htmlFor={`auth-${name}`} className="label">
        {t(`auth.${name}`)}
      </label>
      <input
        id={`auth-${name}`}
        name={name}
        className="field"
        type={password ? 'password' : name === 'email' ? 'email' : 'text'}
        autoComplete={autoComplete}
        autoCapitalize={name === 'email' ? 'none' : undefined}
        spellCheck={name === 'email' || password ? false : undefined}
        required
        maxLength={name === 'displayName' ? 80 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={
          error
            ? `auth-${name}-error`
            : signup && name === 'password'
              ? 'password-hint'
              : signup && name === 'displayName'
                ? 'public-name-hint'
                : undefined
        }
      />
      {signup && name === 'displayName' && (
        <p id="public-name-hint" className="mt-1 text-sm text-ink-soft">
          {t('community.namePublicHint')}
        </p>
      )}
      {signup && name === 'password' && (
        <p id="password-hint" className="mt-1 text-sm text-ink-soft">
          {t('auth.passwordHint')}
        </p>
      )}
      {error && (
        <p id={`auth-${name}-error`} className="mt-1 text-sm font-bold text-beet">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export function AuthPage({ mode }: { mode: 'signup' | 'login' }) {
  const signup = mode === 'signup';
  const auth = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const unavailable = auth.status === 'unavailable';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || unavailable || auth.loading) return;
    const form = event.currentTarget;
    const invalid: Partial<Record<Field, string>> = {};
    if (signup && !values.displayName.trim()) invalid.displayName = 'auth.nameRequired';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) invalid.email = 'auth.emailInvalid';
    if (!values.password) invalid.password = 'auth.passwordRequired';
    else if (signup && values.password.length < 8) invalid.password = 'auth.passwordShort';
    if (signup && values.confirmPassword !== values.password)
      invalid.confirmPassword = 'auth.passwordMismatch';
    setErrors(invalid);
    setFailure(null);
    setMessage(null);
    const first = Object.keys(invalid)[0];
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      return;
    }

    const clientState = getSupabaseClient();
    if (clientState.status !== 'ready') {
      setFailure('auth.unavailable');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const credentials = { email: values.email.trim(), password: values.password };
      const { data, error } = signup
        ? await clientState.client.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: callbackUrl('signup'),
              data: {
                display_name: values.displayName.trim(),
                preferred_language: i18n.language.startsWith('es') ? 'es' : 'en',
              },
            },
          })
        : await clientState.client.auth.signInWithPassword(credentials);
      if (error) throw error;
      setValues((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      if (signup) {
        setMessage(data.session ? 'auth.signupSignedIn' : 'auth.checkEmail');
      } else if (data.session) {
        navigate('/', { replace: true });
      } else {
        setFailure('auth.loginError');
      }
    } catch (error) {
      setFailure(authErrorKey(error, signup ? 'auth.signupError' : 'auth.loginError'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (submitting.current) return;
    const clientState = getSupabaseClient();
    if (clientState.status !== 'ready') return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const { error } = await clientState.client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setMessage('auth.loggedOut');
    } catch (error) {
      setFailure(authErrorKey(error, 'auth.logoutError'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <h1 className="text-3xl font-extrabold">{t(signup ? 'auth.signupTitle' : 'auth.loginTitle')}</h1>
      <p className="text-ink-soft">{t('auth.intro')}</p>
      <section className="card space-y-4 p-5 sm:p-6" aria-label={t('auth.formLabel')}>
        {auth.loading && <p role="status">{t('auth.restoring')}</p>}
        {unavailable && (
          <p role="alert" className="font-bold text-beet">
            {t('auth.unavailable')}
          </p>
        )}
        {auth.status === 'error' && (
          <p role="alert" className="text-beet">
            {t('auth.restoreError')}
          </p>
        )}
        {failure && (
          <p role="alert" className="font-bold text-beet">
            {t(failure)}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-lg bg-kale-light p-3 text-kale-dark">
            {t(message)}
          </p>
        )}
        {auth.user ? (
          <div className="space-y-4">
            <p>{t('auth.signedIn', { email: auth.user.email ?? t('auth.yourAccount') })}</p>
            <Link to="/" className="btn-primary">
              {t('auth.browse')}
            </Link>
            {!signup && (
              <button
                type="button"
                className="btn-secondary ml-2 disabled:opacity-60"
                onClick={logout}
                disabled={busy}
              >
                {t(busy ? 'auth.loggingOut' : 'auth.logout')}
              </button>
            )}
          </div>
        ) : !message || message === 'auth.loggedOut' ? (
          <form onSubmit={submit} noValidate aria-busy={busy}>
            <fieldset
              disabled={busy || auth.loading || unavailable}
              className="space-y-4 disabled:opacity-60"
            >
              <legend className="sr-only">{t(signup ? 'auth.signupTitle' : 'auth.loginTitle')}</legend>
              {(signup
                ? (['displayName', 'email', 'password', 'confirmPassword'] as const)
                : (['email', 'password'] as const)
              ).map((name) => (
                <AuthField
                  key={name}
                  name={name}
                  value={values[name]}
                  error={errors[name]}
                  signup={signup}
                  onChange={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
                />
              ))}
              {Object.keys(errors).length > 0 && (
                <p role="alert" className="text-beet">
                  {t('auth.fixErrors')}
                </p>
              )}
              <button type="submit" className="btn-primary w-full disabled:opacity-60">
                {t(busy ? 'auth.submitting' : signup ? 'auth.signup' : 'auth.login')}
              </button>
            </fieldset>
          </form>
        ) : null}
        <p>
          <Link to={signup ? '/login' : '/signup'}>{t(signup ? 'auth.toLogin' : 'auth.toSignup')}</Link>
        </p>
        {!signup && (
          <p>
            <Link to="/forgot-password">{t('account.forgot')}</Link> ·{' '}
            <Link to="/resend-confirmation">{t('account.resend')}</Link>
          </p>
        )}
      </section>
      <Link to="/">{t('auth.backHome')}</Link>
    </div>
  );
}
