import { useTranslation } from 'react-i18next';
import type { MarketSchedule } from '../../types';
import { addDays, isoDay, localNow, occurrencesOn, weekdayOf } from '../../lib/schedule/occurs';
import { hours, dayName, shortClock } from '../../lib/format';

/** Four weeks starting this Sunday. Market days are marked with text, not just color. */
export function Calendar({
  schedules,
  closures,
  closureNotes,
  now,
  tz,
}: {
  schedules: MarketSchedule[];
  closures: string[];
  closureNotes: Record<string, string>;
  now: Date;
  tz?: string;
}) {
  const { t, i18n } = useTranslation();
  const today = localNow(now, tz);
  const start = addDays(today, -weekdayOf(today));
  const days = Array.from({ length: 28 }, (_, i) => addDays(start, i));
  const headers = days.slice(0, 7).map((d) => dayName(d, i18n.language).slice(0, 3));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-soft" aria-hidden>
        {headers.map((h) => (
          <div key={h} className="capitalize">
            {h}
          </div>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = isoDay(d);
          const occ = occurrencesOn(schedules, d, closures);
          const closed = closures.includes(iso) && occurrencesOn(schedules, d).length > 0;
          const past = iso < isoDay(today);
          const isToday = iso === isoDay(today);
          const label = `${dayName(d, i18n.language)} ${d.m}/${d.d}: ${occ.length ? occ.map((o) => hours(o, i18n.language)).join(', ') : closed ? t('market.closedNote', { note: closureNotes[iso] ?? '' }) : '—'}`;
          return (
            <li
              key={iso}
              aria-label={label}
              className={`min-h-14 rounded-md border p-1 text-xs ${occ.length ? 'border-kale bg-kale text-white' : closed ? 'border-beet bg-beet-light text-beet' : 'border-line bg-white'} ${past ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-squash' : ''}`}
            >
              <span className="block font-bold">{d.d}</span>
              {occ.map((o, i) => (
                <span key={i} className="block leading-tight">
                  {shortClock(o.openTime, i18n.language)}–{shortClock(o.closeTime, i18n.language)}
                </span>
              ))}
              {closed && <span className="block leading-tight">✕</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
