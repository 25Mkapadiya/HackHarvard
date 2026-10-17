// Name and address normalization shared by the pipeline steps.

const SMALL = new Set(['and', 'of', 'the', 'at', 'in', 'on', 'for', 'a', 'de', 'la']);
const KEEP_UPPER = new Set(['YMCA', 'UMASS', 'MIT', 'BU', 'JP', 'CSA', 'II', 'III', 'MA', 'YMCA']);

export function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w, i) => {
      if (KEEP_UPPER.has(w.toUpperCase().replace(/[^A-Z]/g, ''))) return w.toUpperCase();
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      // Keep internal capitals like "McDonald" or "DeMoulas".
      if (/[a-z][A-Z]/.test(w)) return w[0].toUpperCase() + w.slice(1);
      return lower.replace(/(^|[-/(])([a-z])/g, (_, p, c) => p + c.toUpperCase());
    })
    .join(' ');
}

const GENERIC_SUFFIX = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|downtown|indoor|summer)$/i;
const DROP_SUFFIX = /^(spring|winter)$/i;

/**
 * Display name. MDAR names look like "Cambridge/Central Square" or "South Boston"; we show
 * "Central Square Farmers Market" or "South Boston Farmers Market", and say "Winter" once.
 */
export function displayName(raw: string, winter = false): string {
  let n = raw.trim();
  const slash = n.indexOf('/');
  if (slash > 0) {
    const prefix = n
      .slice(0, slash)
      .replace(/\bwinter\b/i, '')
      .trim();
    const rest = n.slice(slash + 1).trim();
    if (DROP_SUFFIX.test(rest)) n = prefix;
    else if (GENERIC_SUFFIX.test(rest)) n = `${prefix} ${rest}`;
    else n = rest;
  }
  n = n
    .replace(/farmer'?s'?\s+market/gi, 'Farmers Market')
    .replace(/\bwinter\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  n = titleCase(n);
  if (!/market|farmstead|\bfarm\b|\bcsa\b/i.test(n)) return `${n} ${winter ? 'Winter ' : ''}Farmers Market`;
  if (!winter) return n;
  if (/Farmers Market/.test(n)) return n.replace('Farmers Market', 'Winter Farmers Market');
  if (/\bMarket\b/.test(n)) return n.replace(/\bMarket\b/, 'Winter Market');
  return `${n} Winter Market`;
}

/** Name used only for matching: lower-case, no "farmers market" noise, no punctuation. */
export function matchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(
      /\b(the|winter|summer|indoor|outdoor|farmers?'?s?|markets?|mkt|fm|inc|llc|nafmnp|association|assoc)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STREET_ABBR: [RegExp, string][] = [
  [/\bstreet\b/gi, 'St'],
  [/\bavenue\b/gi, 'Ave'],
  [/\broad\b/gi, 'Rd'],
  [/\bboulevard\b/gi, 'Blvd'],
  [/\bdrive\b/gi, 'Dr'],
  [/\blane\b/gi, 'Ln'],
  [/\bplace\b/gi, 'Pl'],
  [/\bsquare\b/gi, 'Sq'],
  [/\bparkway\b/gi, 'Pkwy'],
  [/\bhighway\b/gi, 'Hwy'],
  [/\bcourt\b/gi, 'Ct'],
  [/\bterrace\b/gi, 'Ter'],
  [/\bnorth\b/gi, 'N'],
  [/\bsouth\b(?= \w+ (st|ave|rd)\b)/gi, 'S'],
  [/\beast\b(?= \w+ (st|ave|rd)\b)/gi, 'E'],
  [/\bwest\b(?= \w+ (st|ave|rd)\b)/gi, 'W'],
];

export function normalizeStreet(s?: string): string | undefined {
  if (!s) return undefined;
  let out = titleCase(s.replace(/\.(?=\s|$)/g, ''));
  for (const [re, abbr] of STREET_ABBR) out = out.replace(re, abbr);
  return out;
}

export function normalizeZip(z?: string): string | undefined {
  if (!z) return undefined;
  const digits = z.replace(/\D/g, '').slice(0, 5);
  if (!digits) return undefined;
  return digits.padStart(5, '0');
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type LocationType = 'park' | 'parking_lot' | 'church' | 'school' | 'farm' | 'indoor_hall' | 'other';

export function inferLocationType(...texts: (string | undefined)[]): {
  locationType?: LocationType;
  indoor?: boolean;
} {
  const t = texts.filter(Boolean).join(' ').toLowerCase();
  if (!t) return {};
  if (/parking|\blot\b|garage/.test(t)) return { locationType: 'parking_lot', indoor: false };
  // USDA directory categories.
  if (/building grounds|closed-off public street/.test(t)) return { locationType: 'other', indoor: false };
  if (/educational institution/.test(t)) return { locationType: 'school' };
  if (/healthcare institution|wholesale market/.test(t)) return { locationType: 'other' };
  if (/\bchurch|parish|temple|synagogue|congregation/.test(t)) return { locationType: 'church' };
  if (/school|college|university|academy/.test(t)) return { locationType: 'school' };
  if (/\bhall\b|community center|senior center|library|armory|gym|mill|building|indoor|ymca|grange/.test(t))
    return { locationType: 'indoor_hall', indoor: true };
  if (/\bfarm\b|orchard/.test(t)) return { locationType: 'farm' };
  if (/\bpark\b|common|green|plaza|square|field/.test(t)) return { locationType: 'park', indoor: false };
  return { locationType: 'other' };
}
