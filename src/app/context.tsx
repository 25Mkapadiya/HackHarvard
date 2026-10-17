import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store, type StoreState } from '../lib/store';
import { fromZonedTime } from 'date-fns-tz';
import { BOSTON, type LatLng } from '../lib/geo';
import { TZ } from '../lib/schedule/occurs';

const EMPTY: StoreState = {
  vendorPatches: {},
  marketOverrides: {},
  surplus: [],
  checkins: [],
  prefs: {},
  applications: [],
};
const StoreCtx = createContext<StoreState>(EMPTY);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(EMPTY);
  useEffect(() => {
    const load = () => store.load().then(setState);
    load();
    return store.subscribe(load);
  }, []);
  return <StoreCtx.Provider value={state}>{children}</StoreCtx.Provider>;
}

export const useStoreState = () => useContext(StoreCtx);

// "Now", overridable with ?now=2026-07-11T10:00 (Boston time) for demos and tests.
function readNowOverride(): Date | null {
  const q = window.location.hash.split('?')[1] ?? window.location.search.slice(1);
  const v = new URLSearchParams(q).get('now');
  if (!v) return null;
  const d = /[zZ]|[+-]\d\d:?\d\d$/.test(v)
    ? new Date(v)
    : fromZonedTime(v.length <= 10 ? `${v}T12:00` : v, TZ);
  return Number.isNaN(d.getTime()) ? null : d;
}

const NowCtx = createContext<{ now: Date; simulated: boolean }>({ now: new Date(), simulated: false });

export function NowProvider({ children }: { children: ReactNode }) {
  const [override] = useState(readNowOverride);
  const [now, setNow] = useState(() => override ?? new Date());
  useEffect(() => {
    if (override) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [override]);
  return <NowCtx.Provider value={{ now, simulated: !!override }}>{children}</NowCtx.Provider>;
}

export const useNow = () => useContext(NowCtx);

type LocationState = {
  origin: LatLng;
  label: string | null;
  isDefault: boolean;
  set: (g: LatLng, label: string) => void;
};
const LocationCtx = createContext<LocationState>({
  origin: BOSTON,
  label: null,
  isDefault: true,
  set: () => {},
});

const LOC_KEY = 'market-day-location';
export function LocationProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<{ origin: LatLng; label: string | null; isDefault: boolean }>(() => {
    try {
      const raw = sessionStorage.getItem(LOC_KEY);
      if (raw) return { ...JSON.parse(raw), isDefault: false };
    } catch {
      /* ignore */
    }
    return { origin: BOSTON, label: null, isDefault: true };
  });
  const set = useCallback((origin: LatLng, label: string) => {
    setLoc({ origin, label, isDefault: false });
    // Session only: location isn't kept after the tab closes.
    try {
      sessionStorage.setItem(LOC_KEY, JSON.stringify({ origin, label }));
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo(() => ({ ...loc, set }), [loc, set]);
  return <LocationCtx.Provider value={value}>{children}</LocationCtx.Provider>;
}

export const useLocationState = () => useContext(LocationCtx);
