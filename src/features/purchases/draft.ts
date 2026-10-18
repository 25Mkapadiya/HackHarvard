import type { VisitInput } from './model';
export type DraftItem = {
  id: string;
  product: string;
  quantity: string;
  unit: VisitInput['items'][number]['unit'];
  price: string;
};
export const newItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  product: '',
  quantity: '',
  unit: 'kg',
  price: '',
});
