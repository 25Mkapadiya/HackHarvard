import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocationState } from '../../app/context';
import { currentPosition, geocodeAddress } from '../../lib/geo';
import { Icon } from '../../components/Icon';

export function LocationPicker() {
  const { t } = useTranslation();
  const { set, label, isDefault } = useLocationState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const locate = async () => {
    setBusy(true);
    setError(null);
    try {
      set(await currentPosition(), t('home.yourLocation'));
    } catch {
      setError(t('home.locationError'));
    } finally {
      setBusy(false);
    }
  };

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const hit = await geocodeAddress(q.trim());
      if (hit) set(hit, hit.label);
      else setError(t('home.addressNotFound'));
    } catch {
      setError(t('home.addressNotFound'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <button className="btn-primary" onClick={locate} disabled={busy}>
          <Icon name="locate" />
          {busy ? t('home.locating') : t('home.useLocation')}
        </button>
        <span className="hidden self-center text-ink-soft sm:block">{t('home.or')}</span>
        <form onSubmit={search} className="flex flex-1 gap-2" role="search">
          <div className="flex-1">
            <label htmlFor="addr" className="label">
              {t('home.addressLabel')}
            </label>
            <input
              id="addr"
              className="field"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.addressPlaceholder')}
              autoComplete="street-address"
            />
          </div>
          <button className="btn-secondary self-end" type="submit" disabled={busy}>
            {t('home.search')}
          </button>
        </form>
      </div>
      <p className="font-bold" role="status">
        {error ? (
          <span className="text-beet">{error}</span>
        ) : isDefault ? (
          t('home.nearDefault')
        ) : label ? (
          t('home.near', { place: label })
        ) : null}
      </p>
    </div>
  );
}
