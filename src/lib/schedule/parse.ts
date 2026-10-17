import type { MarketSchedule } from '../../types';

// Parses free-text market schedules ("First and Third Wednesday, 11:00 am - 3:00 pm" +
// "June 14 to October 25 (no market 7/4)") into RRULE-based schedules. When any part is
// ambiguous we return parsed: false and the UI shows the raw text instead of guessing.

const WEEKDAYS: Record<string, string> = {
  monday: 'MO',
  tuesday: 'TU',
  wednesday: 'WE',
  thursday: 'TH',
  friday: 'FR',
  saturday: 'SA',
  sunday: 'SU',
};
const WEEKDAY_ORDER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const ORDINALS: Record<string, number> = {
  first: 1,
  '1st': 1,
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
  last: -1,
};
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const WEEKDAY_RE = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?';
const WEEKDAY_NC = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?';
const MONTH_RE = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|');

export type ParseResult = { schedules: MarketSchedule[]; parsed: boolean; raw: string };

const pad = (n: number) => String(n).padStart(2, '0');
const md = (m: number, d: number) => `${pad(m)}-${pad(d)}`;

function clean(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/\bnoon\b/gi, '12:00 pm')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "9:00 am" → minutes since midnight. Meridiem may be missing; caller resolves it. */
function parseClock(s: string): { h: number; m: number; mer?: 'am' | 'pm' } | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h < 1 || h > 12 || min > 59) return null;
  const mer = m[3] ? (m[3].toLowerCase().startsWith('a') ? 'am' : 'pm') : undefined;
  return { h, m: min, mer };
}

function to24(c: { h: number; m: number }, mer: 'am' | 'pm'): number {
  const h = (c.h % 12) + (mer === 'pm' ? 12 : 0);
  return h * 60 + c.m;
}

const fmt = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

export function parseTimeRange(s: string): { openTime: string; closeTime: string } | null {
  const m = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i.exec(s);
  if (!m) return null;
  const open = parseClock(m[1]);
  const close = parseClock(m[2]);
  if (!open || !close || !close.mer) return null;
  const closeMin = to24(close, close.mer);
  let openMin = to24(open, open.mer ?? close.mer);
  // "12:00 - 5:00 pm" → noon; "10:00 - 2:00 pm" → 10 am.
  if (!open.mer && openMin > closeMin) openMin = to24(open, 'am');
  if (openMin >= closeMin) return null;
  return { openTime: fmt(openMin), closeTime: fmt(closeMin) };
}

/** Parses the weekday part ("Monday to Saturday", "2nd and 4th Fridays", "Every other Sunday"). */
export function parseDays(s: string): string | null {
  const t = s
    .toLowerCase()
    .replace(/\bof (the|each) month\b/g, '')
    .replace(/\bfrom\b/g, '')
    .trim();
  const days = [...t.matchAll(new RegExp(WEEKDAY_RE, 'g'))].map((m) => WEEKDAYS[m[1]]);
  if (days.length === 0) return null;
  // Anything left over besides weekdays, ordinals, and connectors means we don't understand it.
  const leftover = t
    .replace(new RegExp(WEEKDAY_RE, 'g'), '')
    .replace(/\b(first|second|third|fourth|last|1st|2nd|3rd|4th|every|other|and|to|through|,|&)\b|[,&]/g, '')
    .trim();
  if (leftover) return null;

  if (/every other/.test(t)) {
    return days.length === 1 ? `FREQ=WEEKLY;INTERVAL=2;BYDAY=${days[0]}` : null;
  }
  const ords = [...t.matchAll(/\b(first|second|third|fourth|last|1st|2nd|3rd|4th)\b/g)].map(
    (m) => ORDINALS[m[1]],
  );
  if (ords.length) {
    if (days.length !== 1) return null;
    return `FREQ=MONTHLY;BYDAY=${ords.map((o) => `${o}${days[0]}`).join(',')}`;
  }
  if (/\b(to|through)\b/.test(t)) {
    if (days.length !== 2) return null;
    const a = WEEKDAY_ORDER.indexOf(days[0]);
    const b = WEEKDAY_ORDER.indexOf(days[1]);
    const range: string[] = [];
    for (let i = a; ; i = (i + 1) % 7) {
      range.push(WEEKDAY_ORDER[i]);
      if (i === b) break;
    }
    return `FREQ=WEEKLY;BYDAY=${range.join(',')}`;
  }
  return `FREQ=WEEKLY;BYDAY=${[...new Set(days)].join(',')}`;
}

