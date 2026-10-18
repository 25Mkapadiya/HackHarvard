import { z } from 'zod';
import { LifecycleComparison } from '../lifecycle';
const text = z.string().trim().min(1);
const date = z.iso.date();
const url = z.url().refine((u) => /^https?:\/\//.test(u));
export const DatasetSource = z
  .object({
    id: text,
    name: text,
    url,
    publicationDate: date,
    observedFrom: date.nullable(),
    observedTo: date.nullable(),
    observationPeriod: text,
    reviewedAt: date,
    geography: text,
    destinationScopes: z
      .array(z.object({ state: z.string().regex(/^[A-Z]{2}$/), cities: z.array(text).min(1) }))
      .min(1),
    products: z.array(text).min(1),
    sourceUnits: z.array(text).min(1),
    methodology: text,
    license: text,
    licenseUrl: url,
    sourceLocator: text,
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .refine(
    (s) =>
      ((s.observedFrom === null && s.observedTo === null) ||
        (s.observedFrom !== null &&
          s.observedTo !== null &&
          s.observedFrom <= s.observedTo &&
          s.observedTo <= s.reviewedAt)) &&
      s.publicationDate <= s.reviewedAt,
    'Invalid source chronology',
  );
export type DatasetSource = z.infer<typeof DatasetSource>;
const distance = z.object({ value: z.number().finite().nonnegative(), unit: z.literal('mile') });
export const Chain = z.object({
  originLabel: text,
  destinationLabel: text,
  sourceLocator: text,
  distance,
  legs: z
    .array(
      z.object({
        label: text,
        distance,
        mode: z.enum(['truck', 'rail', 'ship', 'air', 'van']).optional(),
        vehicleClass: z.enum(['medium-heavy-duty', 'small-van', 'not-applicable', 'unknown']).optional(),
        modeEvidence: text.optional(),
      }),
    )
    .optional(),
});
export type Chain = z.infer<typeof Chain>;
export const ComparisonRecord = z
  .object({
    id: text,
    sourceId: text,
    label: text,
    basis: z.enum(['actual-observed', 'modeled-scenario']),
    productId: text,
    scope: z.object({
      state: z.string().regex(/^[A-Z]{2}$/),
      cities: z.array(text).min(1),
      marketIds: z.array(text).optional(),
    }),
    applicableFrom: date,
    applicableTo: date,
    months: z.array(z.number().int().min(1).max(12)).min(1),
    originDocumentUrl: url.optional(),
    distanceMethod: z.literal('published-product-miles'),
    boundary: z.literal('farm-to-retail'),
    local: Chain,
    conventional: Chain,
    assumptions: z.array(text).min(1),
    lifecycle: LifecycleComparison.optional(),
  })
  .superRefine((r, ctx) => {
    if (r.applicableFrom > r.applicableTo)
      ctx.addIssue({ code: 'custom', message: 'Invalid applicability dates' });
    if (r.basis === 'actual-observed' && (!r.originDocumentUrl || !r.scope.marketIds?.length))
      ctx.addIssue({
        code: 'custom',
        message: 'Observed comparison requires documented origin and exact market IDs',
      });
    for (const chain of [r.local, r.conventional])
      if (chain.legs?.length) {
        const total = chain.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
        if (Math.abs(total - chain.distance.value) > 1e-6)
          ctx.addIssue({
            code: 'custom',
            message: 'Leg distances must reconcile with published product miles',
          });
      }
  });
export type ComparisonRecord = z.infer<typeof ComparisonRecord>;
export const EvidenceCatalog = z
  .object({
    version: text,
    products: z.array(z.object({ id: text, aliases: z.array(text).min(1) })),
    sources: z.array(DatasetSource),
    comparisons: z.array(ComparisonRecord),
  })
  .superRefine((catalog, ctx) => {
    for (const entries of [catalog.products, catalog.sources, catalog.comparisons])
      if (new Set(entries.map((e) => e.id)).size !== entries.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate catalog ID' });
    const aliases = catalog.products.flatMap((p) => p.aliases.map((a) => a.trim().toLowerCase()));
    if (new Set(aliases).size !== aliases.length)
      ctx.addIssue({ code: 'custom', message: 'Ambiguous product alias' });
    for (const record of catalog.comparisons) {
      const source = catalog.sources.find((s) => s.id === record.sourceId);
      if (
        !source ||
        !source.products.includes(record.productId) ||
        !catalog.products.some((p) => p.id === record.productId)
      )
        ctx.addIssue({ code: 'custom', message: 'Record must reference a source covering its product' });
      if (
        source &&
        (!source.sourceUnits.includes('mile') ||
          !source.destinationScopes.some(
            (scope) =>
              scope.state === record.scope.state &&
              record.scope.cities.every((city) =>
                scope.cities.some((c) => c.toLowerCase() === city.toLowerCase()),
              ),
          ))
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Source units or geographic coverage do not support record scope',
        });
      if (
        source &&
        record.basis === 'actual-observed' &&
        (source.observedFrom === null ||
          source.observedTo === null ||
          record.applicableFrom < source.observedFrom ||
          record.applicableTo > source.observedTo)
      )
        ctx.addIssue({ code: 'custom', message: 'Observed applicability exceeds source observation dates' });
    }
  });
export type EvidenceCatalog = z.infer<typeof EvidenceCatalog>;
