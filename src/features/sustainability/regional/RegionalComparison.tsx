import { useFeatureTranslation } from '../../../i18n/featureText';
import { useState } from 'react';
import type { Visit } from '../../purchases/model';
import { resolveRegionalVisits, type RegionalMarket } from './food';
import { regionalFreightSummary } from './freight';
import { originSensitivity } from './sensitivity';
import { regionalCatalog } from './catalog';
import { seasonalCatalog } from '../../seasonal/catalog/catalog';
import { EPA_SOURCE } from '../transport';
import type { Metric } from '../evidence';
export function RegionalComparison({
  visits,
  markets,
}: {
  visits: Visit[];
  markets: readonly RegionalMarket[];
}) {
  const { text, language } = useFeatureTranslation();
  const number = (n: number) => n.toLocaleString(language, { maximumFractionDigits: 3 });
  function value(metric: Metric) {
    if (metric.value !== null) return `${number(metric.value)} ${text(metric.unit)}`;
    return metric.knownSubtotal === null
      ? text('Not available for the whole basket')
      : text('{{v0}} {{v1}} · supported subset only; whole basket unavailable', {
          v0: number(metric.knownSubtotal),
          v1: text(metric.unit),
        });
  }

  const [choices, setChoices] = useState<Record<string, string>>({});
  const resolution = resolveRegionalVisits(visits, markets, choices);
  const freight = regionalFreightSummary(resolution);
  const supported = resolution.items.filter((r) => r.alternatives.length).length;
  return (
    <section aria-labelledby="regional-title" className="space-y-4">
      <h3 id="regional-title" className="text-xl font-bold">
        {text('Illustrative regional scenario')}
      </h3>
      <p className="rounded border border-amber-400 bg-amber-50 p-3 font-semibold">
        {text(
          'These estimates compare modeled regional and conventional supply chains. They do not measure the actual origin or emissions of your purchase.',
        )}
      </p>
      <p>
        {text(
          'Coarse straight-line freight proxy · NOT road mileage or a road-route emissions estimate. Each origin is a state geographic reference point, not a farm. Both branches conditionally assume consolidated medium/heavy truck freight at EPA average efficiency, not a farmer van.',
        )}
      </p>
      <p>
        {text('Model ')}
        {resolution.modelVersion}
        {text(' · reviewed ')}
        {regionalCatalog.reviewedAt}
        {text(' · visit-date scope')} {regionalCatalog.applicableFrom}–{regionalCatalog.applicableTo}.
      </p>
      <p>
        {text('Product coverage: ')}
        {supported}/{resolution.items.length}
        {text(' recorded entries have regional alternatives;')}{' '}
        {resolution.items.filter((r) => r.selected).length}
        {text(
          ' have a selected illustration. Unsupported items stay unknown. Alternatives are never added together or chosen to maximize savings.',
        )}
      </p>
      {!supported && (
        <p>
          {text(
            'Regional transportation estimates unavailable for these inputs. No reviewed product/destination/season/mass match.',
          )}
        </p>
      )}
      {!!supported && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            [
              text('Estimated regional food miles · kg-mile difference'),
              resolution.foodMiles.weightedDifference,
            ],
            [text('Average miles of difference per kilogram'), resolution.foodMiles.averageDifference],
            [text('Estimated transportation CO₂e · regional proxy'), freight.regional],
            [text('Estimated transportation CO₂e · conventional proxy'), freight.conventional],
            [text('Regional vs conventional difference · transportation CO₂e'), freight.difference],
          ].map(([title, m]) => (
            <div key={String(title)} className="card p-3">
              <dt>{String(title)}</dt>
              <dd className="font-bold">{value(m as Metric)}</dd>
            </div>
          ))}
        </dl>
      )}
      {!!supported && (
        <p>
          {text('Selected food-distance coverage: ')}
          {resolution.foodMiles.weightedDifference.covered}/{resolution.foodMiles.weightedDifference.expected}
          {text(' entries ·')} {number(resolution.foodMiles.coveredMassKg)}
          {text(' kg. Freight coverage: ')}
          {freight.difference.covered}/{freight.difference.expected}
          {text(' entries. A supported subset does not establish a whole-basket estimate.')}
        </p>
      )}
      <p>
        {text(
          'Difference = conventional minus regional. Negative means the regional scenario is higher. No verified CO₂e avoided is claimed. Consumer travel, refrigeration energy, farm emissions and total life-cycle emissions are excluded. Do not add this section to the historical or actual-evidence results.',
        )}
      </p>
      {resolution.items.map((row, index) => {
        const sensitivity = originSensitivity(row);
        return (
          <article
            key={row.key}
            className="card space-y-3 p-4"
            aria-label={text('{{v0}} regional scenarios, entry {{v1}}', {
              v0: row.item.product,
              v1: index + 1,
            })}
          >
            <h4 className="font-bold">
              {row.item.product} · {row.visit.date}
            </h4>
            {row.alternatives.length > 1 && (
              <label className="block">
                {text('Illustration for ')}
                {row.item.product}
                {text(', entry ')}
                {index + 1}
                <select
                  className="field"
                  value={row.selected?.scenario.id ?? ''}
                  onChange={(e) => setChoices((c) => ({ ...c, [row.key]: e.target.value }))}
                >
                  <option value="">{text('Choose an illustration; actual origin unknown')}</option>
                  {row.alternatives.map((a) => (
                    <option key={a.scenario.id} value={a.scenario.id}>
                      {a.regionalOrigin}
                      {text(' regional vs ')}
                      {a.conventionalOrigin}
                      {text(' conventional · conditional bulk truck')}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {row.alternatives.length === 1 && (
              <p>
                {text(
                  "One reviewed illustration applies automatically. It does not identify this purchase's route.",
                )}
              </p>
            )}
            {row.missing.map((reason) => (
              <p key={text(reason)}>{text(reason)}</p>
            ))}
            {sensitivity.alternatives.map((a) => (
              <details key={a.alternative.scenario.id}>
                <summary>
                  {a.alternative.regionalOrigin}
                  {text(' regional vs ')}
                  {a.alternative.conventionalOrigin}
                  {text(' conventional ·')} {number(a.alternative.distances.local.value)}
                  {text(' vs')} {number(a.alternative.distances.conventional.value)}
                  {text(' straight-line miles')}
                </summary>
                <p>
                  {text('Boundary: ')}
                  {text(a.alternative.scenario.regionalBoundary)}
                  {text('. Regional producer hypothesis')} {a.alternative.regionalOrigin}
                  {text('; conventional producer hypothesis')} {a.alternative.conventionalOrigin}
                  {text('. Neither is known to supply this purchase.')}
                </p>
                <p>
                  {text('Recorded mass: ')}
                  {number(a.alternative.kg)}
                  {text(' kg · kg-mile difference:')} {value(a.food.weightedDifference)}
                  {text(' · freight CO₂e difference: ')}
                  {value(a.freight)}.
                </p>
                <p>
                  {text(a.alternative.scenario.modeAssumption)}
                  {text(' Freight combustion only (tank-to-wheel), mass allocated.')}
                </p>
                {[a.alternative.distances.local, a.alternative.distances.conventional].map((d, i) => (
                  <div key={i}>
                    <a href={d.provenance.url} target="_blank" rel="noreferrer">
                      {d.provenance.source}
                    </a>
                    <ul className="list-disc pl-5">
                      {d.provenance.assumptions.map((s) => (
                        <li key={s}>{text(s)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p>
                  {text(
                    'Data quality: coarse illustration. Missing actual origins, routes, load utilization, consolidation and final delivery legs.',
                  )}
                </p>
              </details>
            ))}
            {sensitivity.alternatives.length > 1 && (
              <p>
                {text(sensitivity.note)}{' '}
                {sensitivity.extrema &&
                  text('These cases range from {{v0}} to {{v1}} kg CO₂e difference.', {
                    v0: number(sensitivity.extrema.min),
                    v1: number(sensitivity.extrema.max),
                  })}
              </p>
            )}
          </article>
        );
      })}
      <details>
        <summary>{text('Regional model sources and missing supply-chain evidence')}</summary>
        <p>
          {text('Model quality: coarse regional illustration. Review by ')}
          {regionalCatalog.applicableTo}
          {text(
            '; new purchase dates beyond that cutoff require a reviewed catalog release. Geographic applicability and seasonal coverage never establish actual purchase origins.',
          )}
        </p>
        <ul className="list-disc pl-5">
          {regionalCatalog.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.organization}
              </a>{' '}
              {text('· published ')}
              {s.publishedAt}
              {text('; crop observations ')}
              {s.observedFrom}–{s.observedTo}.
            </li>
          ))}
          <li>
            <a href={regionalCatalog.pointSource.url}>{text('Census state geographic references')}</a> ·{' '}
            {regionalCatalog.pointSource.publishedAt} ({regionalCatalog.pointSource.dateBasis}).
          </li>
          <li>
            <a href={regionalCatalog.modeSource.url}>{text('USDA AMS truck context')}</a>
            {text(' · published')} {regionalCatalog.modeSource.publishedAt}
            {text(' (month precision); ')}
            {regionalCatalog.modeSource.locator}.
          </li>
          <li>
            <a href={EPA_SOURCE.url}>{text('EPA January 2025 freight factors')}</a>
            {text(' · same existing AR5/short-ton-mile conversions.')}
          </li>
          <li>
            {text('Seasonal catalog ')}
            {seasonalCatalog.version}
            {text('. Calendar availability is not a routing observation.')}
            <ul>
              {seasonalCatalog.sources
                .filter((s) => regionalCatalog.production.some((p) => p.calendarSourceIds.includes(s.id)))
                .map((s) => (
                  <li key={s.id}>
                    <a href={s.url}>{s.organization}</a>
                    {text(' · published ')}
                    {text(s.published ?? 'unstated')}
                    {text(', reviewed')} {s.lastReviewed}.
                  </li>
                ))}
            </ul>
          </li>
        </ul>
        <p>
          {text(
            'No origin probabilities, road multipliers, assumed item weights, load-efficiency distributions or whole-life-cycle estimates. Production totals are context only. Public-source metadata is distinct from actual-purchase evidence.',
          )}
        </p>
      </details>
    </section>
  );
}
