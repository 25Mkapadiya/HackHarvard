import { fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import { isMainland, STATE_ABBR } from '../lib/states';
import type { SourceMeta } from '../../src/types';
import { arcgisQuery, type FeatureCollection } from './arcgis';

// USDA ERS Food Access Research Atlas (2025 release, "SNAP Retailer Access Map" measures),
// served with 2020 census-tract polygons, so no separate boundary join is needed.
// Low income and/or low access at 1 mile (urban) / 10 miles (rural). We fetch only tracts
// that are low income or low access — those are all the map shades and all a market can be flagged by.
const ID = 'ers-fara-2025';
const NAME = 'USDA ERS Food Access Research Atlas 2025 (low-income / low-access tracts)';
const URL = 'https://gisportal.ers.usda.gov/server/rest/services/FARA/FARA_2025_StraightLine/MapServer/4';
const CONCURRENCY = 4;

export type TractProps = {
  geoid: string;
  state: string;
  lowIncome: boolean;
  lowAccess: boolean;
  lila: boolean;
};

async function fetchState(name: string): Promise<FeatureCollection> {
  const body = await arcgisQuery(
    URL,
    {
      where: `State='${name}' AND (LowIncomeTracts=1 OR SD_SRAM_LA1and10=1)`,
      outFields: 'CensusTract20,LowIncomeTracts,SD_SRAM_LA1and10,SD_SRAM_LILATracts_1And10',
      maxAllowableOffset: '0.0015', // ~150 m simplification keeps the national set to a few MB gzipped
      geometryPrecision: '4',
      orderByFields: 'OBJECTID',
    },
    2000,
  );
  return JSON.parse(body) as FeatureCollection;
}

/** Fetches every mainland state, a few at a time, into one FeatureCollection. */
async function fetchAll(): Promise<string> {
  const states = Object.entries(STATE_ABBR).filter(([, code]) => isMainland(code));
  const features: FeatureCollection['features'] = [];
  for (let i = 0; i < states.length; i += CONCURRENCY) {
    const batch = states.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(([name]) => fetchState(name)));
    results.forEach((fc, j) => {
      const code = batch[j][1];
      // Every state has some; an empty answer means the server dropped the query. Fail before the snapshot is replaced.
      if (fc.features.length === 0) throw new Error(`no tracts returned for ${batch[j][0]}`);
      for (const f of fc.features) {
        const p = f.properties as Record<string, number | string | null>;
        const props: TractProps = {
          geoid: String(p.CensusTract20),
          state: code,
          lowIncome: p.LowIncomeTracts === 1,
          lowAccess: p.SD_SRAM_LA1and10 === 1,
          lila: p.SD_SRAM_LILATracts_1And10 === 1,
        };
        features.push({ ...f, properties: props });
      }
    });
  }
  return JSON.stringify({ type: 'FeatureCollection', features });
}

export async function fetchErsTracts(): Promise<{ meta: SourceMeta; tracts?: FeatureCollection }> {
  const meta = {
    id: ID,
    name: NAME,
    url: 'https://www.ers.usda.gov/data-products/food-access-research-atlas/',
    license: 'U.S. Government work (public domain)',
  };
  try {
    const r = await fetchWithSnapshot(ID, 'geojson.gz', fetchAll, (b) => JSON.parse(b) as FeatureCollection);
    const states = new Set(r.data.features.map((f) => (f.properties as TractProps).state));
    log(
      ID,
      `${r.data.features.length} low-income or low-access tracts in ${states.size} states (${r.status})`,
    );
    return {
      tracts: r.data,
      meta: {
        ...meta,
        fetchedAt: r.fetchedAt,
        records: r.data.features.length,
        status: r.status,
        note: r.note,
      },
    };
  } catch (err) {
    log(ID, `FAILED: ${(err as Error).message}`);
    return { meta: { ...meta, fetchedAt: null, records: 0, status: 'failed', note: (err as Error).message } };
  }
}
