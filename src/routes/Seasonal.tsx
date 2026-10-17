import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCrops } from '../app/data';
import { useNow } from '../app/context';
import { localNow } from '../lib/schedule/occurs';
import { monthName } from '../lib/format';
import { ErrorState, Loading } from '../components/Badges';
import type { Crop } from '../types';

export default function Seasonal() {
  const { t, i18n } = useTranslation();
  const { now } = useNow();
  const [sp, setSp] = useSearchParams();
  const month = Number(sp.get('month')) || localNow(now).m;
  const crops = useCrops();
  const es = i18n.language.startsWith('es');

  if (crops.loading) return <Loading />;
  if (!crops.data) return <ErrorState retry={crops.retry} />;
  const now_ = crops.data.crops.filter((c) => c.months.includes(month));
  const groups = now_.reduce<Record<string, Crop[]>>((acc, c) => ((acc[c.category] ??= []).push(c), acc), {});

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('seasonal.title')}</h1>
      <p>{t('seasonal.lede')}</p>
      <fieldset>
        <legend className="label">{t('seasonal.month')}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <label key={m} className="toggle justify-center text-sm capitalize">
              <input
                type="radio"
                name="month"
                checked={m === month}
                onChange={() => setSp({ month: String(m) }, { replace: true })}
              />
              {monthName(m, i18n.language).slice(0, 3)}
            </label>
          ))}
        </div>
      </fieldset>
      <h2 className="section-title capitalize">{monthName(month, i18n.language)}</h2>
      {now_.length < 6 && <p className="text-ink-soft">{t('seasonal.none')}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(groups).map(([cat, list]) => (
          <section key={cat} className="card p-4">
            <h3 className="mb-2 font-bold">{t(`categories.${cat}`)}</h3>
            <ul className="flex flex-wrap gap-2">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/search?q=${encodeURIComponent(c.name)}`}
                    className="chip no-underline hover:border-kale"
                    title={c.tip}
                  >
                    {es ? c.nameEs : c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-sm text-ink-soft">
        {t('seasonal.source')}{' '}
        <a href={crops.data.sourceUrl} target="_blank" rel="noreferrer">
          MassGrown
        </a>
      </p>
    </div>
  );
}
