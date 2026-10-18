import { useState } from 'react';
import type { Visit } from '../../purchases/model';
import { resolveRegionalVisits, type RegionalMarket } from './food';
import { regionalFreightSummary } from './freight';
import { originSensitivity } from './sensitivity';
import { regionalCatalog } from './catalog';
import { seasonalCatalog } from '../../seasonal/catalog/catalog';
import { EPA_SOURCE } from '../transport';
import type { Metric } from '../evidence';
const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 });
function value(metric: Metric) {
  if (metric.value !== null) return `${number(metric.value)} ${metric.unit}`;
  return metric.knownSubtotal === null
    ? 'Not available for the whole basket'
    : `${number(metric.knownSubtotal)} ${metric.unit} · supported subset only; whole basket unavailable`;
}
export function RegionalComparison({
  visits,
  markets,
}: {
  visits: Visit[];
  markets: readonly RegionalMarket[];
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const resolution = resolveRegionalVisits(visits, markets, choices);
  const freight = regionalFreightSummary(resolution);
  const supported = resolution.items.filter((r) => r.alternatives.length).length;
  return (
    <section aria-labelledby="regional-title" className="space-y-4">
      <h3 id="regional-title" className="text-xl font-bold">
        Illustrative regional scenario
      </h3>
      <p className="rounded border border-amber-400 bg-amber-50 p-3 font-semibold">
        These estimates compare modeled regional and conventional supply chains. They do not measure the
        actual origin or emissions of your purchase.
      </p>
      <p>
        Coarse straight-line freight proxy · NOT road mileage or a road-route emissions estimate. Each origin
        is a state geographic reference point, not a farm. Both branches conditionally assume consolidated
        medium/heavy truck freight at EPA average efficiency, not a farmer van.
      </p>
      <p>
        Model {resolution.modelVersion} · reviewed {regionalCatalog.reviewedAt} · visit-date scope{' '}
        {regionalCatalog.applicableFrom}–{regionalCatalog.applicableTo}.
      </p>
      <p>
        Product coverage: {supported}/{resolution.items.length} recorded entries have regional alternatives;{' '}
        {resolution.items.filter((r) => r.selected).length} have a selected illustration. Unsupported items
        stay unknown. Alternatives are never added together or chosen to maximize savings.
      </p>
      {!supported && (
        <p>
          Regional transportation estimates unavailable for these inputs. No reviewed
          product/destination/season/mass match.
        </p>
      )}
      {!!supported && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Estimated regional food miles · kg-mile difference', resolution.foodMiles.weightedDifference],
            ['Average miles of difference per kilogram', resolution.foodMiles.averageDifference],
            ['Estimated transportation CO₂e · regional proxy', freight.regional],
            ['Estimated transportation CO₂e · conventional proxy', freight.conventional],
            ['Regional vs conventional difference · transportation CO₂e', freight.difference],
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
          Selected food-distance coverage: {resolution.foodMiles.weightedDifference.covered}/
          {resolution.foodMiles.weightedDifference.expected} entries ·{' '}
          {number(resolution.foodMiles.coveredMassKg)} kg. Freight coverage: {freight.difference.covered}/
          {freight.difference.expected} entries. A supported subset does not establish a whole-basket
          estimate.
        </p>
      )}
      <p>
        Difference = conventional minus regional. Negative means the regional scenario is higher. No verified
        CO₂e avoided is claimed. Consumer travel, refrigeration energy, farm emissions and total life-cycle
        emissions are excluded. Do not add this section to the historical or actual-evidence results.
      </p>
      {resolution.items.map((row, index) => {
        const sensitivity = originSensitivity(row);
        return (
          <article
            key={row.key}
            className="card space-y-3 p-4"
            aria-label={`${row.item.product} regional scenarios, entry ${index + 1}`}
          >
            <h4 className="font-bold">
              {row.item.product} · {row.visit.date}
            </h4>
            {row.alternatives.length > 1 && (
              <label className="block">
                Illustration for {row.item.product}, entry {index + 1}
                <select
                  className="field"
                  value={row.selected?.scenario.id ?? ''}
                  onChange={(e) => setChoices((c) => ({ ...c, [row.key]: e.target.value }))}
                >
                  <option value="">Choose an illustration; actual origin unknown</option>
                  {row.alternatives.map((a) => (
                    <option key={a.scenario.id} value={a.scenario.id}>
                      {a.regionalOrigin} regional vs {a.conventionalOrigin} conventional · conditional bulk
                      truck
                    </option>
                  ))}
                </select>
              </label>
            )}
            {row.alternatives.length === 1 && (
              <p>
                One reviewed illustration applies automatically. It does not identify this purchase's route.
              </p>
            )}
            {row.missing.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
            {sensitivity.alternatives.map((a) => (
              <details key={a.alternative.scenario.id}>
                <summary>
                  {a.alternative.regionalOrigin} regional vs {a.alternative.conventionalOrigin} conventional ·{' '}
                  {number(a.alternative.distances.local.value)} vs{' '}
                  {number(a.alternative.distances.conventional.value)} straight-line miles
                </summary>
                <p>
                  Boundary: {a.alternative.scenario.regionalBoundary}. Regional producer hypothesis{' '}
                  {a.alternative.regionalOrigin}; conventional producer hypothesis{' '}
                  {a.alternative.conventionalOrigin}. Neither is known to supply this purchase.
                </p>
                <p>
                  Recorded mass: {number(a.alternative.kg)} kg · kg-mile difference:{' '}
                  {value(a.food.weightedDifference)} · freight CO₂e difference: {value(a.freight)}.
                </p>
                <p>
                  {a.alternative.scenario.modeAssumption} Freight combustion only (tank-to-wheel), mass
                  allocated.
                </p>
                {[a.alternative.distances.local, a.alternative.distances.conventional].map((d, i) => (
                  <div key={i}>
                    <a href={d.provenance.url} target="_blank" rel="noreferrer">
                      {d.provenance.source}
                    </a>
                    <ul className="list-disc pl-5">
                      {d.provenance.assumptions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p>
                  Data quality: coarse illustration. Missing actual origins, routes, load utilization,
                  consolidation and final delivery legs.
                </p>
              </details>
            ))}
            {sensitivity.alternatives.length > 1 && (
              <p>
                {sensitivity.note}{' '}
                {sensitivity.extrema &&
                  `These cases range from ${number(sensitivity.extrema.min)} to ${number(sensitivity.extrema.max)} kg CO₂e difference.`}
              </p>
            )}
          </article>
        );
      })}
      <details>
        <summary>Regional model sources and missing supply-chain evidence</summary>
        <p>
          Model quality: coarse regional illustration. Review by {regionalCatalog.applicableTo}; new purchase
          dates beyond that cutoff require a reviewed catalog release. Geographic applicability and seasonal
          coverage never establish actual purchase origins.
        </p>
        <ul className="list-disc pl-5">
          {regionalCatalog.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.organization}
              </a>{' '}
              · published {s.publishedAt}; crop observations {s.observedFrom}–{s.observedTo}.
            </li>
          ))}
          <li>
            <a href={regionalCatalog.pointSource.url}>Census state geographic references</a> ·{' '}
            {regionalCatalog.pointSource.publishedAt} ({regionalCatalog.pointSource.dateBasis}).
          </li>
          <li>
            <a href={regionalCatalog.modeSource.url}>USDA AMS truck context</a> · published{' '}
            {regionalCatalog.modeSource.publishedAt} (month precision); {regionalCatalog.modeSource.locator}.
          </li>
          <li>
            <a href={EPA_SOURCE.url}>EPA January 2025 freight factors</a> · same existing AR5/short-ton-mile
            conversions.
          </li>
          <li>
            Seasonal catalog {seasonalCatalog.version}. Calendar availability is not a routing observation.
            <ul>
              {seasonalCatalog.sources
                .filter((s) => regionalCatalog.production.some((p) => p.calendarSourceIds.includes(s.id)))
                .map((s) => (
                  <li key={s.id}>
                    <a href={s.url}>{s.organization}</a> · published {s.published ?? 'unstated'}, reviewed{' '}
                    {s.lastReviewed}.
                  </li>
                ))}
            </ul>
          </li>
        </ul>
        <p>
          No origin probabilities, road multipliers, assumed item weights, load-efficiency distributions or
          whole-life-cycle estimates. Production totals are context only. Public-source metadata is distinct
          from actual-purchase evidence.
        </p>
      </details>
    </section>
  );
}
