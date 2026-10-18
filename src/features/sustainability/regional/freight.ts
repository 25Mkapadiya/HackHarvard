import type { Visit } from '../../purchases/model';
import { transportSummary, type TransportEvidence } from '../transport';
import { itemEvidenceKey } from '../evidence';
import { regionalCatalog, type RegionalCatalog } from './catalog';
import type { RegionalAlternative, RegionalResolution } from './food';
/** Conditional freight assumption, not mode evidence for the recorded purchase. */
export function regionalTransportEvidence(alternative: RegionalAlternative, catalog: RegionalCatalog = regionalCatalog): TransportEvidence {
  const { scenario, distances } = alternative;
  if (!scenario.regionalMode || !scenario.conventionalMode) return { distances };
  const leg = (side: 'local' | 'conventional') => ({
    mode: side === 'local' ? scenario.regionalMode! : scenario.conventionalMode!,
    distance: { ...distances[side], provenance: { ...distances[side].provenance,
      assumptions: [...distances[side].provenance.assumptions, scenario.modeAssumption,
        `Mode context (not proof of actual mode): ${catalog.modeSource.url}; ${catalog.modeSource.locator}.`,
        'EPA average combustion factor × straight-line geometric miles is a conditional freight proxy, NOT a road-route emissions estimate. Unknown load efficiency and refrigeration are not modeled.',
      ],
    } },
  });
  return { distances, transport: { local: [leg('local')], conventional: [leg('conventional')], boundary: 'tank-to-wheel', allocation: 'mass' } };
}
/** Reuse the unchanged engine for each branch as well as their signed difference. */
export function regionalFreightSummary(resolution: RegionalResolution, catalog = regionalCatalog) {
  const data: Record<string, TransportEvidence> = {};
  for (const row of resolution.items) if (row.selected) data[row.key] = regionalTransportEvidence(row.selected, catalog);
  const zero = (rows: typeof data, branch: 'local' | 'conventional') => Object.fromEntries(Object.entries(rows).map(([key,e]) => [key,
    e.transport ? { ...e, transport: { ...e.transport,
      local: e.transport[branch].map(leg => ({ ...leg, distance: { ...leg.distance, value: 0 } })),
      conventional: e.transport[branch],
    } } : e,
  ]));
  return { difference: transportSummary(resolution.visits, data),
    regional: transportSummary(resolution.visits, zero(data, 'local')),
    conventional: transportSummary(resolution.visits, zero(data, 'conventional')),
  };
}
/** A singleton item calculation; results from alternatives must never be added together. */
export function alternativeFreight(visit: Visit, itemId: string, alternative: RegionalAlternative, catalog = regionalCatalog) {
  const single = { ...visit, items: visit.items.filter(i => i.id === itemId) };
  return transportSummary([single], { [itemEvidenceKey(visit.submissionId,itemId)]: regionalTransportEvidence(alternative,catalog) });
}
