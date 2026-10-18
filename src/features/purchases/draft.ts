import type { VisitInput } from './model';
import { canonicalProductId, type SuggestedProduct } from './recognition';
export type DraftItem = {
  id: string;
  product: string;
  quantity: string;
  unit: VisitInput['items'][number]['unit'];
  price: string;
  needsReview: boolean;
  candidateProductId?: string;
  suggestion?: string;
};
export const newItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  product: '',
  quantity: '',
  unit: 'kg',
  price: '',
  needsReview: false,
});
export function suggestionDraft(product: SuggestedProduct, priceCents?: number): DraftItem {
  const mass = product.unit !== null && ['kg', 'g', 'lb', 'oz'].includes(product.unit);
  return {
    ...newItem(),
    product: product.name,
    candidateProductId: product.candidateProductId ?? canonicalProductId(product.name),
    quantity: !mass && product.quantity !== null ? String(product.quantity) : '',
    unit: product.unit ?? 'kg',
    price: priceCents === undefined ? '' : (priceCents / 100).toFixed(2),
    needsReview: true,
    suggestion: `${product.quantity === null ? 'Quantity unknown.' : `Unverified quantity suggestion: ${product.quantity} ${product.unit}.`}${mass ? ' Enter a measured quantity yourself; suggested mass is not used.' : ''} ${product.confidence === null ? 'Confidence unspecified.' : `Provider-reported confidence: ${Math.round(product.confidence * 100)}% (not a guarantee).`} ${product.uncertainty}`,
  };
}
