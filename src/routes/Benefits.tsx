import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePrograms } from '../app/data';
import { useStoreState } from '../app/context';
import { store } from '../lib/store';
import { hipCap, hipRefund } from '../lib/benefits';
import { money } from '../lib/format';
import { ErrorState, Loading } from '../components/Badges';
import type { Program } from '../types';

const GUIDE_ORDER = ['snap', 'hip', 'wic_fmnp', 'sfmnp', 'city_coupon', 'wic_cvb', 'double_up'];

// Remounted (via key) once saved prefs load, so it starts from the remembered household size.
function HipCalculator({ hip }: { hip: Program }) {
  const { t } = useTranslation();
  const { prefs } = useStoreState();
  const [size, setSize] = useState(prefs.householdSize ?? 3);
  const [spend, setSpend] = useState(20);
  const [earned, setEarned] = useState(0);
  const [remember, setRemember] = useState(!!prefs.rememberBenefits);

  const cap = hipCap(hip, size) ?? 0;
  const refund = hipRefund(spend, cap, earned, hip.matchRate ?? 1);
  const persist = (s: number, r: boolean) =>
    store.savePrefs(r ? { rememberBenefits: true, householdSize: s } : { rememberBenefits: false });

  return (
    <section className="card space-y-4 border-squash p-5" aria-labelledby="calc">
      <h2 id="calc" className="section-title">
        {t('benefits.hipCalc')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="label">{t('benefits.household')}</span>
          <select
            className="field"
            value={size}
            onChange={(e) => {
              const s = Number(e.target.value);
              setSize(s);
              if (remember) persist(s, true);
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 10 ? '10+' : n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t('benefits.spendLabel')}</span>
          <input
            className="field"
            type="number"
            min={0}
            step={1}
            inputMode="decimal"
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
          />
        </label>
        <label>
          <span className="label">{t('benefits.earnedLabel')}</span>
          <input
            className="field"
            type="number"
            min={0}
            max={cap}
            step={1}
            inputMode="decimal"
            value={earned}
            onChange={(e) => setEarned(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="text-lg">{t('benefits.cap', { amount: money(cap) })}</p>
      <p
        className="rounded-lg bg-kale p-4 font-display text-2xl font-extrabold text-white"
        role="status"
        aria-live="polite"
      >
        {t('benefits.result', { refund: money(refund) })}
      </p>
      <p>
        {t('benefits.example', {
          spend: money(Math.min(40, cap)),
          back: money(hipRefund(Math.min(40, cap), cap)),
        })}
      </p>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5"
          checked={remember}
          onChange={(e) => {
            setRemember(e.target.checked);
            persist(size, e.target.checked);
          }}
        />
        <span>
          <span className="font-bold">{t('benefits.remember')}</span>
          <span className="block text-sm text-ink-soft">{t('benefits.rememberHelp')}</span>
        </span>
      </label>
      <p className="text-sm text-ink-soft">
        {t('benefits.lastVerified', { date: hip.lastVerified })}. {hip.verificationNote}{' '}
        <a href={hip.url} target="_blank" rel="noreferrer">
          {t('benefits.learnMore')}
        </a>
      </p>
    </section>
  );
}

export default function Benefits() {
  const { t, i18n } = useTranslation();
  const programs = usePrograms();
  const { prefs } = useStoreState();
  const es = i18n.language.startsWith('es');
  if (programs.loading) return <Loading />;
  if (!programs.data) return <ErrorState retry={programs.retry} />;
  const hip = programs.data.find((p) => p.id === 'hip');
  const guide = GUIDE_ORDER.map((id) => programs.data!.find((p) => p.id === id)).filter(
    (p): p is Program => !!p,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('benefits.title')}</h1>
      <p className="text-lg">{t('benefits.lede')}</p>
      {hip && (
        <HipCalculator key={prefs.rememberBenefits ? `saved-${prefs.householdSize}` : 'fresh'} hip={hip} />
      )}
      {guide.map((p) => {
        const txt = es && p.es ? p.es : p;
        return (
          <section key={p.id} id={p.id} className="card space-y-2 p-5" aria-labelledby={`h-${p.id}`}>
            <h2 id={`h-${p.id}`} className="font-display text-xl font-extrabold">
              {txt.name}
            </h2>
            <p>{txt.description}</p>
            <h3 className="font-bold">{t('benefits.eligibility')}</h3>
            <p>{txt.eligibility}</p>
            <h3 className="font-bold">{t('benefits.how')}</h3>
            <p>{txt.howToRedeem}</p>
            <p className="text-sm text-ink-soft">
              {t('benefits.lastVerified', { date: p.lastVerified })}
              {p.verificationNote ? ` · ${p.verificationNote}` : ''} ·{' '}
              <a href={p.url} target="_blank" rel="noreferrer">
                {t('benefits.learnMore')}
              </a>
            </p>
            {p.regions.includes('MA') || p.regions.includes('Boston') ? (
              <Link to={`/explore?prog=${p.id}`} className="btn-secondary">
                {t('benefits.findMarkets', { program: t(`programs.${p.id}`) })}
              </Link>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