type DayTime = { rrule: string; openTime: string; closeTime: string };

/** Splits "Thursday, 4:00 pm - 7:00 pm and Saturday, 10:00 am - 1:00pm" into parts. */
export function parseDayTime(raw: string): DayTime[] | null {
  const s = clean(raw).replace(/\([^)]*\)/g, '');
  const segments = s
    .split(new RegExp(`;|\\n|(?<=[ap]m)\\s*,?\\s*and\\s+(?=${WEEKDAY_NC}\\s*,)`, 'i'))
    .map((x) => x.trim())
    .filter(Boolean);
  const out: DayTime[] = [];
  for (const seg of segments) {
    const tm = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i.exec(seg);
    if (!tm) continue; // e.g. "Pre-order Fridays through Wednesdays by 1pm"
    const dayPart = seg.slice(0, tm.index).replace(/,\s*$/, '').trim();
    const rrule = parseDays(dayPart);
    const times = parseTimeRange(tm[1]);
    if (!times) return null;
    if (!rrule) {
      // Secondary segments like "Night Events, 5-8 pm" are skipped; an unknown first segment fails.
      if (out.length === 0) return null;
      continue;
    }
    out.push({ rrule, ...times });
  }
  return out.length ? dedupeDayTimes(out) : null;
}

function dedupeDayTimes(list: DayTime[]): DayTime[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = `${d.rrule}|${d.openTime}|${d.closeTime}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseMonthDay(s: string, edge: 'start' | 'end'): string | null {
  const t = s.trim().toLowerCase().replace(/\.$/, '');
  let m = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (m) return validMd(Number(m[1]), Number(m[2]));
  m = new RegExp(`^(early|mid|late)?\\s*(${MONTH_RE})\\.?\\s*(\\d{1,2})?$`).exec(t);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (m[3]) return m[1] ? null : validMd(month, Number(m[3]));
  if (m[1] === 'early') return md(month, edge === 'start' ? 1 : 10);
  if (m[1] === 'mid') return md(month, 15);
  if (m[1] === 'late') return md(month, edge === 'start' ? 20 : DAYS_IN_MONTH[month - 1]);
  return md(month, edge === 'start' ? 1 : DAYS_IN_MONTH[month - 1]);
}

function validMd(m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > DAYS_IN_MONTH[m - 1]) return null;
  return md(m, d);
}

function parseDateList(s: string): string[] | null {
  const parts = s
    .split(/,|\band\b|&|\s+(?=\d{1,2}\/)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const d = parseMonthDay(p, 'start');
    if (!d) return null;
    out.push(d);
  }
  return out.length ? out : null;
}

type Season = {
  ranges: { start?: string; end?: string }[];
  dates?: string[];
  extraDates: string[];
  exceptions: { date: string; note: string }[];
  rruleOverride?: string;
  note?: string;
};

/** Parses the season part: "June 14 to October 25", "Year-Round", "11/12, 12/10, 1/14", … */
export function parseSeason(raw: string): Season | null {
  let s = clean(raw);
  const exceptions: { date: string; note: string }[] = [];
  let note: string | undefined;

  // Pull out "no market 7/4", "(no makret 12/24 & 12/31)", "; No market 11/26, 12/24, 12/31".
  s = s.replace(/[(;,.]?\s*no (?:market|makret|mkt)\s+([\d/,&\sand]+)\)?/gi, (_, list: string) => {
    for (const d of parseDateList(list) ?? []) exceptions.push({ date: d, note: 'No market' });
    return '';
  });
  // Any other parenthetical is kept as a note for people, not interpreted.
  s = s.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    note = inner.trim();
    return '';
  });
  s = s.replace(/[\s,.;]+$/, '').trim();

  if (/^year-?\s?round$/i.test(s)) return { ranges: [{}], extraDates: [], exceptions, note };
  if (/^(tba|tbd)$/i.test(s)) return null;

  // Leading weekday modifier: "Every other Saturday, January 28 to April 8".
  let rruleOverride: string | undefined;
  const lead = new RegExp(`^([^,]*${WEEKDAY_RE}[^,]*),\\s*(.+)$`, 'i').exec(s);
  if (lead) {
    const r = parseDays(lead[1]);
    if (!r) return null;
    rruleOverride = r;
    s = lead[3];
  }

  // Explicit date lists: "11/12, 12/10, 1/14".
  if (/^[\d/,\s&and]+$/.test(s)) {
    const dates = parseDateList(s);
    return dates ? { ranges: [], dates, extraDates: [], exceptions, rruleOverride, note } : null;
  }
  // "October 23, November 12, December 11"
  if (!/\bto\b/i.test(s) && s.includes(',')) {
    const dates = parseDateList(s);
    if (dates) return { ranges: [], dates, extraDates: [], exceptions, rruleOverride, note };
  }

  const ranges: { start?: string; end?: string }[] = [];
  const extraDates: string[] = [];
  for (const chunk of s
    .split(/\band\b/i)
    .map((c) => c.trim())
    .filter(Boolean)) {
    const r = new RegExp(
      `^((?:early|mid|late)?\\s*(?:${MONTH_RE})\\.?\\s*(?:\\d{1,2})?)\\s+(?:to\\s+)?((?:early|mid|late)?\\s*(?:${MONTH_RE})\\.?\\s*(?:\\d{1,3})?)$`,
      'i',
    ).exec(chunk);
    if (r) {
      const start = parseMonthDay(r[1], 'start');
      const end = parseMonthDay(r[2], 'end');
      if (!start || !end) return null;
      ranges.push({ start, end });
      continue;
    }
    const single = parseMonthDay(chunk, 'start');
    if (single && ranges.length) {
      extraDates.push(single); // "June 18 to October 15 and 11/19"
      continue;
    }
    return null;
  }
  return ranges.length ? { ranges, extraDates, exceptions, rruleOverride, note } : null;
}

/** Combines a single weekly rule with a leading season modifier ("Every other", "First Saturday"). */
function applyOverride(rrule: string, override?: string): string | null {
  if (!override) return rrule;
  const day = /BYDAY=([A-Z]{2})$/.exec(rrule)?.[1];
  const oDay = /([A-Z]{2})(?:,|$)/.exec(override.split('BYDAY=')[1] ?? '')?.[1];
  if (!day || day !== oDay) return null;
  return override;
}

export function parseSchedule(
  dayTimeRaw: string | null | undefined,
  seasonRaw: string | null | undefined,
): ParseResult {
  const raw = [dayTimeRaw, seasonRaw]
    .filter(Boolean)
    .join(' · ')
    .replace(/\s*\n\s*/g, ' ');
  const fail: ParseResult = { schedules: [], parsed: false, raw };
  if (!dayTimeRaw || !seasonRaw) return fail;
  const dayTimes = parseDayTime(dayTimeRaw);
  const season = parseSeason(seasonRaw);
  if (!dayTimes || !season) return fail;
  if (season.rruleOverride && dayTimes.length !== 1) return fail;

  const schedules: MarketSchedule[] = [];
  for (const dt of dayTimes) {
    const rrule = applyOverride(dt.rrule, season.rruleOverride);
    if (!rrule) return fail;
    const base = {
      rrule,
      openTime: dt.openTime,
      closeTime: dt.closeTime,
      ...(season.exceptions.length ? { exceptions: season.exceptions } : {}),
      ...(season.note ? { note: season.note } : {}),
    };
    if (season.dates) {
      schedules.push({ ...base, dates: season.dates });
      continue;
    }
    for (const r of season.ranges) {
      schedules.push({ ...base, ...(r.start ? { seasonStart: r.start, seasonEnd: r.end } : {}) });
    }
    if (season.extraDates.length) schedules.push({ ...base, dates: season.extraDates });
  }
  return { schedules, parsed: true, raw };
}

// USDA National Farmers Market Directory format: up to four seasons, each with a date range
// ("05/23/2014 to 08/29/2014" or "May to October") and per-day hours
// ("Sat: 9:00 AM-1:00 PM;Sun: 10:00 AM-2:00 PM;"). Any unreadable part fails the whole market.

const USDA_DAY: Record<string, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
  sat: 'SA',
  sun: 'SU',
};

function parseUsdaDates(raw: string): { start?: string; end?: string } | null {
  const s = clean(raw);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+to\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  let start: string | null;
  let end: string | null;
  if (m) {
    start = validMd(Number(m[1]), Number(m[2]));
    end = validMd(Number(m[4]), Number(m[5]));
    const span = (Date.UTC(+m[6], +m[4] - 1, +m[5]) - Date.UTC(+m[3], +m[1] - 1, +m[2])) / 86_400_000;
    if (!start || !end || span < 0 || span > 400) return null;
    if (span >= 364) return {};
  } else {
    // "May 20, 2012 to October 28, 2012" → "May 20 to October 28"
    const season = parseSeason(s.replace(/,?\s*\d{4}\b/g, '').replace(/\b([A-Za-z]{3,4})\./g, '$1'));
    if (!season || season.ranges.length !== 1 || season.dates || season.rruleOverride) return null;
    ({ start = null, end = null } = season.ranges[0] as { start?: string; end?: string });
    if (!start || !end) return {};
  }
  if (start === '01-01' && end === '12-31') return {};
  return { start, end };
}

export function parseUsdaSchedule(seasons: { date?: string | null; time?: string | null }[]): ParseResult {
  const used = seasons.filter((s) => s.time?.trim() || s.date?.trim());
  const raw = used
    .map((s) =>
      [s.date?.trim(), s.time?.trim().replace(/;$/, '').replace(/;/g, ', ')].filter(Boolean).join(' · '),
    )
    .join(' | ');
  const fail: ParseResult = { schedules: [], parsed: false, raw };
  if (!used.length) return fail;
  const schedules: MarketSchedule[] = [];
  for (const season of used) {
    // A season with dates but no hours adds nothing we can show; one with hours but no dates
    // could be anything, so it fails the market.
    if (!season.time?.trim()) continue;
    if (!season.date?.trim()) return fail;
    const range = parseUsdaDates(season.date);
    if (!range) return fail;
    // Group days that share the same hours into one rule: "Sat, Sun 9-1" → BYDAY=SA,SU.
    const byHours = new Map<string, string[]>();
    for (const seg of season.time
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)) {
      const d = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*:\s*(.+)$/i.exec(seg);
      const times = d ? parseTimeRange(d[2]) : null;
      if (!d || !times) return fail;
      const key = `${times.openTime}-${times.closeTime}`;
      byHours.set(key, [...(byHours.get(key) ?? []), USDA_DAY[d[1].toLowerCase()]]);
    }
    for (const [key, days] of byHours) {
      const [openTime, closeTime] = key.split('-');
      const ordered = WEEKDAY_ORDER.filter((w) => days.includes(w));
      schedules.push({
        rrule: `FREQ=WEEKLY;BYDAY=${ordered.join(',')}`,
        openTime,
        closeTime,
        ...(range.start ? { seasonStart: range.start, seasonEnd: range.end } : {}),
      });
    }
  }
  if (!schedules.length) return fail;
  return { schedules, parsed: true, raw };
}
