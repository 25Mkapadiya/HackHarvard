import { z } from 'zod';
import { PurchaseItem } from './model';
import { normalizeFood, seasonalCatalog } from '../seasonal/catalog/catalog';
export const candidateProductId = z
  .string()
  .refine(
    (id) => seasonalCatalog.products.some((p) => p.id === id),
    'Unknown standardized product identifier',
  );
export function canonicalProductId(name: string): string | undefined {
  const key = normalizeFood(name);
  return seasonalCatalog.products.find((p) =>
    [p.id, p.name, p.nameEs, ...p.aliases].some((alias) => normalizeFood(alias) === key),
  )?.id;
}
export const SuggestedProduct = z
  .object({
    name: PurchaseItem.shape.product,
    candidateProductId: candidateProductId.nullable(),
    quantity: PurchaseItem.shape.quantity.unwrap().nullable(),
    unit: PurchaseItem.shape.unit.nullable(),
    confidence: z.number().finite().min(0).max(1).nullable(),
    uncertainty: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine(
    (p) => (p.quantity === null) === (p.unit === null),
    'Quantity and unit must be supplied together or both unknown',
  );
export type SuggestedProduct = z.infer<typeof SuggestedProduct>;
export const ProductRecognitionResult = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unavailable') }).strict(),
  z
    .object({
      status: z.literal('suggestions'),
      products: z.array(SuggestedProduct).max(100),
      uncertainty: z.array(z.string().trim().min(1).max(500)).max(20),
    })
    .strict(),
]);
export type ProductRecognitionResult = z.infer<typeof ProductRecognitionResult>;
export type ImageRequest = { image: File; signal: AbortSignal };
/** A future provider must be supplied deliberately by the integration owner. Never embed credentials. */
export interface ProductRecognitionProvider {
  readonly available: boolean;
  recognize(request: ImageRequest): Promise<unknown>;
}
export const unavailableRecognition: ProductRecognitionProvider = {
  available: false,
  async recognize() {
    return { status: 'unavailable' };
  },
};
/** Runtime validation prevents malformed or overconfident service output entering editable drafts. */
export async function recognizeProducts(
  provider: ProductRecognitionProvider,
  request: ImageRequest,
): Promise<ProductRecognitionResult> {
  if (!provider.available) return { status: 'unavailable' };
  const result = ProductRecognitionResult.parse(await provider.recognize(request));
  if (request.signal.aborted) throw new Error('Processing cancelled');
  return result;
}
