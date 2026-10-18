import { useId } from 'react';
import { QUANTITY_UNITS, quantityHelp } from './quantity';
import { newItem, type DraftItem } from './draft';
export function PurchaseReview({
  items,
  onItems,
  total,
  onTotal,
}: {
  items: DraftItem[];
  onItems: (items: DraftItem[]) => void;
  total: string;
  onTotal: (total: string) => void;
}) {
  const helpId = useId();
  function patch(id: string, change: Partial<DraftItem>) {
    onItems(items.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }
  return (
    <div className="space-y-4">
      <h3 className="font-bold">Check your products and spending</h3>
      {items.map((item, index) => (
        <fieldset key={item.id} className="min-w-0 space-y-2 rounded border p-3">
          <legend>Product {index + 1}</legend>
          <label>
            Product name
            <input
              className="field"
              required
              maxLength={120}
              value={item.product}
              onChange={(e) =>
                patch(item.id, {
                  product: e.target.value,
                })
              }
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Quantity (optional)
              <input
                className="field"
                type="number"
                min="0.000001"
                max="10000000"
                step="any"
                aria-describedby={`${helpId}-${item.id}`}
                value={item.quantity}
                onChange={(e) =>
                  patch(item.id, {
                    quantity: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Unit
              <select
                className="field"
                aria-label="Unit"
                value={item.unit}
                onChange={(e) =>
                  patch(item.id, {
                    unit: e.target.value as DraftItem['unit'],
                  })
                }
              >
                {QUANTITY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Item price USD (optional)
              <input
                className="field"
                type="text"
                inputMode="decimal"
                value={item.price}
                onChange={(e) => patch(item.id, { price: e.target.value })}
              />
            </label>
          </div>
          <p id={`${helpId}-${item.id}`} className="text-sm">
            {quantityHelp(item.unit)}
          </p>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => onItems(items.filter((i) => i.id !== item.id))}
          >
            Remove product {index + 1}
          </button>
        </fieldset>
      ))}
      {!items.length && <p>Add at least one product before reviewing your visit.</p>}
      <button
        type="button"
        className="btn-secondary"
        disabled={items.length >= 100}
        onClick={() => onItems([...items, newItem()])}
      >
        Add product
      </button>
      <p>
        Enter weighed quantities when possible. Each, bunch and volume units cannot be converted to kilograms
        without product-specific evidence. Missing quantities leave impacts unavailable.
      </p>
      <label>
        Total spent USD
        <input
          className="field"
          required
          type="text"
          inputMode="decimal"
          value={total}
          onChange={(e) => onTotal(e.target.value)}
        />
      </label>
    </div>
  );
}
