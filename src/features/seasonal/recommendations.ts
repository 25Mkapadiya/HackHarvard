import type { Crop, CropCalendar } from '../../types';
import type { MarketView } from '../../lib/filters';
import { distanceKm, type LatLng } from '../../lib/geo';
import { rank, reportedMarkets, type Signals } from './ranking';
import { seasonalCatalog, type SeasonalCatalog, type WindowKind } from './catalog/catalog';

export function regionForState(calendar: CropCalendar, state: string | undefined) {
  return Object.entries(calendar.regions).find(([, r]) => state && r.states.includes(state))?.[0];
}
/** Market-associated state is a hint, not a reverse geocoder. Never default distant places to Boston. */
export function nearbyState(markets: MarketView[], origin: LatLng): string | undefined {
  const nearest = markets
    .map((m) => ({ m, km: distanceKm(origin, m.geo) }))
    .filter(({ km }) => km <= 80)
    .sort((a, b) => a.km - b.km || a.m.id.localeCompare(b.m.id))[0];
  return nearest?.m.state;
}
export type Resolution = {
  level: 'verified-state' | 'verified-region' | 'approximate' | 'unknown';
  active: boolean | undefined;
  status: string;
  sourceIds: string[];
  note?: string;
};
const labels: Record<WindowKind, string> = {
  harvest: 'In season · harvest',
  peak: 'In season · peak harvest',
  availability: 'Documented availability · harvest unspecified',
  storage: 'Available from storage · not fresh harvest',
  extended: 'Extended season · confirm with grower',
  limited: 'Limited availability · confirm with grower',
};
export function resolveSeason(
  crop: Crop,
  state: string | undefined,
  region: string | undefined,
  month: number,
  catalog: SeasonalCatalog = seasonalCatalog,
): Resolution {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid month');
  const records = catalog.records.filter(
    (r) => r.product === crop.id && state && r.scope.states.includes(state),
  );
  const record =
    records.find((r) => r.scope.kind === 'state') ?? records.find((r) => r.scope.kind === 'region');
  if (record) {
    const priority: WindowKind[] = ['harvest', 'peak', 'storage', 'extended', 'limited', 'availability'];
    const activeKind = priority.find((k) =>
      record.windows.some((w) => w.kind === k && w.months.includes(month)),
    );
    const harvestOnly = record.windows.every((w) => w.kind === 'harvest' || w.kind === 'peak');
    return {
      level: record.scope.kind === 'state' ? 'verified-state' : 'verified-region',
      active: Boolean(activeKind),
      status: activeKind
        ? labels[activeKind]
        : harvestOnly
          ? 'Outside documented harvest window'
          : 'Outside documented seasonal windows',
      sourceIds: record.sourceIds,
      note: record.locator,
    };
  }
  const months = region ? crop.months[region] : undefined;
  return months
    ? {
        level: 'approximate',
        active: months.includes(month),
        status: months.includes(month)
          ? 'In season · approximate regional guide'
          : 'Outside approximate regional window',
        sourceIds: [],
      }
    : { level: 'unknown', active: undefined, status: 'Seasonal information unknown', sourceIds: [] };
}
export function recommendForPlace(
  crops: Crop[],
  state: string | undefined,
  region: string | undefined,
  month: number,
  markets: MarketView[],
) {
  return crops
    .map((crop) => {
      const season = resolveSeason(crop, state, region, month);
      const reported = reportedMarkets(crop, markets);
      const signals: Signals = {
        A: season.active === undefined ? undefined : Number(season.active),
        M: reported.length ? 1 : undefined,
      };
      return { crop, season, signals, reported, score: rank(signals) };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.crop.name.localeCompare(b.crop.name));
}
