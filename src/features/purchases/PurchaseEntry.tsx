import { useFeatureTranslation } from '../../i18n/featureText';
import { ZodError } from 'zod';
import { canonicalProductId } from './products';
import { parseQuantity } from './quantity';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { dollarsToCents, todayLocal, validateNewVisit, type NewVisitInput } from './model';
import { isExpiredSession, type PurchaseRepository } from './repository';
import { newItem, type DraftItem } from './draft';
import { PurchaseReview } from './PurchaseReview';
export type PurchaseMarket = { id: string; name: string; city: string; state: string };
export function PurchaseEntry({
  markets,
  repository,
  onRecorded,
  onSessionExpired,
}: {
  markets: PurchaseMarket[];
  repository: PurchaseRepository;
  onRecorded: () => void;
  onSessionExpired?: () => void;
}) {
  const { text, language } = useFeatureTranslation();
  const [step, setStep] = useState<'market' | 'items' | 'confirm' | 'done'>('market');
  const [filter, setFilter] = useState('');
  const [marketId, setMarketId] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [items, setItems] = useState<DraftItem[]>(() => [newItem()]);
  const [total, setTotal] = useState('');
  const [confirmed, setConfirmed] = useState<NewVisitInput | null>(null);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  const market = markets.find((m) => m.id === marketId);
  const choices = markets
    .filter((m) => `${m.name} ${m.city} ${m.state}`.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 50);
  if (market && !choices.some((m) => m.id === market.id)) choices.unshift(market);
  function review(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (!market) throw new Error('Select a market from the directory');
      if (!items.length) throw new Error('Add at least one purchased product.');
      if (items.some((i) => !i.product.trim())) throw new Error('Enter a name for every product.');
      setConfirmed(
        validateNewVisit({
          submissionId,
          marketId,
          date,
          totalCents: dollarsToCents(total),
          items: items.map((i) => ({
            id: i.id,
            product: i.product,
            productId: canonicalProductId(i.product),
            vendor: i.vendor.trim() || undefined,
            origin: i.origin.trim() || undefined,
            quantity: parseQuantity(i.quantity),
            unit: i.unit,
            spendingCents: i.price.trim() ? dollarsToCents(i.price) : undefined,
          })),
        }),
      );
      setStep('confirm');
    } catch (err) {
      setError(
        err instanceof ZodError
          ? err.issues.map((issue) => issue.message).join(' · ')
          : err instanceof Error
            ? err.message
            : 'Check purchase information',
      );
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
    } catch (err) {
      if (isExpiredSession(err)) {
        onSessionExpired?.();
        setError('Your purchase session expired. Reconnect through the account system to continue.');
      } else setError('Submission failed. Your information is still here; retry when ready.');
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
      <h2 id="purchase-heading" className="section-title" tabIndex={-1} ref={heading}>
        {text('Record a market visit')}
      </h2>
      <p>{text('Select Market → Enter Purchases → Confirm Information → Submit Visit')}</p>
      <p>
        {repository.persistence === 'memory'
          ? text(
              'Tab-memory demo: records disappear on reload or closing the tab. Nothing is saved to your account.',
            )
          : text('Using your connected private purchase repository.')}
      </p>
      {error && (
        <p role="alert" tabIndex={-1} ref={alert}>
          {text(error)}
        </p>
      )}
      {step === 'market' && (
        <div className="space-y-3">
          <label>
            {text('Find a market')}
            <input
              className="field"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={text('Market name, city or state')}
            />
          </label>
          <label>
            {text('Farmers market')}
            <select
              aria-label={text('Farmers market')}
              className="field"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
            >
              <option value="">{text('Select a market')}</option>
              {choices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.city}, {m.state}
                </option>
              ))}
            </select>
          </label>
          <p>{text('Showing up to 50 directory matches. Search to narrow the list.')}</p>
          <button className="btn-primary" disabled={!market} onClick={() => setStep('items')}>
            {text('Enter purchases')}
          </button>
        </div>
      )}
      {step === 'items' && (
        <form onSubmit={review} className="space-y-4">
          <p className="font-bold">{market?.name}</p>
          <label>
            {text('Visit date')}
            <input
              className="field"
              type="date"
              required
              max={todayLocal()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <PurchaseReview items={items} onItems={setItems} total={total} onTotal={setTotal} />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep('market')}>
              {text('Back to market')}
            </button>
            <button type="submit" className="btn-primary">
              {text('Confirm information')}
            </button>
          </div>
        </form>
      )}
      {step === 'confirm' && confirmed && (
        <div className="space-y-3">
          <h3 className="font-bold">{text('Review your trip')}</h3>
          <dl className="space-y-2">
            <div>
              <dt className="font-semibold">{text('Farmers market')}</dt>
              <dd>{market?.name}</dd>
            </div>
            <div>
              <dt className="font-semibold">{text('Visit date')}</dt>
              <dd>
                <time dateTime={confirmed.date}>
                  {new Date(`${confirmed.date}T12:00:00`).toLocaleDateString(language, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </dd>
            </div>
          </dl>
          <ul>
            {confirmed.items.map((i) => (
              <li key={i.id}>
                {i.product}: {i.quantity.toLocaleString(language)} {text(i.unit)}
                {i.spendingCents !== undefined
                  ? ` · $${(i.spendingCents / 100).toFixed(2)}`
                  : text(' · Item price unknown')}
                {i.vendor && (
                  <p>
                    {text('Vendor / farm (self-reported): ')}
                    {i.vendor}
                  </p>
                )}
                {i.origin && (
                  <p>
                    {text('Origin (self-reported): ')}
                    {i.origin}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p>
            {text('Total spent: $')}
            {(confirmed.totalCents / 100).toFixed(2)}
            {text(' USD · Counts as one visit.')}
          </p>
          <p className="text-sm">
            {text(
              'Recorded spending is not proof of locally grown food. Environmental estimates require separate evidence.',
            )}
          </p>
          <button className="btn-secondary" disabled={busy} onClick={() => setStep('items')}>
            {text('Edit information')}
          </button>{' '}
          <button className="btn-primary" disabled={busy} onClick={submit}>
            {busy ? text('Submitting…') : text('Submit visit')}
          </button>
        </div>
      )}
      {step === 'done' && (
        <div className="space-y-3">
          <p role="status">{text(status)}</p>
          {repository.persistence === 'memory' && (
            <p>
              {text(
                'This visit is recorded only in this tab. Reloading or closing the tab removes this history; it is not saved to an account.',
              )}
            </p>
          )}
          <button className="btn-primary" onClick={reset}>
            {text('Record another visit')}
          </button>
        </div>
      )}
    </section>
  );
}
