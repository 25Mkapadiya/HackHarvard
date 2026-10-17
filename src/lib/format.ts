import type { LocalDay, Occurrence, Status } from './schedule/occurs';
import { addDays, dayDiff, localNow, weekdayOf } from './schedule/occurs';

const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};
const MONTH_NAMES = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
};
type Lang = 'en' | 'es';
const L = (lang: string): Lang => (lang.startsWith('es') ? 'es' : 'en');

export const dayName = (day: LocalDay, lang = 'en') => DAY_NAMES[L(lang)][weekdayOf(day)];
export const monthName = (m: number, lang = 'en') => MONTH_NAMES[L(lang)][m - 1];

/** "09:00" → "9:00 AM" (en) or "9:00" (es, 24h). */
export function clock(hhmm: string, lang = 'en'): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  if (L(lang) === 'es') return `${h}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Compact calendar label: "9a", "6:30p" (en) or "9", "18:30" (es). */
export function shortClock(hhmm: string, lang = 'en'): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  if (L(lang) === 'es') return m === '00' ? String(h) : `${h}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m === '00' ? '' : `:${m}`}${h < 12 ? 'a' : 'p'}`;
}

export const hours = (o: { openTime: string; closeTime: string }, lang = 'en') =>
  `${clock(o.openTime, lang)} – ${clock(o.closeTime, lang)}`;

/** "today", "tomorrow", "Saturday", or "Saturday, June 13" when more than a week out. */
export function relativeDay(day: LocalDay, now: Date, t: (k: string) => string, lang = 'en'): string {
  const diff = dayDiff(localNow(now), day);
  if (diff === 0) return t('time.today');
  if (diff === 1) return t('time.tomorrow');
  if (diff < 7) return dayName(day, lang);
  return `${dayName(day, lang)}, ${L(lang) === 'es' ? `${day.d} de ${monthName(day.m, lang)}` : `${monthName(day.m, lang)} ${day.d}`}`;
}

export function statusText(
  s: Status,
  now: Date,
  t: (k: string, o?: Record<string, string>) => string,
  lang = 'en',
): string {
  switch (s.state) {
    case 'open':
      return t('status.openUntil', { time: clock(s.closesAt, lang) });
    case 'closing_soon':
      return t('status.closingSoon', { time: clock(s.closesAt, lang) });
    case 'closed':
      return s.next
        ? t('status.opens', {
            day: relativeDay(s.next.day, now, t, lang),
            time: clock(s.next.openTime, lang),
          })
        : t('status.noUpcoming');
    default:
      return t('status.unknown');
  }
}

export const occurrenceLabel = (o: Occurrence, now: Date, t: (k: string) => string, lang = 'en') =>
  `${relativeDay(o.day, now, t, lang)} · ${hours(o, lang)}`;

export const nextDays = (now: Date, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(localNow(now), i));

export const money = (n: number) => `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

export const miles = (km: number) => km * 0.621371;
