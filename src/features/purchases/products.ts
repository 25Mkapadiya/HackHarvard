import { normalizeFood, seasonalCatalog } from '../seasonal/catalog/catalog';
/** Manual names/aliases only; no recognition, inference or inventory assertion. */
export const purchaseProducts = seasonalCatalog.products;
export function canonicalProductId(name: string): string | undefined {
  const key = normalizeFood(name);
  return purchaseProducts.find((p) =>
    [p.id, p.name, p.nameEs, ...p.aliases].some((alias) => normalizeFood(alias) === key),
  )?.id;
}
