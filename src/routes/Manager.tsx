import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarket, useMarkets } from '../app/data';
import { useNow, useStoreState } from '../app/context';
import { store } from '../lib/store';
import { isoDay, localNow, marketStatus } from '../lib/schedule/occurs';
import { describeRule } from '../lib/schedule/describe';
import { Loading, SampleBadge } from '../components/Badges';
import { StatusBadge } from '../components/StatusBadge';
import type { MarketSchedule } from '../types';

export default function Manager() {
  const { t, i18n } = useTranslation();
  const { now } = useNow();
  const markets = useMarkets();
  const state = useStoreState();
  const [marketId, setMarketId] = useState('copley-square-boston-ma');
  const market = useMarket(marketId);
  const [st, setSt] = useState('MA');
  const states = useMemo(() => [...new Set((markets.data ?? []).map((m) => m.state))].sort(), [markets.data]);
  // Markets with a readable schedule, in the chosen state.
  const options = useMemo(
    () =>
      (markets.data ?? [])
        .filter((m) => m.state === st && m.scheduleParsed)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [markets.data, st],
  );
  const [date, setDate] = useState(isoDay(localNow(now)));
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<MarketSchedule[] | null>(null);

  if (!market.data) return <Loading />;
  const m = market.data;
  const override = state.marketOverrides[m.id] ?? {};
  const closures = override.closures ?? [];
  const schedules = draft ?? m.schedules;
  const status = marketStatus(m.schedules, m.scheduleParsed, now, m.closures, m.tz);
  const apps = state.applications.filter((a) => a.marketId === m.id);

  const postClosure = async (e: FormEvent) => {
    e.preventDefault();
    await store.saveMarketOverride(m.id, {
      closures: [
        ...closures.filter((c) => c.date !== date),
        { date, note: note.trim() || t('manager.notePlaceholder') },
      ],
    });
    setNote('');
  };
  const edit = (i: number, patch: Partial<MarketSchedule>) =>
    setDraft(schedules.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const mdToDate = (md?: string) => (md ? `2026-${md}` : '');

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('manager.title')}</h1>
      <p>{t('manager.lede')}</p>
      <label className="block">
        <span className="label">{t('filters.state')}</span>
        <select
          className="field"
          value={st}
          onChange={(e) => {
            const next = e.target.value;
            setSt(next);
            const first = (markets.data ?? [])
              .filter((x) => x.state === next && x.scheduleParsed)
              .sort((a, b) => a.name.localeCompare(b.name))[0];
            if (first) {
              setMarketId(first.id);
              setDraft(null);
            }
          }}
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{t('manager.pick')}</span>
        <select
          className="field"
          value={marketId}
          onChange={(e) => (setMarketId(e.target.value), setDraft(null))}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} — {o.city}
            </option>
          ))}
        </select>
      </label>
      <p className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        <StatusBadge status={status} now={now} tz={m.tz} />
        <Link to={`/market/${m.id}`}>{m.name} →</Link>
      </p>

      <section className="card space-y-3 p-5" aria-labelledby="sch">
        <h2 id="sch" className="section-title">
          {t('manager.schedule')}
        </h2>
        {schedules.map((s, i) => (
          <fieldset key={i} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
            <legend className="px-1 font-bold">{s.rrule ? describeRule(s.rrule, i18n.language) : '—'}</legend>
            <label>
              <span className="label">{t('manager.opens')}</span>
              <input
                className="field"
                type="time"
                value={s.openTime ?? ''}
                onChange={(e) => edit(i, { openTime: e.target.value })}
              />
            </label>
            <label>
              <span className="label">{t('manager.closes')}</span>
              <input
                className="field"
                type="time"
                value={s.closeTime ?? ''}
                onChange={(e) => edit(i, { closeTime: e.target.value })}
              />
            </label>
            {s.seasonStart && (
              <>
                <label>
                  <span className="label">{t('manager.seasonStart')}</span>
                  <input
                    className="field"
                    type="date"
                    value={mdToDate(s.seasonStart)}
                    onChange={(e) => e.target.value && edit(i, { seasonStart: e.target.value.slice(5) })}
                  />
                </label>
                <label>
                  <span className="label">{t('manager.seasonEnd')}</span>
                  <input
                    className="field"
                    type="date"
                    value={mdToDate(s.seasonEnd)}
                    onChange={(e) => e.target.value && edit(i, { seasonEnd: e.target.value.slice(5) })}
                  />
                </label>
              </>
            )}
          </fieldset>
        ))}
        <button
          className="btn-primary"
          disabled={!draft || draft.some((s) => !s.openTime || !s.closeTime || s.openTime >= s.closeTime)}
          onClick={async () => {
            await store.saveMarketOverride(m.id, { schedules: draft! });
            setDraft(null);
          }}
        >
          {t('manager.saveSchedule')}
        </button>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="clo">
        <h2 id="clo" className="section-title">
          {t('manager.closure')}
        </h2>
        <form onSubmit={postClosure} className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <label>
            <span className="label">{t('manager.date')}</span>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">{t('manager.note')}</span>
            <input
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('manager.notePlaceholder')}
            />
          </label>
          <button className="btn-primary" type="submit">
            {t('manager.postClosure')}
          </button>
        </form>
        {closures.length > 0 && (
          <>
            <h3 className="font-bold">{t('manager.closures')}</h3>
            <ul className="divide-y divide-line">
              {closures.map((c) => (
                <li key={c.date} className="flex items-center justify-between py-2">
                  <span>
                    {c.date} — {c.note}
                  </span>
                  <button
                    className="btn-quiet"
                    onClick={() =>
                      store.saveMarketOverride(m.id, { closures: closures.filter((x) => x.date !== c.date) })
                    }
                  >
                    {t('manager.remove')}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="apps">
        <h2 id="apps" className="section-title">
          {t('manager.applications')}
        </h2>
        <SampleBadge />
        {apps.length === 0 ? (
          <p className="text-ink-soft">{t('manager.none')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <span className="font-bold">{a.vendorName}</span> · {a.products} ·{' '}
                  <em>{t(`manager.${a.status}`)}</em>
                </span>
                {a.status === 'pending' && (
                  <span className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => store.setApplicationStatus(a.id, 'approved')}
                    >
                      {t('manager.approve')}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => store.setApplicationStatus(a.id, 'declined')}
                    >
                      {t('manager.decline')}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
