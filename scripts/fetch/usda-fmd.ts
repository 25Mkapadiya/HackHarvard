import { fetchWithSnapshot } from '../lib/http';
import { log, readJson } from '../lib/io';
import { inMainlandBox, isMainland, stateCode } from '../lib/states';
import type { FetchResult, SourceMarket } from '../lib/types';
import type { PaymentMethodId, ProductCategoryId, ProgramId } from '../../src/types';
import { arcgisQuery, type FeatureCollection } from './arcgis';

// USDA AMS National Farmers Market Directory, as published (and lightly curated) by Esri StoryMaps
// on ArcGIS Online. It is the last full public export of the directory — records were last updated
// 2009–2014 — so every market from it is flagged stale. It covers the whole country with schedules,
// products, payment methods and benefit flags; we keep the 48 contiguous states and DC.
const ID = 'usda-fmd';
const NAME = 'USDA National Farmers Market Directory (2014 export, via Esri StoryMaps)';
const URL =
  'https://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Farmers_Markets_update/FeatureServer/0';
const PRODUCT_COLUMNS = [
  'bakedgoods',
  'cheese',
  'crafts',
  'flowers',
  'eggs',
  'seafood',
  'herbs',
  'veggies',
  'honey',
  'jams',
  'maple',
  'meat',
  'nursery',
  'nuts',
  'plants',
  'poultry',
  'prepared',
  'soap',
  'trees',
  'wine',
  'coffee',
  'beans',
  'fruit',
  'grain',
  'juice',
  'mushrooms',
  'petfood',
  'tofu',
  'wildharv',
];

const taxonomy = readJson<{ map: Record<string, ProductCategoryId> }>(
  'data/manual/product-taxonomy.json',
).map;
const yes = (v: unknown) => typeof v === 'string' && v.trim().toUpperCase() === 'Y';
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** "3/31/14 20:18" → "2014-03-31"; "2009" → "2009". */
export function usdaUpdated(v: unknown): string {
  const s = str(v) ?? '';
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (d) {
    const y = d[3].length === 2 ? `20${d[3]}` : d[3];
    return `${y}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`;
  }
  const y = /\b(20\d\d)\b/.exec(s);
  return y ? y[1] : '2014';
}

export function usdaToMarkets(fc: FeatureCollection, fetchedAt: string): SourceMarket[] {
  const out: SourceMarket[] = [];
  for (const f of fc.features) {
    const p = f.properties;
    const state = stateCode(str(p.state));
    const lat = Number(p.y);
    const lng = Number(p.x);
    if (!isMainland(state) || !Number.isFinite(lat) || !Number.isFinite(lng) || !inMainlandBox(lat, lng))
      continue;
    // Program-wide placeholder rows ("Various Cities and Towns") aren't a place you can go.
    if (/^various\b/i.test(str(p.city) ?? '')) continue;
    const programs: ProgramId[] = [];
    if (yes(p.SNAP)) programs.push('snap');
    if (yes(p.WIC)) programs.push('wic_fmnp');
    if (yes(p.SFMNP)) programs.push('sfmnp');
    if (yes(p.WICcash)) programs.push('wic_cvb');
    const paymentMethods: PaymentMethodId[] = yes(p.credit) ? ['credit'] : [];
    const products = [
      ...new Set(
        PRODUCT_COLUMNS.filter((c) => yes(p[c]))
          .map((c) => taxonomy[c])
          .filter(Boolean),
      ),
    ];
    const seasons = [1, 2, 3, 4].map((i) => ({ date: str(p[`S${i}_date`]), time: str(p[`S${i}_time`]) }));
    out.push({
      source: ID,
      sourceName: NAME,
      sourceId: String(p.FMID),
      sourceUrl: 'https://www.ams.usda.gov/local-food-directories/farmersmarkets',
      fetchedAt,
      name: str(p.marketname) ?? 'Farmers Market',
      street: str(p.street),
      locationNote: str(p.location) === 'Other' ? undefined : str(p.location),
      city: str(p.city) ?? '',
      county: str(p.county),
      state: state!,
      zip: str(p.zip),
      lat,
      lng,
      usdaSeasons: seasons,
      website: str(p.website) ?? str(p.facebook),
      programs,
      paymentMethods,
      products,
      lastUpdated: usdaUpdated(p.updatedtim),
    });
  }
  return out;
}

export async function fetchUsdaFmd(): Promise<FetchResult> {
  const meta = {
    id: ID,
    name: NAME,
    url: URL,
    license: 'U.S. Government work (public domain); hosted by Esri',
  };
  try {
    const r = await fetchWithSnapshot(
      ID,
      'geojson',
      () =>
        arcgisQuery(URL, {
          orderByFields: 'OBJECTID',
          returnGeometry: 'false',
          outFields: [
            'FMID',
            'marketname',
            'website',
            'facebook',
            'street',
            'city',
            'county',
            'state',
            'zip',
            'x',
            'y',
            'location',
            'credit',
            'WIC',
            'WICcash',
            'SFMNP',
            'SNAP',
            'updatedtim',
            ...[1, 2, 3, 4].flatMap((i) => [`S${i}_date`, `S${i}_time`]),
            ...PRODUCT_COLUMNS,
          ].join(','),
        }),
      (b) => JSON.parse(b) as FeatureCollection,
    );
    const markets = usdaToMarkets(r.data, r.fetchedAt);
    log(ID, `${r.data.features.length} records, ${markets.length} on the mainland (${r.status})`);
    return {
      markets,
      meta: { ...meta, fetchedAt: r.fetchedAt, records: markets.length, status: r.status, note: r.note },
    };
  } catch (err) {
    log(ID, `FAILED: ${(err as Error).message}`);
    return { meta: { ...meta, fetchedAt: null, records: 0, status: 'failed', note: (err as Error).message } };
  }
}
