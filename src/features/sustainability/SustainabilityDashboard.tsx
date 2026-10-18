import { useFeatureTranslation } from '../../i18n/featureText';
import { RegionalComparison } from './regional/RegionalComparison';
import type { Visit } from '../purchases/model';
import type { PurchaseMarket } from '../purchases/PurchaseEntry';
import { impactSummary, type ImpactData } from './summary';
import type { Metric } from './evidence';
type ComparisonBasis = 'modeled-scenario' | 'actual-observed';
function MetricCard({ title, result, basis }: { title: string; result: Metric; basis?: ComparisonBasis }) {
  const { text, language } = useFeatureTranslation();
  const sources = [...new Map(result.sources.map((s) => [JSON.stringify(s), s])).values()];
  return (
    <section className="card space-y-2 p-4" aria-label={text(title)}>
      <h3 className="font-bold">{text(title)}</h3>
      <p className="text-2xl font-extrabold">
        {result.value === null
          ? text('Unavailable')
          : `${result.value.toLocaleString(language, { maximumFractionDigits: 3 })} ${text(result.unit)}`}
      </p>
      {(result.value !== null || result.knownSubtotal !== null) && basis && (
        <p className="font-bold">
          {basis === 'modeled-scenario'
            ? text('Modeled scenario — not observed purchase impact')
            : text('Actual/observed supply-chain evidence')}
        </p>
      )}
      <p>
        {text('Data quality: ')}
        {text(result.quality)}
        {text(' · Evidence coverage: ')}
        {result.covered}/{result.expected}
        {text(' required entries')}
      </p>
      {result.value === null && result.knownSubtotal !== null && (
        <p>
          {text('Known subset only: ')}
          {result.knownSubtotal.toLocaleString(language, { maximumFractionDigits: 3 })} {text(result.unit)}
          {text('. This is not a whole-basket estimate.')}
        </p>
      )}
      <details>
        <summary>{text('Sources, assumptions and missing information')}</summary>
        <p>
          {text('Method: ')}
          {result.methodVersion}
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {result.assumptions.map((s) => (
            <li key={s}>{text(s)}</li>
          ))}
        </ul>
        {!!result.missing.length && (
          <>
            <h4 className="mt-2 font-bold">{text('Missing information')}</h4>
            <ul className="list-disc pl-5">
              {result.missing.map((m, i) => (
                <li key={i}>{text(m)}</li>
              ))}
            </ul>
          </>
        )}
        {sources.length ? (
          <ul>
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.source}
                </a>{' '}
                · {text(s.quality)}
                <ul className="list-disc pl-5">
                  {s.assumptions.map((a) => (
                    <li key={a}>{text(a)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>{text('No applicable source evidence supplied.')}</p>
        )}
      </details>
    </section>
  );
}
export function SustainabilityDashboard({
  visits,
  markets = [],
  evidence = {},
  comparisonBasis,
}: {
  visits: Visit[];
  markets?: (PurchaseMarket & { geo?: { lat: number; lng: number } })[];
  evidence?: ImpactData;
  comparisonBasis?: ComparisonBasis;
}) {
  const { text, language } = useFeatureTranslation();
  const summary = impactSummary(visits, evidence);
  const names = new Map(markets.map((m) => [m.id, m.name]));
  return (
    <section className="space-y-5" aria-labelledby="sustainability-title">
      <h2 id="sustainability-title" className="section-title">
        {text('Sustainability dashboard')}
      </h2>
      <p>
        {text(
          'Based on recorded purchases in the connected repository. Positive environmental differences mean a lower estimated local impact; negative differences mean a higher local impact. Market spending does not establish local production.',
        )}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          [text('Market visits'), summary.visits],
          [text('Unique markets visited'), summary.uniqueMarkets],
          [text('Recorded market spending'), `$${(summary.marketSpendingCents / 100).toFixed(2)} USD`],
        ].map(([title, value]) => (
          <div key={text(title)} className="card p-4">
            <dt>{text(title)}</dt>
            <dd className="text-3xl font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title={text('Estimated local spending')} result={summary.localSpending} />
        <MetricCard
          title={text('Food miles difference (mass-weighted sum)')}
          result={summary.foodMiles.weightedDifference}
          basis={comparisonBasis}
        />
        <MetricCard
          title={text('Average transportation-distance difference')}
          result={summary.foodMiles.averageDifference}
          basis={comparisonBasis}
        />
        <MetricCard
          title={text('Transportation CO₂e difference')}
          result={summary.transport}
          basis={comparisonBasis}
        />
        <MetricCard
          title={text('Total life-cycle CO₂e difference')}
          result={summary.lifecycle}
          basis={comparisonBasis}
        />
      </div>
      <p>
        {text(
          'Actual-purchase comparisons require documented origins and conventional alternatives. Historical scenarios use study endpoints with your recorded mass only. Life-cycle results additionally require compatible stage data. Consumer travel is excluded unless an allocated comparison is supplied. Transportation is already a component of life-cycle emissions; do not add those cards together.',
        )}
      </p>
      <RegionalComparison visits={visits} markets={markets} />
      <section className="space-y-3">
        <h3 className="font-bold">{text('Recorded purchase history')}</h3>
        {!visits.length && <p>{text('No visits recorded in this repository.')}</p>}
        {[...visits].reverse().map((v) => (
          <details key={v.submissionId} className="card p-4">
            <summary>
              {v.date} · {names.get(v.marketId) ?? v.marketId} · ${(v.totalCents / 100).toFixed(2)}
              {text(' USD')}
            </summary>
            <ul>
              {v.items.map((i) => (
                <li key={i.id}>
                  {i.product} · {i.quantity?.toLocaleString(language) ?? text('Unknown quantity')}{' '}
                  {text(i.unit)} ·{' '}
                  {i.spendingCents === undefined
                    ? text('Unknown item price')
                    : `$${(i.spendingCents / 100).toFixed(2)}`}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </section>
  );
}
