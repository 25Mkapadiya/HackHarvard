import type { Unit } from '../../src/types';

// Normalizes free-text price units ("per pound", "lbs", "1/2 pint") to canonical units so
// prices can be compared across vendors. Returns a multiplier for the canonical unit price.

const ALIASES: [RegExp, Unit, number][] = [
  [/^(1\/2|half)\s*(lb|pound)s?$/, 'lb', 2],
  [/^(lb|lbs|pound|pounds|per pound|\/lb|#)$/, 'lb', 1],
  [/^(oz|ounce|ounces)$/, 'oz', 1],
  [/^(8\s*oz|half pound)$/, 'lb', 2],
  [/^(ea|each|piece|pc|head|ear)$/, 'each', 1],
  [/^(bunch|bu|bn|bundle)$/, 'bunch', 1],
  [/^(doz|dozen|dz)$/, 'dozen', 1],
  [/^(half dozen|1\/2 dozen|6 ct)$/, 'dozen', 2],
  [/^(pint|pt|pints)$/, 'pint', 1],
  [/^(1\/2|half)\s*pint$/, 'pint', 2],
  [/^(quart|qt|quarts)$/, 'quart', 1],
  [/^(jar|pint jar|16 oz jar)$/, 'pint_jar', 1],
  [/^(loaf|loaves)$/, 'loaf', 1],
  [/^(half gallon|1\/2 gallon|64 oz)$/, 'half_gallon', 1],
];

export function normalizeUnit(raw: string): { unit: Unit; factor: number } | null {
  const t = raw
    .toLowerCase()
    .replace(/^per\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, unit, factor] of ALIASES) if (re.test(t)) return { unit, factor };
  return null;
}

/** Price per canonical unit, e.g. ($3, "1/2 lb") → { amount: 6, unit: 'lb' }. */
export function normalizePrice(amount: number, rawUnit: string): { amount: number; unit: Unit } | null {
  const u = normalizeUnit(rawUnit);
  if (!u) return null;
  return { amount: Math.round(amount * u.factor * 100) / 100, unit: u.unit };
}

/** For comparison across pint/quart, express berries etc. per pint. */
export function toComparable(amount: number, unit: Unit): { amount: number; unit: Unit } {
  if (unit === 'quart') return { amount: amount / 2, unit: 'pint' };
  if (unit === 'oz') return { amount: amount * 16, unit: 'lb' };
  return { amount, unit };
}
