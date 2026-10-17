import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useNow } from '../app/context';
import { useMarket } from '../app/data';
import { store, type CheckInResult } from '../lib/store';
import { isoDay, localNow } from '../lib/schedule/occurs';

export default function CheckIn() {
  const { marketId = '' } = useParams();
  const [sp] = useSearchParams();
  const { t } = useTranslation();
  const { now } = useNow();
  const market = useMarket(marketId);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    store.checkIn(marketId, sp.get('t') ?? '', isoDay(localNow(now))).then(setResult);
  }, [marketId, sp, now]);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10 text-center">
      <h1 className="text-3xl font-extrabold">{t('checkin.title')}</h1>
      {market.data && <p className="text-lg font-bold">{market.data.name}</p>}
      <p
        className={`rounded-xl p-5 text-xl font-bold ${result?.ok ? 'bg-kale text-white' : result ? 'bg-squash-light' : ''}`}
        role="status"
      >
        {!result
          ? t('checkin.working')
          : result.ok
            ? t('checkin.success', { points: result.points })
            : result.reason === 'already'
              ? t('checkin.already')
              : t('checkin.badToken')}
      </p>
      <Link to="/rewards" className="btn-primary">
        {t('checkin.toRewards')}
      </Link>
    </div>
  );
}
