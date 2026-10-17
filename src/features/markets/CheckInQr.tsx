import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { dayToken } from '../../lib/store/token';

export function CheckInQr({ marketId, today }: { marketId: string; today: string }) {
  const { t } = useTranslation();
  const token = dayToken(marketId, today);
  const path = `/checkin/${marketId}?t=${token}`;
  const url = `${window.location.origin}${window.location.pathname}#${path}`;
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import('qrcode')
      .then((q) => q.toDataURL(url, { margin: 1, width: 220, color: { dark: '#1D2422', light: '#FFFFFF' } }))
      .then((d) => live && setSrc(d));
    return () => {
      live = false;
    };
  }, [url]);
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      {src && (
        <img
          src={src}
          width={160}
          height={160}
          alt={t('market.checkinTitle')}
          className="rounded border border-line"
        />
      )}
      <div className="space-y-2">
        <p>{t('market.checkinBody')}</p>
        <Link to={path} className="btn-secondary">
          {t('market.checkinButton')}
        </Link>
      </div>
    </div>
  );
}
