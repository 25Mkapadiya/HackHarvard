import { fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import type { FetchResult, SourceMarket } from '../lib/types';
import { arcgisQuery, type FeatureCollection } from './arcgis';
import { isMainland } from '../lib/states';

// USDA FNS SNAP retailer locations. We keep only "Farmers and Markets" on the mainland and use them to
// confirm SNAP acceptance on markets they match (within 150 m, similar name). They are
// confirm-only: many are individual farms, so they aren't added as markets on their own.
const ID = 'usda-snap-retailers';
const NAME = 'USDA FNS SNAP Retailer Locator (Farmers and Markets)';
const URL =
  'https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0';

export async function fetchSnapRetailers(): Promise<FetchResult> {
  try {
    const r = await fetchWithSnapshot(
      ID,
      'geojson',
      () =>
        arcgisQuery(URL, {
          where: "Store_Type='Farmers and Markets'",
          outFields:
            'Record_ID,Store_Name,Store_Street_Address,Additonal_Address,City,State,Zip_Code,County,Latitude,Longitude',
          orderByFields: 'ObjectId',
          returnGeometry: 'false',
        }),
      (b) => JSON.parse(b) as FeatureCollection,
    );
    const markets: SourceMarket[] = r.data.features
      .filter((f) => isMainland(String((f.properties as Record<string, unknown>).State ?? '')))
      .map((f) => {
        const p = f.properties as Record<string, string | number | null>;
        return {
          source: ID,
          sourceName: NAME,
          sourceId: String(p.Record_ID),
          sourceUrl: 'https://www.fns.usda.gov/snap/retailer-locator',
          fetchedAt: r.fetchedAt,
          name: String(p.Store_Name ?? ''),
          street: [p.Store_Street_Address, p.Additonal_Address].filter(Boolean).join(' '),
          city: String(p.City ?? ''),
          county: p.County ? String(p.County) : undefined,
          state: String(p.State),
          zip: p.Zip_Code ? String(p.Zip_Code) : undefined,
          lat: Number(p.Latitude),
          lng: Number(p.Longitude),
          programs: ['snap'],
          paymentMethods: [],
          products: [],
          lastUpdated: r.fetchedAt,
          confirmOnly: true,
        };
      });
    log(ID, `${markets.length} SNAP-authorized farmers/markets on the mainland (${r.status})`);
    return {
      markets,
      meta: {
        id: ID,
        name: NAME,
        url: URL,
        license: 'U.S. Government work (public domain)',
        fetchedAt: r.fetchedAt,
        records: markets.length,
        status: r.status,
        note: r.note,
      },
    };
  } catch (err) {
    log(ID, `FAILED: ${(err as Error).message}`);
    return {
      meta: {
        id: ID,
        name: NAME,
        url: URL,
        license: 'Public domain',
        fetchedAt: null,
        records: 0,
        status: 'failed',
        note: (err as Error).message,
      },
    };
  }
}
