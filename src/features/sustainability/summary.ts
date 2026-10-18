import type { Visit } from '../purchases/model';
import { spendingSummary, type LocalAttribution } from './spending';
import { foodMilesSummary } from './foodMiles';
import { transportSummary, type TransportEvidence, type TripComparison } from './transport';
import { lifecycleSummary, type LifecycleEvidence } from './lifecycle';
export type ImpactData = {
  items?: Record<string, TransportEvidence & LifecycleEvidence>;
  localAttribution?: LocalAttribution;
  transportTrips?: Record<string, TripComparison>;
  lifecycleTrips?: Record<string, TripComparison>;
};
export function impactSummary(visits: Visit[], data: ImpactData = {}) {
  // Validate visits and duplicate IDs before any metric consumes the collection.
  return {
    ...spendingSummary(visits, data.localAttribution),
    foodMiles: foodMilesSummary(visits, data.items),
    transport: transportSummary(visits, data.items, data.transportTrips),
    lifecycle: lifecycleSummary(visits, data.items, data.lifecycleTrips),
  };
}
