import type { PurchaseItem } from './model';
export const QUANTITY_UNITS: { value: PurchaseItem['unit']; label: string }[] = [
  { value: 'kg', label: 'kg — kilograms' },
  { value: 'g', label: 'g — grams' },
  { value: 'lb', label: 'lb — pounds' },
  { value: 'oz', label: 'oz — ounces (weight)' },
  { value: 'each', label: 'each — individual items' },
  { value: 'bunch', label: 'bunch' },
  { value: 'dozen', label: 'dozen' },
  { value: 'pint', label: 'pint (volume)' },
  { value: 'quart', label: 'quart (volume)' },
  { value: 'loaf', label: 'loaf' },
];
export function parseQuantity(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e7)
    throw new Error('Enter a quantity greater than zero and no more than 10,000,000, or leave it blank.');
  return quantity;
}
export function quantityHelp(unit: PurchaseItem['unit']): string {
  return ['kg', 'g', 'lb', 'oz'].includes(unit)
    ? 'Enter measured weight. A photo cannot establish weight, price or production origin.'
    : 'Count or volume is kept as entered. No verified product-specific weight conversion is installed; environmental mass remains unknown.';
}
