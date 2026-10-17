import { fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import type { FetchResult, SourceMarket } from '../lib/types';
import type { ProgramId } from '../../src/types';
import { arcgisQuery, type FeatureCollection } from './arcgis';

// MDAR's farmers market database, published by MassGIS. Two services carry it:
// the statewide MassGIS map service, and the Additional_Resources feature service named in the
// build plan (a regional export). Both share MDAR's MARKET_ID; dedupe merges the overlap.
export const MASSGIS_LAYERS = [
  {
    id: 'massgis-dph',
    name: "MassGIS / MDAR Farmers' Markets (statewide)",
    url: 'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/DPH/DPH_Farmers_Markets/MapServer/0',
  },
  {
    id: 'massgis-additional',
    name: "MassGIS Additional Resources — Farmers' Markets export",
    url: 'https://services1.arcgis.com/ceiitspzDAHrdGO1/ArcGIS/rest/services/Additional_Resources/FeatureServer/35',
  },
];

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function massgisToMarkets(
  fc: FeatureCollection,
  layer: (typeof MASSGIS_LAYERS)[number],
  fetchedAt: string,
): SourceMarket[] {
  return fc.features.map((f) => {
    const p = f.properties;
    const programs: ProgramId[] = [];
    if (str(p.EBT)?.toLowerCase().includes('accepted') || str(p.SNAP)?.toLowerCase() === 'yes')
      programs.push('snap');
    if (str(p.HIP)?.toUpperCase() === 'HIP') programs.push('hip');
    if (str(p.COUPONS)?.toLowerCase().includes('wic')) programs.push('wic_fmnp');
    if (str(p.COUPONS)?.toLowerCase().includes('senior')) programs.push('sfmnp');
    if (str(p.WIC_CVV)?.toLowerCase() === 'yes') programs.push('wic_cvb');
    const yy = str(p.UPDATE_DAT);
    const coords = f.geometry?.type === 'Point' ? (f.geometry.coordinates as [number, number]) : undefined;
    return {
      source: layer.id,
      sourceName: layer.name,
      sourceId: String(p.MARKET_ID ?? p.OBJECTID),
      sourceUrl: 'https://www.mass.gov/info-details/massgis-data-farmers-markets',
      fetchedAt,
      name: str(p.NAME) ?? 'Farmers Market',
      street: str(p.ADDR_1),
      locationNote: str(p.ADDR_2),
      city: str(p.TOWN) ?? '',
      state: 'MA',
      zip: str(p.ZIP_CODE),
      lat: typeof p.LATITUDE === 'number' ? p.LATITUDE : coords?.[1],
      lng: typeof p.LONGITUDE === 'number' ? p.LONGITUDE : coords?.[0],
      dayTimeRaw: str(p.DAY_TIME),
      seasonRaw: str(p.DATES),
      winter: str(p.TYPE)?.toLowerCase().includes('winter') ?? false,
      website: str(p.WEBSITE),
      programs,
      paymentMethods: [],
      products: [],
      lastUpdated: yy && /^\d{2}$/.test(yy) ? `20${yy}` : fetchedAt,
    };
  });
}

export async function fetchMassgis(): Promise<FetchResult[]> {
  const out: FetchResult[] = [];
  for (const layer of MASSGIS_LAYERS) {
    try {
      const r = await fetchWithSnapshot(
        layer.id,
        'geojson',
        () => arcgisQuery(layer.url, { orderByFields: 'OBJECTID' }),
        (b) => JSON.parse(b) as FeatureCollection,
      );
      const markets = massgisToMarkets(r.data, layer, r.fetchedAt);
      log(layer.id, `${markets.length} markets (${r.status})`);
      out.push({
        markets,
        meta: {
          id: layer.id,
          name: layer.name,
          url: layer.url,
          license: 'MassGIS data: free to use with attribution (MassGIS / MDAR)',
          fetchedAt: r.fetchedAt,
          records: markets.length,
          status: r.status,
          note: r.note,
        },
      });
    } catch (err) {
      log(layer.id, `FAILED: ${(err as Error).message}`);
      out.push({
        meta: {
          id: layer.id,
          name: layer.name,
          url: layer.url,
          license: 'MassGIS',
          fetchedAt: null,
          records: 0,
          status: 'failed',
          note: (err as Error).message,
        },
      });
    }
  }
  return out;
}
