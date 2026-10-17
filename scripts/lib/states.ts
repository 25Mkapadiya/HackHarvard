// US states for the mainland map: the 48 contiguous states plus DC.

export const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'District of Columbia': 'DC',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'Puerto Rico': 'PR',
  'Virgin Islands': 'VI',
  Guam: 'GU',
};

// Misspellings seen in the USDA directory export.
const TYPOS: Record<string, string> = { Calafornia: 'California', Virigina: 'Virginia' };

const NOT_MAINLAND = new Set(['AK', 'HI', 'PR', 'VI', 'GU', 'AS', 'MP']);

/** "Massachusetts", "massachusetts" or "MA" → "MA"; unknown → undefined. */
export function stateCode(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  const name = TYPOS[t] ?? t;
  const hit = Object.entries(STATE_ABBR).find(([n]) => n.toLowerCase() === name.toLowerCase());
  return hit?.[1];
}

export const isMainland = (code: string | undefined) =>
  !!code && !NOT_MAINLAND.has(code) && Object.values(STATE_ABBR).includes(code);

/** Rough bounding box of the contiguous US, used as a sanity check on coordinates. */
export const inMainlandBox = (lat: number, lng: number) =>
  lat > 24.3 && lat < 49.5 && lng > -125 && lng < -66.8;
