import { useEffect, useMemo, useState } from 'react';
import type {
  CropCalendar,
  Market,
  MarketSummary,
  Meta,
  Price,
  Program,
  Vendor,
  VendorProduct,
} from '../types';
import type { MarketView } from '../lib/filters';
import { sustainabilityScore } from '../lib/score';
import { dataUrl } from './config';
import { useStoreState } from './context';
import type { StoreState } from '../lib/store';

// Static JSON loading with a module-level cache, plus helpers that layer the user's demo-mode
// edits (vendor portal, manager closures) on top of the published data.

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(dataUrl(path)).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path) as Promise<T>;
}

export type Async<T> = { data?: T; error?: Error; loading: boolean; retry: () => void };

export function useJson<T>(path: string | null): Async<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; path?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    loadJson<T>(path).then(
      (data) => live && setState({ data, path }),
      (error: Error) => live && setState({ error, path }),
    );
    return () => {
      live = false;
    };
  }, [path, attempt]);
  const current = state.path === path;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: !!path && (!current || (!state.data && !state.error)),
    retry: () => setAttempt((a) => a + 1),
  };
}

type MarketsGeo = { features: { geometry: { coordinates: [number, number] }; properties: MarketSummary }[] };

export function applyMarketOverride<T extends Pick<MarketSummary, 'schedules' | 'id'>>(m: T, s: StoreState) {
  const o = s.marketOverrides[m.id];
  return { ...m, schedules: o?.schedules ?? m.schedules, closures: (o?.closures ?? []).map((c) => c.date) };
}

export function useMarkets(): Async<MarketView[]> {
  const res = useJson<MarketsGeo>('markets.geojson');
  const store = useStoreState();
  const data = useMemo(
    () =>
      res.data?.features.map((f) =>
        applyMarketOverride(
          { ...f.properties, geo: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } },
          store,
        ),
      ),
    [res.data, store],
  );
  return { ...res, data };
}

export function useMarket(
  id: string | undefined,
): Async<Market & { closures: string[]; closureNotes: Record<string, string> }> {
  const res = useJson<Market>(id ? `markets/${id}.json` : null);
  const store = useStoreState();
  const data = useMemo(() => {
    if (!res.data) return undefined;
    const notes = Object.fromEntries(
      (store.marketOverrides[res.data.id]?.closures ?? []).map((c) => [c.date, c.note]),
    );
    return { ...applyMarketOverride(res.data, store), closureNotes: notes };
  }, [res.data, store]);
  return { ...res, data };
}

export type VendorView = Vendor & { prices: Record<string, Price> };

export function applyVendorPatch(v: Vendor, prices: Price[], s: StoreState): VendorView {
  const patch = s.vendorPatches[v.id];
  const priceMap: Record<string, Price> = Object.fromEntries(
    prices.filter((p) => p.vendorProductId.startsWith(`${v.id}-`)).map((p) => [p.vendorProductId, p]),
  );
  if (!patch) return { ...v, prices: priceMap };
  const products: VendorProduct[] = v.products.map((p) => {
    const pp = patch.products?.[p.id];
    if (pp?.price)
      priceMap[p.id] = {
        vendorProductId: p.id,
        ...pp.price,
        observedAt: patch.updatedAt ?? '',
        source: 'vendor',
      };
    return pp ? { ...p, inStock: pp.inStock ?? p.inStock, name: pp.name ?? p.name } : p;
  });
  for (const a of patch.addedProducts ?? []) {
    products.push({
      id: a.id,
      name: a.name,
      category: a.category as VendorProduct['category'],
      attributes: [],
      inStock: true,
    });
    priceMap[a.id] = {
      vendorProductId: a.id,
      amount: a.price,
      unit: a.unit,
      observedAt: patch.updatedAt ?? '',
      source: 'vendor',
    };
  }
  const next = {
    ...v,
    products,
    marketIds: patch.marketIds ?? v.marketIds,
    practices: patch.practices ?? v.practices,
  };
  return { ...next, sustainabilityScore: sustainabilityScore(next), prices: priceMap };
}

export function useVendors(): Async<VendorView[]> {
  const vendors = useJson<Vendor[]>('vendors.json');
  const prices = useJson<Price[]>('prices.json');
  const store = useStoreState();
  const data = useMemo(
    () =>
      vendors.data && prices.data
        ? vendors.data.map((v) => applyVendorPatch(v, prices.data!, store))
        : undefined,
    [vendors.data, prices.data, store],
  );
  return {
    data,
    error: vendors.error ?? prices.error,
    loading: vendors.loading || prices.loading,
    retry: () => (vendors.retry(), prices.retry()),
  };
}

export const usePrograms = () => useJson<Program[]>('programs.json');
export const useCrops = () => useJson<CropCalendar>('crop-calendar.json');
export const useMeta = () => useJson<Meta>('meta.json');
export type EmissionFactors = {
  truckKgCO2ePerTonMile: number;
  conventionalProduceMiles: number;
  basketLbsPerVisit: number;
  basketDollarsPerVisit: number;
  source: string;
  sourceUrl: string;
  conventionalProduceMilesSource: string;
};
export const useEmissionFactors = () => useJson<EmissionFactors>('emission-factors.json');
