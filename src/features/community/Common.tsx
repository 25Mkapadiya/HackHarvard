import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/authContext';

export function RequireUser({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { t } = useTranslation();
  if (auth.loading) return <p role="status">{t('auth.restoring')}</p>;
  if (auth.status === 'unavailable') return <p role="alert">{t('auth.unavailable')}</p>;
  if (!auth.user)
    return (
      <div className="card space-y-3 p-5">
        <p>{t('community.loginRequired')}</p>
        <Link className="btn-primary" to="/login">
          {t('auth.login')}
        </Link>
      </div>
    );
  return <>{children}</>;
}
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-5 break-words px-4 py-8">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {children}
    </div>
  );
}
export function Feedback({ task }: { task: { message: string; failed: boolean } }) {
  return task.message ? (
    <p role={task.failed ? 'alert' : 'status'} className={task.failed ? 'text-beet' : 'text-kale'}>
      {task.message}
    </p>
  ) : null;
}
export function RemoteState({
  remote,
}: {
  remote: { loading: boolean; error: unknown; reload: () => void };
}) {
  const { t } = useTranslation();
  return (
    <>
      {remote.loading && <p role="status">{t('community.loading')}</p>}
      {!!remote.error && (
        <div role="alert" className="card space-y-3 p-4">
          <p>{t('community.unavailable')}</p>
          <button className="btn-secondary" onClick={remote.reload}>
            {t('community.retry')}
          </button>
        </div>
      )}
    </>
  );
}
