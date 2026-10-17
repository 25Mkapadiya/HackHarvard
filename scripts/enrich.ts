import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Market, Vendor } from '../src/types';
import { sustainabilityScore } from '../src/lib/score';
import { metersBetween } from './dedupe';
import type { TractProps } from './fetch/ers-tracts';
import type { FeatureCollection } from './fetch/arcgis';

export const BOSTON_CITY_HALL = { lat: 42.3603, lng: -71.058 };
/** "Greater Boston" for the MVP: markets within 25 km of City Hall get sample vendors. */
export const GREATER_BOSTON_KM = 25;

export const inGreaterBoston = (g: { lat: number; lng: number }) =>
  metersBetween(g, BOSTON_CITY_HALL) <= GREATER_BOSTON_KM * 1000;

export function addTracts(markets: Market[], tracts?: FeatureCollection): number {
  if (!tracts) return 0;
  // Pre-compute bounding boxes so we don't run point-in-polygon against every tract.
  const boxes = tracts.features.map((f) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number') {
        const [x, y] = c as number[];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      } else if (Array.isArray(c)) c.forEach(walk);
    };
    walk(f.geometry?.coordinates);
    return { minX, minY, maxX, maxY };
  });
  let hits = 0;
  for (const m of markets) {
    const pt = point([m.geo.lng, m.geo.lat]);
    const idx = tracts.features.findIndex((f, i) => {
      const b = boxes[i];
      if (m.geo.lng < b.minX || m.geo.lng > b.maxX || m.geo.lat < b.minY || m.geo.lat > b.maxY) return false;
      return booleanPointInPolygon(pt, f.geometry as never);
    });
    if (idx < 0) continue;
    const p = tracts.features[idx].properties as unknown as TractProps;
    m.tract = { geoid: p.geoid, lowIncome: p.lowIncome, lowAccess: p.lowAccess };
    hits++;
  }
  return hits;
}

/** Small deterministic hash so vendor assignment is stable across pipeline runs. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type SeedVendor = Omit<Vendor, 'marketIds' | 'foodMiles' | 'sustainabilityScore' | 'isSample'>;

/**
 * Assigns SAMPLE vendors to Greater Boston markets (3–6 per market) and fills in each
 * market's products from them. Markets outside Greater Boston keep no vendors.
 */
export function assignSampleVendors(markets: Market[], seeds: SeedVendor[]): Vendor[] {
  const vendors: Vendor[] = seeds.map((s) => ({
    ...s,
    marketIds: [],
    sustainabilityScore: 0,
    isSample: true,
  }));
  for (const m of markets) {
    if (!inGreaterBoston(m.geo)) continue;
    const n = 3 + (hash(m.id) % 4);
    const ranked = [...vendors].sort((a, b) => hash(m.id + a.id) - hash(m.id + b.id));
    const picked = ranked.slice(0, n);
    m.vendorIds = picked.map((v) => v.id).sort();
    for (const v of picked) v.marketIds.push(m.id);
    if (m.products.length === 0) {
      m.products = [...new Set(picked.flatMap((v) => v.products.map((p) => p.category)))].sort();
      m.productsAreSample = true;
    }
    if (m.paymentMethods.length === 0) {
      m.paymentMethods = [...new Set(picked.flatMap((v) => v.paymentMethods))].sort();
      m.paymentsAreSample = true;
    }
  }
  const byId = new Map(markets.map((m) => [m.id, m]));
  for (const v of vendors) {
    v.marketIds.sort();
    if (v.farmGeo && v.marketIds.length) {
      const miles = v.marketIds.map((id) => metersBetween(v.farmGeo!, byId.get(id)!.geo) / 1609.34);
      v.foodMiles = Math.round((miles.reduce((a, b) => a + b, 0) / miles.length) * 10) / 10;
    }
    v.sustainabilityScore = sustainabilityScore(v);
  }
  return vendors;
}
