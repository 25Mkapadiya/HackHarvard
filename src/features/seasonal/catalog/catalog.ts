import { z } from 'zod';
import { ProductCategoryId } from '../../../types';
import raw from './seasonal-v1.json';
import { STATE_ABBR } from './states';

export const normalizeFood = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const text = z.string().trim().min(1);
const date = z.iso.date();
const months = z
  .array(z.number().int().min(1).max(12))
  .min(1)
  .refine((m) => new Set(m).size === m.length, 'Duplicate month');
const states = z
  .array(z.enum(Object.values(STATE_ABBR) as [string, ...string[]]))
  .min(1)
  .refine((s) => new Set(s).size === s.length, 'Duplicate state');
const schema = z.object({
  version: text,
  reviewed: date,
  products: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z][a-z_]*$/),
        name: text,
        nameEs: text,
        category: ProductCategoryId,
        aliases: z.array(text),
      }),
    )
    .min(1),
  sources: z
    .array(
      z.object({
        id: text,
        states,
        organization: text,
        url: z.url().refine((u) => u.startsWith('https://')),
        published: date.nullable(),
        lastReviewed: date,
        limitations: text,
      }),
    )
    .min(1),
  records: z
    .array(
      z.object({
        product: text,
        scope: z.object({ kind: z.enum(['state', 'region']), id: text, states }),
        windows: z
          .array(
            z.object({
              kind: z.enum(['harvest', 'peak', 'availability', 'storage', 'extended', 'limited']),
              months,
            }),
          )
          .min(1),
        sourceIds: z.array(text).min(1),
        locator: text,
      }),
    )
    .min(1),
});
export type SeasonalCatalog = z.infer<typeof schema>;
export type SeasonalRecord = SeasonalCatalog['records'][number];
export type WindowKind = SeasonalRecord['windows'][number]['kind'];

/** Offline import and runtime use the same fail-closed checks. Corroboration belongs in sourceIds. */
export function validateCatalog(input: unknown): SeasonalCatalog {
  const data = schema.parse(input);
  const ids = new Set<string>();
  const aliases = new Map<string, string>();
  for (const p of data.products) {
    if (ids.has(p.id)) throw new Error(`Duplicate product: ${p.id}`);
    ids.add(p.id);
    for (const alias of [p.id, p.name, p.nameEs, ...p.aliases]) {
      const key = normalizeFood(alias);
      if (aliases.has(key) && aliases.get(key) !== p.id) throw new Error(`Ambiguous alias: ${alias}`);
      aliases.set(key, p.id);
    }
  }
  const sources = new Map(data.sources.map((s) => [s.id, s]));
  if (sources.size !== data.sources.length) throw new Error('Duplicate source');
  for (const s of data.sources) {
    if (s.lastReviewed > data.reviewed || (s.published && s.published > s.lastReviewed))
      throw new Error(`Invalid source dates: ${s.id}`);
  }
  const seen: SeasonalRecord[] = [];
  for (const r of data.records) {
    if (!ids.has(r.product)) throw new Error(`Unknown product: ${r.product}`);
    if (r.scope.kind === 'state' && (r.scope.states.length !== 1 || r.scope.states[0] !== r.scope.id))
      throw new Error('Invalid state scope');
    if (r.scope.kind === 'region' && r.scope.states.length < 2)
      throw new Error('A broader region must name applicable states');
    if (new Set(r.sourceIds).size !== r.sourceIds.length) throw new Error('Duplicate source reference');
    for (const id of r.sourceIds) {
      const source = sources.get(id);
      if (!source || r.scope.states.some((s) => !source.states.includes(s)))
        throw new Error(`Missing source or unsupported geography: ${id}`);
    }
    const kinds = r.windows.map((w) => w.kind);
    if (new Set(kinds).size !== kinds.length) throw new Error('Conflicting duplicate window kind');
    // Never silently select between overlapping calendars of equal geographic precedence.
    if (
      seen.some(
        (s) =>
          s.product === r.product &&
          s.scope.kind === r.scope.kind &&
          s.scope.states.some((state) => r.scope.states.includes(state)),
      )
    )
      throw new Error(`Conflicting or duplicate calendar: ${r.product} / ${r.scope.id}`);
    seen.push(r);
  }
  return data;
}
export const seasonalCatalog = validateCatalog(raw);
export function productMatches(
  product: { id: string; name: string; nameEs: string; category: string },
  query: string,
) {
  const q = normalizeFood(query);
  const canonical = seasonalCatalog.products.find((p) => p.id === product.id);
  return (
    !q ||
    [product.id, product.name, product.nameEs, product.category, ...(canonical?.aliases ?? [])].some((v) =>
      normalizeFood(v).includes(q),
    )
  );
}
