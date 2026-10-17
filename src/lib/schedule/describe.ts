// RRULE → "Saturdays", "Tuesdays and Fridays", "1st and 3rd Wednesday", "Every other Sunday".
const NAMES = {
  en: {
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
    SU: 'Sunday',
  },
  es: {
    MO: 'lunes',
    TU: 'martes',
    WE: 'miércoles',
    TH: 'jueves',
    FR: 'viernes',
    SA: 'sábado',
    SU: 'domingo',
  },
} as const;
type Day = keyof (typeof NAMES)['en'];
const ORD = {
  en: { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '-1': 'last' },
  es: { '1': '1.er', '2': '2.º', '3': '3.er', '4': '4.º', '-1': 'último' },
} as const;

const join = (parts: string[], and: string) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${and} ${parts.at(-1)}`;

export function describeRule(rrule: string, lang = 'en'): string {
  const L = lang.startsWith('es') ? 'es' : 'en';
  const and = L === 'es' ? 'y' : 'and';
  const parts = Object.fromEntries(rrule.split(';').map((kv) => kv.split('='))) as Record<string, string>;
  const byday = (parts.BYDAY ?? '').split(',').filter(Boolean);
  if (parts.FREQ === 'MONTHLY') {
    const day = byday[0]?.replace(/^-?\d/, '') as Day;
    const ords = byday.map((b) => ORD[L][b.replace(/[A-Z]{2}$/, '') as keyof (typeof ORD)['en']] ?? b);
    return L === 'es'
      ? `${join(ords, and)} ${NAMES.es[day]} del mes`
      : `${join(ords, and)} ${NAMES.en[day]} of the month`;
  }
  const days = byday as Day[];
  if (parts.INTERVAL === '2')
    return L === 'es' ? `${NAMES.es[days[0]]} por medio` : `Every other ${NAMES.en[days[0]]}`;
  if (days.length >= 5) {
    const range = `${NAMES[L][days[0]]}${L === 'es' ? ' a ' : '–'}${NAMES[L][days.at(-1)!]}`;
    return L === 'es' ? `De ${range}` : range;
  }
  return L === 'es'
    ? `Los ${join(
        days.map((d) => NAMES.es[d]),
        and,
      )}`
    : join(
        days.map((d) => `${NAMES.en[d]}s`),
        and,
      );
}

/** "06-14" → "June 14" / "14 de junio". */
export function describeMonthDay(md: string, lang = 'en'): string {
  const m = Number(md.slice(0, 2));
  const d = Number(md.slice(3, 5));
  const date = new Date(Date.UTC(2026, m - 1, d));
  return date.toLocaleDateString(lang.startsWith('es') ? 'es-US' : 'en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
