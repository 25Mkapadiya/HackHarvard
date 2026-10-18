import { z } from 'zod';
import raw from './scenarios-v1.json';
import { seasonalCatalog } from '../../seasonal/catalog/catalog';
const text = z.string().trim().min(1);
const state = z.string().regex(/^[A-Z]{2}$/);
const months = z
  .array(z.number().int().min(1).max(12))
  .min(1)
  .refine((m) => new Set(m).size === m.length);
export const pointSchema = z.strictObject({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});
const source = z.strictObject({
  organization: text,
  url: z.url().refine((u) => u.startsWith('https://')),
  publishedAt: z.iso.date(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const schema = z.strictObject({
  version: text,
  seasonalVersion: text,
  reviewedAt: z.iso.date(),
  applicableFrom: z.iso.date(),
  applicableTo: z.iso.date(),
  sources: z.array(source.extend({ id: text, observedFrom: z.iso.date(), observedTo: z.iso.date() })).min(1),
  pointSource: source.extend({ locator: text, dateBasis: text }),
  modeSource: z.strictObject({
    organization: text,
    url: z.url(),
    publishedAt: z.string().regex(/^\d{4}-\d{2}$/),
    publicationPrecision: z.literal('month'),
    locator: text,
  }),
  points: z.record(state, pointSchema),
  production: z
    .array(
      z.strictObject({
        id: text,
        productId: text,
        state,
        production: z.number().finite().positive(),
        unit: z.enum(['million lb', 'thousand cwt']),
        cropYear: z.number().int(),
        sourceId: text,
        locator: text,
        months,
        calendarSourceIds: z.array(text).min(1),
        calendarLocator: text,
      }),
    )
    .min(1),
  scenarios: z
    .array(
      z.strictObject({
        id: text,
        productId: text,
        destinationState: state,
        regionalProductionId: text,
        conventionalProductionId: text,
        months,
        regionalBoundary: text,
        basis: z.literal('modeled-regional'),
        distanceMethod: z.literal('state-internal-point-great-circle-to-market'),
        quality: z.literal('coarse-illustration'),
        // This release reviews conditional bulk truck only; missing modes remain missing.
        regionalMode: z.literal('truck').nullable(),
        conventionalMode: z.literal('truck').nullable(),
        modeAssumption: text,
      }),
    )
    .min(1),
});
export type RegionalCatalog = z.infer<typeof schema>;
export type RegionalScenario = RegionalCatalog['scenarios'][number];
export function validateRegionalCatalog(input: unknown): RegionalCatalog {
  const c = schema.parse(input);
  if (
    c.seasonalVersion !== seasonalCatalog.version ||
    c.applicableFrom > c.applicableTo ||
    c.reviewedAt > c.applicableTo
  )
    throw new Error('Invalid catalog version or applicability');
  for (const rows of [c.sources, c.production, c.scenarios])
    if (new Set(rows.map((r) => r.id)).size !== rows.length) throw new Error('Duplicate regional catalog ID');
  for (const s of c.sources)
    if (s.observedFrom > s.observedTo || s.observedTo > s.publishedAt || s.publishedAt > c.reviewedAt)
      throw new Error('Invalid source chronology');
  if (c.pointSource.publishedAt > c.reviewedAt || c.modeSource.publishedAt > c.reviewedAt.slice(0, 7))
    throw new Error('Future reference source');
  for (const p of c.production) {
    const s = c.sources.find((s) => s.id === p.sourceId);
    const calendar = seasonalCatalog.records.find(
      (r) => r.product === p.productId && r.scope.kind === 'state' && r.scope.id === p.state,
    );
    const calendarMonths = calendar ? new Set(calendar.windows.flatMap((w) => w.months)) : new Set<number>();
    if (
      !s ||
      !c.points[p.state] ||
      !seasonalCatalog.products.some((food) => food.id === p.productId) ||
      String(p.cropYear) !== s.observedFrom.slice(0, 4) ||
      String(p.cropYear) !== s.observedTo.slice(0, 4) ||
      !calendar ||
      p.months.some((m) => !calendarMonths.has(m)) ||
      p.calendarSourceIds.some((id) => !calendar.sourceIds.includes(id))
    )
      throw new Error('Unsupported production/calendar evidence');
  }
  for (const r of c.scenarios) {
    const local = c.production.find((p) => p.id === r.regionalProductionId);
    const conventional = c.production.find((p) => p.id === r.conventionalProductionId);
    if (
      !local ||
      !conventional ||
      local.productId !== r.productId ||
      conventional.productId !== r.productId ||
      local.state === conventional.state ||
      r.months.some((m) => !local.months.includes(m) || !conventional.months.includes(m))
    )
      throw new Error('Scenario exceeds product/origin/month evidence');
    if (local.state !== r.destinationState && !(local.state === 'NY' && r.destinationState === 'MA'))
      throw new Error('Unsupported regional geographic boundary');
  }
  return c;
}
export const regionalCatalog = validateRegionalCatalog(raw);
