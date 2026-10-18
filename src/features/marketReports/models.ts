import { z } from 'zod';
import { normalizeFood, seasonalCatalog } from '../seasonal/catalog/catalog';

const text = z.string().trim().min(1).max(200);
export const reportSchema = z.strictObject({
  id: text,
  marketId: text,
  productId: text,
  productName: text,
  observedAt: z.iso.date(),
  submittedAt: z.iso.datetime(),
  reporterType: z.enum(['customer', 'market_representative']),
  verificationStatus: z.enum(['unverified', 'verified']),
  availabilityStatus: z.enum(['observed', 'not_observed']).default('observed'),
  notes: z.string().trim().max(500).optional(),
  source: z.strictObject({
    kind: z.enum(['local_demo', 'trusted_backend']),
    recordId: text,
    system: text,
  }),
});
export type MarketProductReport = z.infer<typeof reportSchema>;
export type DirectoryMarket = { id: string; name: string; city?: string; state?: string };
export type ValidationContext = { markets: readonly DirectoryMarket[]; now: Date };
/** Supplied ONLY by a server-validated adapter, never from form fields or raw report JSON.
 * This describes an existing backend assertion; it does not implement identity or permissions. */
export type ServerReportAssertion = {
  reportId: string;
  marketId: string;
  sourceRecordId: string;
  reporterType: MarketProductReport['reporterType'];
  verificationStatus: MarketProductReport['verificationStatus'];
  /** Stable, opaque server-derived source identity, not a name/email/browser identifier. */
  independentReporterKey?: string;
};
const validated = new WeakMap<object, ServerReportAssertion | null>();
export type ValidatedReport = Readonly<MarketProductReport>;
export function utcDay(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid clock');
  return now.toISOString().slice(0, 10);
}
export function resolveProduct(value: string) {
  const q = normalizeFood(value);
  return seasonalCatalog.products.find((p) =>
    [p.id, p.name, p.nameEs, ...p.aliases].some((v) => normalizeFood(v) === q),
  );
}
export function validateReport(
  input: unknown,
  context: ValidationContext,
  assertion?: ServerReportAssertion,
): ValidatedReport {
  const report = reportSchema.parse(input);
  const today = utcDay(context.now);
  const product = seasonalCatalog.products.find((p) => p.id === report.productId);
  if (!context.markets.some((m) => m.id === report.marketId)) throw new Error('Unknown market');
  if (!product || report.productName !== product.name) throw new Error('Invalid product or display name');
  if (
    report.observedAt > today ||
    Date.parse(report.submittedAt) > context.now.getTime() ||
    report.observedAt > report.submittedAt.slice(0, 10)
  )
    throw new Error('Invalid report chronology');
  if (report.source.recordId !== report.id) throw new Error('Source record does not match report');
  if (report.source.kind === 'local_demo') {
    if (assertion || report.reporterType !== 'customer' || report.verificationStatus !== 'unverified')
      throw new Error('Demo reports cannot claim authority');
  } else if (
    !assertion ||
    assertion.reportId !== report.id ||
    assertion.marketId !== report.marketId ||
    assertion.sourceRecordId !== report.source.recordId ||
    assertion.reporterType !== report.reporterType ||
    assertion.verificationStatus !== report.verificationStatus ||
    (report.reporterType === 'market_representative' && report.verificationStatus !== 'verified') ||
    (assertion.independentReporterKey !== undefined && !assertion.independentReporterKey.trim())
  ) {
    throw new Error('Trusted backend assertion required');
  }
  Object.freeze(report.source);
  Object.freeze(report);
  validated.set(report, assertion ? Object.freeze({ ...assertion }) : null);
  return report;
}
/** Fail closed on deserialized/copied objects: revalidate at the adapter boundary. */
export function reportAuthority(report: ValidatedReport) {
  if (!validated.has(report)) throw new Error('Report must pass validation');
  return validated.get(report)!;
}
const demoDraft = z.strictObject({
  marketId: text,
  observedAt: z.iso.date(),
  productIds: z
    .array(text)
    .min(1)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate product'),
  notes: z.string().trim().max(500).optional(),
});
export type ReportDraft = z.infer<typeof demoDraft>;
export function createDemoReports(input: unknown, context: ValidationContext, batchId: string) {
  const draft = demoDraft.parse(input);
  return draft.productIds.map((productId) => {
    const product = seasonalCatalog.products.find((p) => p.id === productId);
    const id = `${batchId}:${productId}`;
    return validateReport(
      {
        id,
        marketId: draft.marketId,
        productId,
        productName: product?.name,
        observedAt: draft.observedAt,
        submittedAt: context.now.toISOString(),
        reporterType: 'customer',
        verificationStatus: 'unverified',
        availabilityStatus: 'observed',
        notes: draft.notes,
        source: { kind: 'local_demo', recordId: id, system: 'temporary-tab-demo' },
      },
      context,
    );
  });
}
/** Same market/product/day/status is one demo observation, regardless of retries or notes. */
export function appendDemoReports(
  existing: readonly ValidatedReport[],
  incoming: readonly ValidatedReport[],
) {
  const result = [...existing];
  const key = (r: ValidatedReport) =>
    JSON.stringify([r.marketId, r.productId, r.observedAt, r.availabilityStatus]);
  for (const report of [...existing, ...incoming]) {
    reportAuthority(report);
    if (report.source.kind !== 'local_demo') throw new Error('Only demo records belong in this store');
  }
  const keys = new Set(existing.map(key));
  for (const report of incoming)
    if (!keys.has(key(report))) {
      keys.add(key(report));
      result.push(report);
    }
  return result;
}
