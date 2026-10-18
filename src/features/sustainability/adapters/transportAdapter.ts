import type { TransportComparison, FreightLeg } from '../transport';
import type { Provenance } from '../evidence';
import type { ComparisonRecord, Chain } from './schema';
/** Admit only complete source-backed legs in the vehicle classes supported by EPA's existing factors. */
export function buildTransportEvidence(
  record: ComparisonRecord,
  provenance: Provenance,
): { transport?: TransportComparison; reason?: string } {
  function legs(chain: Chain): FreightLeg[] | null {
    if (!chain.legs?.length) return null;
    const result: FreightLeg[] = [];
    for (const leg of chain.legs) {
      if (!leg.mode || leg.mode === 'van' || !leg.modeEvidence) return null;
      if (leg.mode === 'truck' && leg.vehicleClass !== 'medium-heavy-duty') return null;
      if (leg.mode !== 'truck' && leg.vehicleClass !== 'not-applicable') return null;
      result.push({
        mode: leg.mode,
        distance: {
          ...leg.distance,
          provenance: {
            ...provenance,
            assumptions: [
              ...provenance.assumptions,
              `${chain.sourceLocator}: ${leg.label}; mode evidence: ${leg.modeEvidence}.`,
              'EPA 2025 national-average mass-distance combustion factor applied to historical product miles; not measured emissions or a replication of source load-specific fuel use.',
              'Return/empty commercial vehicle miles are not independently added; no claim of exact trip loading or operational efficiency.',
            ],
          },
        },
      });
    }
    return result;
  }
  const local = legs(record.local),
    conventional = legs(record.conventional);
  if (!local || !conventional)
    return {
      reason:
        'Complete compatible freight evidence is missing. A small van, unknown vehicle class or undocumented mode cannot use the EPA medium/heavy truck freight factor.',
    };
  return { transport: { local, conventional, boundary: 'tank-to-wheel', allocation: 'mass' } };
}
