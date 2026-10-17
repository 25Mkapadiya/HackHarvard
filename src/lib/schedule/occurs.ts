import { RRule } from 'rrule';
import { toZonedTime } from 'date-fns-tz';
import type { MarketSchedule } from '../../types';

// All schedule math happens on "floating" calendar dates (UTC midnight of the local
// America/New_York date), so DST shifts never move a market's opening time.

export const TZ = 'America/New_York';
const DAY_MS = 86_400_000;
/** Phase anchor for every-other-week rules on year-round markets (no season start to anchor to). */
const YEAR_ROUND_ANCHOR = Date.UTC(2024, 0, 1);

export type LocalDay = { y: number; m: number; d: number };
export type LocalNow = LocalDay & { minutes: number };

export function localNow(now: Date): LocalNow {
  const z = toZonedTime(now, TZ);
  return {
    y: z.getFullYear(),
    m: z.getMonth() + 1,
    d: z.getDate(),
    minutes: z.getHours() * 60 + z.getMinutes(),
  };
}

const floating = ({ y, m, d }: LocalDay) => Date.UTC(y, m - 1, d);
const fromFloating = (t: number): LocalDay => {
  const x = new Date(t);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
};
export const addDays = (day: LocalDay, n: number) => fromFloating(floating(day) + n * DAY_MS);
const mdKey = (day: LocalDay) => `${String(day.m).padStart(2, '0')}-${String(day.d).padStart(2, '0')}`;
export const isoDay = (day: LocalDay) => `${day.y}-${mdKey(day)}`;
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const mdNum = (md: string) => Number(md.slice(0, 2)) * 100 + Number(md.slice(3, 5));

/** The season instance (start/end floating times) that contains `day`, or null if out of season. */
export function seasonWindow(s: MarketSchedule, day: LocalDay): { start: number; end: number } | null {
  if (!s.seasonStart || !s.seasonEnd) return { start: YEAR_ROUND_ANCHOR, end: Infinity };
  const start = mdNum(s.seasonStart);
  const end = mdNum(s.seasonEnd);
  const cur = day.m * 100 + day.d;
  const at = (y: number, md: number) => Date.UTC(y, Math.floor(md / 100) - 1, md % 100);
  if (start <= end)
    return cur >= start && cur <= end ? { start: at(day.y, start), end: at(day.y, end) } : null;
  // Season wraps the new year (e.g. November to April).
  if (cur >= start) return { start: at(day.y, start), end: at(day.y + 1, end) };
  if (cur <= end) return { start: at(day.y - 1, start), end: at(day.y, end) };
  return null;
}

const ruleCache = new Map<string, RRule>();

function rruleHits(rrule: string, windowStart: number, t: number): boolean {
  const key = `${rrule}|${windowStart}`;
  let rule = ruleCache.get(key);
  if (!rule) {
    rule = new RRule({ ...RRule.parseString(rrule), dtstart: new Date(windowStart) });
    ruleCache.set(key, rule);
  }
  return rule.between(new Date(t), new Date(t + DAY_MS - 1), true).length > 0;
}

/** Does this schedule meet on `day`? `closures` are extra YYYY-MM-DD closures (e.g. posted by a manager). */
export function occursOn(s: MarketSchedule, day: LocalDay, closures: string[] = []): boolean {
  if (!s.rrule || !s.openTime || !s.closeTime) return false;
  const md = mdKey(day);
  const iso = isoDay(day);
  if (closures.includes(iso)) return false;
  if (s.exceptions?.some((e) => e.date === md || e.date === iso)) return false;
  if (s.dates) return s.dates.includes(md);
  const w = seasonWindow(s, day);
  if (!w) return false;
  return rruleHits(s.rrule, w.start, floating(day));
}

export type Occurrence = { day: LocalDay; openTime: string; closeTime: string; schedule: MarketSchedule };

export function occurrencesOn(
  schedules: MarketSchedule[],
  day: LocalDay,
  closures: string[] = [],
): Occurrence[] {
  return schedules
    .filter((s) => occursOn(s, day, closures))
    .map((s) => ({ day, openTime: s.openTime!, closeTime: s.closeTime!, schedule: s }))
    .sort((a, b) => a.openTime.localeCompare(b.openTime));
}

export type Status =
  | { state: 'open'; closesAt: string; next?: Occurrence }
  | { state: 'closing_soon'; closesAt: string; next?: Occurrence }
  | { state: 'closed'; next?: Occurrence }
  | { state: 'unknown' };

export const CLOSING_SOON_MIN = 45;

export function marketStatus(
  schedules: MarketSchedule[],
  parsed: boolean,
  now: Date,
  closures: string[] = [],
  horizonDays = 120,
): Status {
  if (!parsed || schedules.length === 0) return { state: 'unknown' };
  const ln = localNow(now);
  const today = occurrencesOn(schedules, ln, closures);
  const current = today.find(
    (o) => toMinutes(o.openTime) <= ln.minutes && ln.minutes < toMinutes(o.closeTime),
  );
  if (current) {
    const left = toMinutes(current.closeTime) - ln.minutes;
    return { state: left <= CLOSING_SOON_MIN ? 'closing_soon' : 'open', closesAt: current.closeTime };
  }
  return { state: 'closed', next: nextOpening(schedules, now, closures, horizonDays) };
}

export function nextOpening(
  schedules: MarketSchedule[],
  now: Date,
  closures: string[] = [],
  horizonDays = 120,
) {
  const ln = localNow(now);
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(ln, i);
    const occ = occurrencesOn(schedules, day, closures).find(
      (o) => i > 0 || toMinutes(o.openTime) > ln.minutes,
    );
    if (occ) return occ;
  }
  return undefined;
}

/** True if the market meets at least once in [today, today + days). */
export function opensWithin(
  schedules: MarketSchedule[],
  now: Date,
  days: number,
  closures: string[] = [],
): boolean {
  const ln = localNow(now);
  for (let i = 0; i < days; i++) if (occurrencesOn(schedules, addDays(ln, i), closures).length) return true;
  return false;
}

export function upcoming(
  schedules: MarketSchedule[],
  now: Date,
  days: number,
  closures: string[] = [],
): Occurrence[] {
  const ln = localNow(now);
  const out: Occurrence[] = [];
  for (let i = 0; i < days; i++) out.push(...occurrencesOn(schedules, addDays(ln, i), closures));
  return out;
}

/** 0 = Sunday … 6 = Saturday for a floating day. */
export const weekdayOf = (day: LocalDay) => new Date(floating(day)).getUTCDay();
export const dayDiff = (a: LocalDay, b: LocalDay) => Math.round((floating(b) - floating(a)) / DAY_MS);
