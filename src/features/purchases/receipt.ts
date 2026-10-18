import { z } from 'zod';
import { PurchaseItem } from './model';
import { SuggestedProduct, type ImageRequest } from './recognition';
export const ReceiptProduct = SuggestedProduct.safeExtend({
  priceCents: PurchaseItem.shape.spendingCents.unwrap().nullable(),
});
export const ReceiptExtractionResult = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unavailable') }).strict(),
  z
    .object({
      status: z.literal('suggestions'),
      products: z.array(ReceiptProduct).max(100),
      totalCents: PurchaseItem.shape.spendingCents.unwrap().nullable(),
      uncertainty: z.array(z.string().trim().min(1).max(500)).max(20),
    })
    .strict(),
]);
export type ReceiptExtractionResult = z.infer<typeof ReceiptExtractionResult>;
/** No personal identity, merchant payment data or full OCR text is retained in this contract. */
export interface ReceiptExtractionProvider {
  readonly available: boolean;
  extract(request: ImageRequest): Promise<unknown>;
}
export const unavailableReceiptExtraction: ReceiptExtractionProvider = {
  available: false,
  async extract() {
    return { status: 'unavailable' };
  },
};
export async function extractReceipt(
  provider: ReceiptExtractionProvider,
  request: ImageRequest,
): Promise<ReceiptExtractionResult> {
  if (!provider.available) return { status: 'unavailable' };
  if (request.signal.aborted) throw new Error('Processing cancelled');
  const result = ReceiptExtractionResult.parse(await provider.extract(request));
  if (request.signal.aborted) throw new Error('Processing cancelled');
  return result;
}
