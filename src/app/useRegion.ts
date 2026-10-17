import { useMemo } from 'react';
import type { CropCalendar } from '../types';
import { distanceKm } from '../lib/geo';
import { useCrops, useMarkets } from './data';
import { useLocationState } from './context';

export const regionOfState = (cal: CropCalendar, state: string | undefined) =>
  Object.entries(cal.regions).find(([, r]) => state && r.states.includes(state))?.[0];

/**
 * The growing region for the person's location: the region of the nearest market's state.
 * Falls back to the Northeast (the default location is downtown Boston).
 */
export function useRegion(override?: string | null): { id: string; name: string; calendar?: CropCalendar } {
  const crops = useCrops();
  const markets = useMarkets();
  const { origin } = useLocationState();
  return useMemo(() => {
    const cal = crops.data;
    if (!cal) return { id: 'NE', name: '' };
    let id = override && cal.regions[override] ? override : undefined;
    if (!id && markets.data?.length) {
      let best = markets.data[0];
      let bestKm = Infinity;
      for (const m of markets.data) {
        const km = distanceKm(origin, m.geo);
        if (km < bestKm) [best, bestKm] = [m, km];
      }
      id = regionOfState(cal, best.state);
    }
    id ??= 'NE';
    return { id, name: cal.regions[id].name, calendar: cal };
  }, [crops.data, markets.data, origin, override]);
}
