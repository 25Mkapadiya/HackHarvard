import { useFeatureTranslation } from '../../i18n/featureText';
import { useState } from 'react';
import { productMatches, seasonalCatalog } from '../seasonal/catalog/catalog';
import {
  appendDemoReports,
  createDemoReports,
  utcDay,
  type DirectoryMarket,
  type ValidatedReport,
} from './models';

/** Independent, memory-only demo. No transport, account store or search-data mutation. */
export function MarketProductReporting({ markets }: { markets: readonly DirectoryMarket[] }) {
  const { text } = useFeatureTranslation();
  const [marketQuery, setMarketQuery] = useState('');
  const [marketId, setMarketId] = useState('');
  const [observedAt, setObservedAt] = useState(utcDay(new Date()));
  const [query, setQuery] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [review, setReview] = useState<ValidatedReport[] | null>(null);
  const [records, setRecords] = useState<ValidatedReport[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const market = markets.find((m) => m.id === marketId);
  const visibleMarkets = markets
    .filter((m) =>
      `${m.name} ${m.city ?? ''} ${m.state ?? ''}`.toLowerCase().includes(marketQuery.toLowerCase()),
    )
    .slice(0, 50);
  const selected = seasonalCatalog.products.filter((p) => productIds.includes(p.id));
  function prepare(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('');
    try {
      setReview(
        createDemoReports(
          { marketId, observedAt, productIds, notes },
          { markets, now: new Date() },
          crypto.randomUUID(),
        ),
      );
    } catch {
      setError(
        'Choose a directory market, a valid visit date on or before today, and 1–30 catalog products. Notes must be at most 500 characters.',
      );
    }
  }
  function saveDemo() {
    if (!review) return;
    try {
      // Recheck chronology and directory membership at confirmation time.
      const fresh = createDemoReports(
        { marketId, observedAt, productIds, notes },
        { markets, now: new Date() },
        crypto.randomUUID(),
      );
      const next = appendDemoReports(records, fresh);
      setStatus(
        next.length === records.length
          ? 'These observations are already in this local demo; no duplicates added.'
          : 'Added to this temporary local demo only. Nothing was uploaded or saved permanently.',
      );
      setRecords(next);
      setReview(null);
    } catch {
      setError('The report is no longer valid. Edit the report and try again.');
    }
  }
  return (
    <section aria-labelledby="report-title" className="card space-y-4 p-4">
      <h2 id="report-title" className="text-2xl font-bold">
        {text('What did you find at this market?')}
      </h2>
      <p className="rounded border border-amber-400 bg-amber-50 p-3">
        {text(
          'Local demonstration only · Unverified customer observations. Nothing is uploaded, published, or saved to an account. Leaving this view or reloading discards the demo. Reports do not prove current stock. Do not enter personal or sensitive information.',
        )}
      </p>
      {error && <p role="alert">{text(error)}</p>}
      {status && <p role="status">{text(status)}</p>}
      {review ? (
        <div className="space-y-3">
          <h3 className="text-xl font-bold">{text('Review product report')}</h3>
          <p>
            {market?.name}
            {text(' · Observed on ')}
            {observedAt}
          </p>
          <ul>
            {review.map((r) => (
              <li key={r.id}>
                {text(r.productName)}
                {text(' · observed · unverified customer')}
              </li>
            ))}
          </ul>
          {notes && (
            <p className="break-words">
              {text('Notes: ')}
              {notes}
            </p>
          )}
          <p>{text('This says what you saw on that date; it does not claim ongoing availability.')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              onClick={() => {
                setReview(null);
                setError('');
              }}
            >
              {text('Edit report')}
            </button>
            <button className="btn-primary" onClick={saveDemo}>
              {text('Add to local demo')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={prepare} className="space-y-4">
          <label className="block">
            {text('Find a reporting market')}
            <input className="field" value={marketQuery} onChange={(e) => setMarketQuery(e.target.value)} />
          </label>
          <label className="block">
            {text('Market for product report')}
            <select className="field" value={marketId} required onChange={(e) => setMarketId(e.target.value)}>
              <option value="">{text('Choose a market')}</option>
              {market && !visibleMarkets.some((m) => m.id === market.id) && (
                <option value={market.id}>{market.name}</option>
              )}
              {visibleMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.city} {m.state}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm">
            {text('Showing up to 50 matching directory markets. Refine the market name, city, or state.')}
          </p>
          <label className="block">
            {text('Date observed')}
            <input
              className="field"
              type="date"
              required
              max={utcDay(new Date())}
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
            />
          </label>
          <label className="block">
            {text('Search observed products')}
            <input
              className="field"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={text('Apple, snap bean, carrots…')}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="font-bold">{text('Catalog products observed (up to 30)')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {seasonalCatalog.products
                .filter((p) => productMatches(p, query))
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={productIds.includes(p.id)}
                      disabled={productIds.length >= 30 && !productIds.includes(p.id)}
                      onChange={(e) =>
                        setProductIds((ids) =>
                          e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {text(p.name)}
                  </label>
                ))}
            </div>
            {!seasonalCatalog.products.some((p) => productMatches(p, query)) && (
              <p>{text('No matching catalog product. Try another name.')}</p>
            )}
          </fieldset>
          <div aria-label={text('Selected products')}>
            <h3 className="font-bold">
              {text('Selected products (')}
              {selected.length})
            </h3>
            <ul>
              {selected.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  {text(p.name)}
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => setProductIds((ids) => ids.filter((id) => id !== p.id))}
                  >
                    {text('Remove ')}
                    {text(p.name)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <label className="block">
            {text('Report notes (optional)')}
            <textarea
              className="field"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="btn-secondary" type="submit">
            {text('Review report')}
          </button>
        </form>
      )}
      <div className="space-y-2 border-t border-line pt-3">
        <button className="btn-secondary" disabled>
          {text('Public submission unavailable')}
        </button>
        <p>
          {text(
            'A trusted authorized backend is required for shared submissions and official market updates.',
          )}
        </p>
        <h3 className="font-bold">
          {text('Temporary demo observations (')}
          {records.length})
        </h3>
        <ul>
          {records.map((r) => (
            <li key={r.id}>
              {text(r.productName)} · {markets.find((m) => m.id === r.marketId)?.name} · {r.observedAt}
              {text(' · local demo / unverified')}
            </li>
          ))}
        </ul>
        {!!records.length && (
          <button
            className="btn-quiet"
            onClick={() => {
              setRecords([]);
              setStatus('Local demo observations cleared.');
            }}
          >
            {text('Clear local reports')}
          </button>
        )}
      </div>
    </section>
  );
}
