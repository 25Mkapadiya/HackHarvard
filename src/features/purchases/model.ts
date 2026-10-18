import { z } from 'zod';
import { canonicalProductId, purchaseProducts } from './products';
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const PurchaseItem = z.object({
  id: z.string().trim().min(1).max(100),
  product: z.string().trim().min(1).max(120),
  quantity: z.number().positive().finite().max(1e7).optional(),
  unit: z.enum(['kg', 'g', 'lb', 'oz', 'each', 'bunch', 'dozen', 'pint', 'quart', 'loaf']),
  spendingCents: cents.optional(),
  productId: z.enum(purchaseProducts.map((p) => p.id) as [string, ...string[]]).optional(),
  vendor: z.string().trim().min(1).max(200).optional(),
  origin: z.string().trim().min(1).max(200).optional(),
});
export type PurchaseItem = z.infer<typeof PurchaseItem>;
export const VisitInput = z
  .object({
    submissionId: z.string().min(1).max(100),
    marketId: z.string().trim().min(1).max(200),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((s) => {
        const d = new Date(`${s}T12:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
      }, 'Use a valid visit date'),
    totalCents: cents,
    items: z.array(PurchaseItem).min(1).max(100),
  })
  .superRefine((v, ctx) => {
    const subtotal = v.items.reduce((sum, i) => sum + (i.spendingCents ?? 0), 0);
    if (!Number.isSafeInteger(subtotal) || subtotal > v.totalCents)
      ctx.addIssue({ code: 'custom', message: 'Item prices cannot exceed the trip total' });
    for (const item of v.items) {
      if (item.productId && canonicalProductId(item.product) !== item.productId)
        ctx.addIssue({ code: 'custom', message: 'Product identifier must match the entered product name' });
    }
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      ctx.addIssue({ code: 'custom', message: 'Item IDs must be unique' });
  });
export type VisitInput = z.infer<typeof VisitInput>;
export type Visit = VisitInput & { submittedAt: string };

export function dollarsToCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error('Enter dollars with at most two decimal places');
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large');
  return result;
}
export function todayLocal(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validateVisit(input: unknown, now = new Date()): VisitInput {
  const parsed = VisitInput.parse(input);
  if (parsed.date > todayLocal(now)) throw new Error('Visit date cannot be in the future');
  return parsed;
}
export function visitFingerprint(visit: VisitInput): string {
  return JSON.stringify([
    visit.marketId,
    visit.date,
    visit.totalCents,
    visit.items
      .map((i) => [i.product.toLowerCase(), i.quantity ?? null, i.unit, i.spendingCents ?? null])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]);
}

/** New writes require quantities; legacy reads retain unknown-quantity compatibility. */
export const NewVisitInput = VisitInput.safeExtend({
  items: z
    .array(PurchaseItem.extend({ quantity: PurchaseItem.shape.quantity.unwrap() }))
    .min(1)
    .max(100),
});
export type NewVisitInput = z.infer<typeof NewVisitInput>;
export function validateNewVisit(input: unknown, now = new Date()): NewVisitInput {
  const parsed = NewVisitInput.parse(input);
  validateVisit(parsed, now);
  return parsed;
}
