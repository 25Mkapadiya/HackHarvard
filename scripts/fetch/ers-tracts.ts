import { fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import type { SourceMeta } from '../../src/types';
import { arcgisQuery, type FeatureCollection } from './arcgis';

// USDA ERS Food Access Research Atlas (2025 release, "SNAP Retailer Access Map" measures),
// served with 2020 census-tract polygons, so no separate boundary join is needed.
// Low income and low access at 1 mile (urban) / 10 miles (rural).
const ID = 'ers-fara-2025';
const NAME = 'USDA ERS Food Access Research Atlas 2025 (low-income / low-access tracts, MA)';
const URL = 'https://gisportal.ers.usda.gov/server/rest/services/FARA/FARA_2025_StraightLine/MapServer/4';

export type TractProps = {
  geoid: string;
  lowIncome: boolean;
  lowAccess: boolean;
  lila: boolean;
  pop: number;
  medianFamilyIncome: number | null;
  urban: boolean;
};

export async function fetchErsTracts(): Promise<{ meta: SourceMeta; tracts?: FeatureCollection }> {
  try {
    const r = await fetchWithSnapshot(
      ID,
      'geojson',
      () =>
        arcgisQuery(
          URL,
          {
            where: "State='Massachusetts'",
            outFields:
              'CensusTract20,LowIncomeTracts,SD_SRAM_LA1and10,SD_SRAM_LILATracts_1And10,POP2020,MedianFamilyIncome,Urban',
            maxAllowableOffset: '0.0008', // ~80 m simplification keeps the file under 1.5 MB
            geometryPrecision: '5',
          },
          2000,
        ),
      (b) => JSON.parse(b) as FeatureCollection,
    );
    const tracts: FeatureCollection = {
      type: 'FeatureCollection',
      features: r.data.features.map((f) => {
        const p = f.properties as Record<string, number | string | null>;
        const props: TractProps = {
          geoid: String(p.CensusTract20),
          lowIncome: p.LowIncomeTracts === 1,
          lowAccess: p.SD_SRAM_LA1and10 === 1,
          lila: p.SD_SRAM_LILATracts_1And10 === 1,
          pop: Number(p.POP2020 ?? 0),
          medianFamilyIncome: p.MedianFamilyIncome == null ? null : Number(p.MedianFamilyIncome),
          urban: p.Urban === 1,
        };
        return { ...f, properties: props };
      }),
    };
    log(ID, `${tracts.features.length} tracts (${r.status})`);
    return {
      tracts,
      meta: {
        id: ID,
        name: NAME,
        url: 'https://www.ers.usda.gov/data-products/food-access-research-atlas/',
        license: 'U.S. Government work (public domain)',
        fetchedAt: r.fetchedAt,
        records: tracts.features.length,
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
