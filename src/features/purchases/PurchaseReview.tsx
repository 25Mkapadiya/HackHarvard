import { useFeatureTranslation } from '../../i18n/featureText';
import { useId } from 'react';
import { purchaseProducts } from './products';
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
  const { text } = useFeatureTranslation();
  const helpId = useId();
  function patch(id: string, change: Partial<DraftItem>) {
    onItems(items.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }
  return (
    <div className="space-y-4">
      <h3 className="font-bold">{text('Check your products and spending')}</h3>
      <datalist id={`${helpId}-products`}>
        {purchaseProducts.map((p) => (
          <option key={p.id} value={text(p.name)} />
        ))}
      </datalist>
      {items.map((item, index) => (
        <fieldset key={item.id} className="min-w-0 space-y-2 rounded border p-3">
          <legend>
            {text('Product ')}
            {index + 1}
          </legend>
          <label>
            {text('Product name')}
            <input
              className="field"
              required
              maxLength={120}
              list={`${helpId}-products`}
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
              {text('Quantity')}
              <input
                className="field"
                type="number"
                required
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
              {text('Unit')}
              <select
                className="field"
                aria-label={text('Unit')}
                required
                value={item.unit}
                onChange={(e) =>
                  patch(item.id, {
                    unit: e.target.value as DraftItem['unit'],
                  })
                }
              >
                {QUANTITY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {text(u.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text('Item price USD (optional)')}
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
            {text(quantityHelp(item.unit))}
          </p>
          <details>
            <summary>{text('Vendor or origin (optional)')}</summary>
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <label>
                {text('Vendor / farm name (optional)')}
                <input
                  className="field"
                  maxLength={200}
                  value={item.vendor}
                  onChange={(e) => patch(item.id, { vendor: e.target.value })}
                />
              </label>
              <label>
                {text('Product origin (optional)')}
                <input
                  className="field"
                  maxLength={200}
                  value={item.origin}
                  onChange={(e) => patch(item.id, { origin: e.target.value })}
                  placeholder={text('If known: town, state or country')}
                />
              </label>
            </div>
            <p className="text-sm">
              {text(
                'These are details you provide. They do not verify local production or establish environmental benefits.',
              )}
            </p>
          </details>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => onItems(items.filter((i) => i.id !== item.id))}
          >
            {text('Remove product ')}
            {index + 1}
          </button>
        </fieldset>
      ))}
      {!items.length && <p>{text('Add at least one product before reviewing your visit.')}</p>}
      <button
        type="button"
        className="btn-secondary"
        disabled={items.length >= 100}
        onClick={() => onItems([...items, newItem()])}
      >
        {text('Add product')}
      </button>
      <p>
        {text(
          'Enter weighed quantities when possible. Each, bunch and volume units cannot be converted to kilograms without product-specific evidence. Counts remain counts; unsupported environmental estimates stay unavailable.',
        )}
      </p>
      <label>
        {text('Total spent USD')}
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
