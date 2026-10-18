import type { Visit } from '../purchases/model';
import type { PurchaseMarket } from '../purchases/PurchaseEntry';
import { impactSummary, type ImpactData } from './summary';
import type { Metric } from './evidence';
type ComparisonBasis = 'modeled-scenario' | 'actual-observed';
function MetricCard({ title, result, basis }: { title: string; result: Metric; basis?: ComparisonBasis }) {
  const sources = [...new Map(result.sources.map((s) => [JSON.stringify(s), s])).values()];
  return (
    <section className="card space-y-2 p-4" aria-label={title}>
      <h3 className="font-bold">{title}</h3>
      <p className="text-2xl font-extrabold">
        {result.value === null
          ? 'Unavailable'
          : `${result.value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${result.unit}`}
      </p>
      {(result.value !== null || result.knownSubtotal !== null) && basis && (
        <p className="font-bold">
          {basis === 'modeled-scenario'
            ? 'Modeled scenario — not observed purchase impact'
            : 'Actual/observed supply-chain evidence'}
        </p>
      )}
      <p>
        Data quality: {result.quality} · Evidence coverage: {result.covered}/{result.expected} required
        entries
      </p>
      {result.value === null && result.knownSubtotal !== null && (
        <p>
          Known subset only: {result.knownSubtotal.toLocaleString(undefined, { maximumFractionDigits: 3 })}{' '}
          {result.unit}. This is not a whole-basket estimate.
        </p>
      )}
      <details>
        <summary>Sources, assumptions and missing information</summary>
        <p>Method: {result.methodVersion}</p>
        <ul className="list-disc space-y-1 pl-5">
          {result.assumptions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {!!result.missing.length && (
          <>
            <h4 className="mt-2 font-bold">Missing information</h4>
            <ul className="list-disc pl-5">
              {result.missing.map((m, i) => (
                <li key={i}>{m}</li>
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
                · {s.quality}
                <ul className="list-disc pl-5">
                  {s.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>No applicable source evidence supplied.</p>
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
  markets?: PurchaseMarket[];
  evidence?: ImpactData;
  comparisonBasis?: ComparisonBasis;
}) {
  const summary = impactSummary(visits, evidence);
  const names = new Map(markets.map((m) => [m.id, m.name]));
  return (
    <section className="space-y-5" aria-labelledby="sustainability-title">
      <h2 id="sustainability-title" className="section-title">
        Sustainability dashboard
      </h2>
      <p>
        Based on recorded purchases in the connected repository. Positive environmental differences mean a
        lower estimated local impact; negative differences mean a higher local impact. Market spending does
        not establish local production.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ['Market visits', summary.visits],
          ['Unique markets visited', summary.uniqueMarkets],
          ['Recorded market spending', `$${(summary.marketSpendingCents / 100).toFixed(2)} USD`],
        ].map(([title, value]) => (
          <div key={title} className="card p-4">
            <dt>{title}</dt>
            <dd className="text-3xl font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Estimated local spending" result={summary.localSpending} />
        <MetricCard
          title="Food miles difference (mass-weighted sum)"
          result={summary.foodMiles.weightedDifference}
          basis={comparisonBasis}
        />
        <MetricCard
          title="Average transportation-distance difference"
          result={summary.foodMiles.averageDifference}
          basis={comparisonBasis}
        />
        <MetricCard
          title="Transportation CO₂e difference"
          result={summary.transport}
          basis={comparisonBasis}
        />
        <MetricCard
          title="Total life-cycle CO₂e difference"
          result={summary.lifecycle}
          basis={comparisonBasis}
        />
      </div>
      <p>
        Environmental comparisons need sourced origins, comparable conventional supply chains, and compatible
        life-cycle data. Manual product names and market locations cannot supply these facts. Consumer travel
        is excluded unless an allocated comparison is supplied. Transportation is already a component of
        life-cycle emissions; do not add those cards together.
      </p>
      <section className="space-y-3">
        <h3 className="font-bold">Recorded purchase history</h3>
        {!visits.length && <p>No visits recorded in this repository.</p>}
        {[...visits].reverse().map((v) => (
          <details key={v.submissionId} className="card p-4">
            <summary>
              {v.date} · {names.get(v.marketId) ?? v.marketId} · ${(v.totalCents / 100).toFixed(2)} USD
            </summary>
            <ul>
              {v.items.map((i) => (
                <li key={i.id}>
                  {i.product} · {i.quantity ?? 'Unknown quantity'} {i.unit} ·{' '}
                  {i.spendingCents === undefined
                    ? 'Unknown item price'
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
