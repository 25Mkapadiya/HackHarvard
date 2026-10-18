import { useFeatureTranslation } from '../../i18n/featureText';
import { environmentalEvidence } from './adapters/catalog';
import type { VisitEvidence } from './adapters/visits';
export function EvidenceDetails({
  scenarioId,
  onScenarioChange,
  collection,
}: {
  scenarioId: string;
  onScenarioChange: (id: string) => void;
  collection: VisitEvidence;
}) {
  const { text } = useFeatureTranslation();
  return (
    <section className="card space-y-3 p-4" aria-labelledby="environmental-evidence-title">
      <h2 id="environmental-evidence-title" className="section-title">
        {text('Environmental evidence')}
      </h2>
      <p>
        {text(
          'Recorded spending and quantities are separate from environmental comparisons. No actual purchase-specific supply chains are documented by the bundled dataset.',
        )}
      </p>
      <label>
        {text('Environmental comparison')}
        <select
          aria-label={text('Environmental comparison')}
          className="field"
          value={scenarioId}
          onChange={(e) => onScenarioChange(e.target.value)}
        >
          <option value="">{text('Actual/observed evidence only — no historical scenario')}</option>
          {environmentalEvidence.catalog.comparisons
            .filter((r) => r.basis === 'modeled-scenario')
            .map((r) => (
              <option key={r.id} value={r.id}>
                {text(r.label)}
              </option>
            ))}
        </select>
      </label>
      {scenarioId ? (
        <div role="note" className="rounded border p-3">
          <p className="font-bold">
            {text('Modeled historical scenario — not your actual purchase impact.')}
          </p>
          <p>
            {text(
              'Uses recorded fresh-apple mass only for markets listed in Syracuse, NY. Source case evidence is circa 2008–2009, published 2010. Direct-market comparisons apply April–December (including stored apples). Other products, places and unsupported dates remain unavailable.',
            )}
          </p>
          {scenarioId === 'syracuse-regional-retail-vs-wa' ? (
            <p>
              {text(
                'This illustration compares two historical supermarket distribution chains. It does not estimate a farmers-market supply route. Freight uses EPA average factors, not measured trip emissions.',
              )}
            </p>
          ) : (
            <p>
              {text(
                'The direct-market small van cannot use the heavy-truck factor; transportation CO₂e remains unavailable for this scenario.',
              )}
            </p>
          )}
        </div>
      ) : (
        <p>
          {text(
            'Actual/observed supply-chain status: unknown. A product name and market location do not establish farm origin or a conventional alternative.',
          )}
        </p>
      )}
      <p className="text-sm">
        {text('Catalog: ')}
        {environmentalEvidence.catalog.version}
        {text('. Scenario selection is optional, stays in this view, and does not alter recorded purchases.')}
      </p>
      {collection.items.map(({ key, product, date, resolution }) => (
        <details key={key} className="rounded border p-3">
          <summary>
            {date} · {product} ·{' '}
            {resolution.basis === 'modeled-scenario'
              ? text('Modeled scenario')
              : resolution.basis === 'actual-observed'
                ? text('Actual/observed evidence')
                : text('Insufficient evidence')}
          </summary>
          {resolution.record && (
            <>
              <p>{text(resolution.record.label)}</p>
              <p>
                {text('Study local chain: ')}
                {text(resolution.record.local.originLabel)} → {text(resolution.record.local.destinationLabel)}{' '}
                ({resolution.record.local.distance.value}
                {text(' miles).')}
              </p>
              <p>
                {text('Study conventional chain: ')}
                {text(resolution.record.conventional.originLabel)} →{' '}
                {text(resolution.record.conventional.destinationLabel)} (
                {resolution.record.conventional.distance.value}
                {text(' miles).')}
              </p>
            </>
          )}
          {resolution.sources.map((source) => (
            <div key={source.id} className="space-y-1 text-sm">
              <p>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.name}
                </a>{' '}
                · {source.sourceLocator}
              </p>
              <p>
                {text('Published ')}
                {source.publicationDate}
                {text('. Observations: ')}
                {text(source.observationPeriod)}
                {text('. Reviewed')} {source.reviewedAt}.
              </p>
              <p>
                {text('Scope: ')}
                {text(source.geography)}
                {text('. Products: ')}
                {source.products.map((product) => text(product)).join(', ')}
                {text('. Source units:')} {source.sourceUnits.join(', ')}.
              </p>
              <p>
                {text('Method: ')}
                {text(source.methodology)}.
              </p>
              <p>
                {text('Use/redistribution: ')}
                {text(source.license)}.{' '}
                <a href={source.licenseUrl} target="_blank" rel="noreferrer">
                  {text('Reuse basis')}
                </a>
              </p>
            </div>
          ))}
          {!!resolution.missing.length && (
            <>
              <h3 className="mt-2 font-bold">{text('Unavailable inputs (not required by every metric)')}</h3>
              <ul className="list-disc pl-5">
                {resolution.missing.map((m, i) => (
                  <li key={i}>{text(m.reason)}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      ))}
    </section>
  );
}
