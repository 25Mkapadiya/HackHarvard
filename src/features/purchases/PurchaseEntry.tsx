import { useRef, useState, type FormEvent } from 'react';
import { dollarsToCents, todayLocal, validateVisit, type VisitInput } from './model';
import type { PurchaseRepository } from './repository';
export type PurchaseMarket = { id: string; name: string; city: string; state: string };
type DraftItem = {
  id: string;
  product: string;
  quantity: string;
  unit: VisitInput['items'][number]['unit'];
  price: string;
};
const newItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  product: '',
  quantity: '',
  unit: 'kg',
  price: '',
});
export function PurchaseEntry({
  markets,
  repository,
  onRecorded,
}: {
  markets: PurchaseMarket[];
  repository: PurchaseRepository;
  onRecorded: () => void;
}) {
  const [step, setStep] = useState<'market' | 'items' | 'confirm' | 'done'>('market');
  const [filter, setFilter] = useState('');
  const [marketId, setMarketId] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [items, setItems] = useState<DraftItem[]>(() => [newItem()]);
  const [total, setTotal] = useState('');
  const [confirmed, setConfirmed] = useState<VisitInput | null>(null);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const market = markets.find((m) => m.id === marketId);
  const choices = markets
    .filter((m) => `${m.name} ${m.city} ${m.state}`.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 50);
  if (market && !choices.some((m) => m.id === market.id)) choices.unshift(market);
  function patchItem(id: string, patch: Partial<DraftItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function review(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (!market) throw new Error('Select a market from the directory');
      setConfirmed(
        validateVisit({
          submissionId,
          marketId,
          date,
          totalCents: dollarsToCents(total),
          items: items.map((i) => ({
            id: i.id,
            product: i.product,
            quantity: i.quantity.trim() ? Number(i.quantity) : undefined,
            unit: i.unit,
            spendingCents: i.price.trim() ? dollarsToCents(i.price) : undefined,
          })),
        }),
      );
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check purchase information');
    }
  }
  async function submit() {
    if (!confirmed || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await repository.submit(confirmed);
      setStatus(
        result.status === 'duplicate'
          ? 'This trip was already recorded; no additional visit counted.'
          : 'One market visit recorded.',
      );
      setStep('done');
      onRecorded();
    } catch {
      setError('Submission failed. Your information is still here; retry when ready.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setSubmissionId(crypto.randomUUID());
    setItems([newItem()]);
    setTotal('');
    setConfirmed(null);
    setStatus('');
    setStep('market');
  }
  return (
    <section className="card space-y-4 p-5" aria-labelledby="purchase-heading">
      <h2 id="purchase-heading" className="section-title">
        Record a market visit
      </h2>
      <p>Select Market → Enter Purchases → Confirm Information → Submit Visit</p>
      <p>
        {repository.persistence === 'memory'
          ? 'Tab-memory demo: records disappear on reload or closing the tab. Nothing is saved to your account.'
          : 'Using your connected private purchase repository.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {step === 'market' && (
        <div className="space-y-3">
          <label>
            Find a market
            <input
              className="field"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Market name, city or state"
            />
          </label>
          <label>
            Farmers market
            <select className="field" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">Select a market</option>
              {choices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.city}, {m.state}
                </option>
              ))}
            </select>
          </label>
          <p>Showing up to 50 directory matches. Search to narrow the list.</p>
          <button className="btn-primary" disabled={!market} onClick={() => setStep('items')}>
            Enter purchases
          </button>
        </div>
      )}
      {step === 'items' && (
        <form onSubmit={review} className="space-y-4">
          <p className="font-bold">{market?.name}</p>
          <label>
            Visit date
            <input
              className="field"
              type="date"
              required
              max={todayLocal()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {items.map((item, index) => (
            <fieldset key={item.id} className="space-y-2 rounded border p-3">
              <legend>Product {index + 1}</legend>
              <label>
                Product name
                <input
                  className="field"
                  required
                  maxLength={120}
                  value={item.product}
                  onChange={(e) => patchItem(item.id, { product: e.target.value })}
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
                    value={item.quantity}
                    onChange={(e) => patchItem(item.id, { quantity: e.target.value })}
                  />
                </label>
                <label>
                  Unit
                  <select
                    className="field"
                    value={item.unit}
                    onChange={(e) => patchItem(item.id, { unit: e.target.value as DraftItem['unit'] })}
                  >
                    {['kg', 'g', 'lb', 'oz', 'each', 'bunch', 'dozen', 'pint', 'quart', 'loaf'].map((u) => (
                      <option key={u}>{u}</option>
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
                    onChange={(e) => patchItem(item.id, { price: e.target.value })}
                  />
                </label>
              </div>
              <button
                type="button"
                className="btn-quiet"
                disabled={items.length === 1}
                onClick={() => setItems(items.filter((i) => i.id !== item.id))}
              >
                Remove product {index + 1}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            disabled={items.length >= 100}
            onClick={() => setItems([...items, newItem()])}
          >
            Add product
          </button>
          <p>
            Enter weighed quantities when possible. Each, bunch and volume units cannot be converted to
            kilograms without product-specific evidence. Missing quantities leave impacts unavailable.
          </p>
          <label>
            Total spent USD
            <input
              className="field"
              required
              type="text"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep('market')}>
              Back to market
            </button>
            <button type="submit" className="btn-primary">
              Confirm information
            </button>
          </div>
        </form>
      )}
      {step === 'confirm' && confirmed && (
        <div className="space-y-3">
          <h3 className="font-bold">Review your trip</h3>
          <p>
            {market?.name} · {confirmed.date}
          </p>
          <ul>
            {confirmed.items.map((i) => (
              <li key={i.id}>
                {i.product}: {i.quantity ?? 'Quantity unknown'} {i.unit}
                {i.spendingCents !== undefined
                  ? ` · $${(i.spendingCents / 100).toFixed(2)}`
                  : ' · Item price unknown'}
              </li>
            ))}
          </ul>
          <p>Total spent: ${(confirmed.totalCents / 100).toFixed(2)} USD · Counts as one visit.</p>
          <button className="btn-secondary" disabled={busy} onClick={() => setStep('items')}>
            Edit information
          </button>{' '}
          <button className="btn-primary" disabled={busy} onClick={submit}>
            {busy ? 'Submitting…' : 'Submit visit'}
          </button>
        </div>
      )}
      {step === 'done' && (
        <div className="space-y-3">
          <p role="status">{status}</p>
          <button className="btn-primary" onClick={reset}>
            Record another visit
          </button>
        </div>
      )}
    </section>
  );
}
