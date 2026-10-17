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

export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export function bboxOf(geometry: unknown): BBox {
  const b: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x);
      b[3] = Math.max(b[3], y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk((geometry as { coordinates?: unknown } | null)?.coordinates);
  return b;
}

/** Flags markets that sit in a low-income or low-access tract. Tract boxes are bucketed on a 1° grid. */
export function addTracts(markets: Market[], tracts?: FeatureCollection): number {
  if (!tracts) return 0;
  const boxes = tracts.features.map((f) => bboxOf(f.geometry));
  const grid = new Map<string, number[]>();
  boxes.forEach((b, i) => {
    for (let x = Math.floor(b[0]); x <= Math.floor(b[2]); x++)
      for (let y = Math.floor(b[1]); y <= Math.floor(b[3]); y++) {
        const k = `${x}:${y}`;
        const list = grid.get(k);
        if (list) list.push(i);
        else grid.set(k, [i]);
      }
  });
  let hits = 0;
  for (const m of markets) {
    const { lng, lat } = m.geo;
    const pt = point([lng, lat]);
    const idx = (grid.get(`${Math.floor(lng)}:${Math.floor(lat)}`) ?? []).find((i) => {
      const b = boxes[i];
      if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) return false;
      return booleanPointInPolygon(pt, tracts.features[i].geometry as never);
    });
    if (idx === undefined) continue;
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
