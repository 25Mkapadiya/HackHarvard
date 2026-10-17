import type { MarketSchedule, PracticeId, Unit } from '../../types';

// The data-access contract shared by DemoStore (localStorage) and SupabaseStore.
// UI code only talks to this interface, so switching VITE_BACKEND doesn't touch components.

export type VendorProductPatch = { inStock?: boolean; price?: { amount: number; unit: Unit }; name?: string };
export type VendorPatch = {
  products?: Record<string, VendorProductPatch>;
  addedProducts?: { id: string; name: string; category: string; price: number; unit: Unit }[];
  marketIds?: string[];
  practices?: { id: PracticeId; selfReported: boolean }[];
  updatedAt?: string;
};

export type Closure = { date: string; note: string };
export type MarketOverride = { closures?: Closure[]; schedules?: MarketSchedule[]; updatedAt?: string };

export type Surplus = {
  id: string;
  vendorId: string;
  marketId: string;
  item: string;
  quantity: string;
  price?: number;
  donate: boolean;
  postedAt: string;
};

export type CheckIn = { marketId: string; date: string; points: number; at: string };

export type Prefs = {
  /** Opt-in only. Never set unless the user ticks the box. */
  rememberBenefits?: boolean;
  householdSize?: number;
  programs?: string[];
  home?: { lat: number; lng: number; label: string };
};

export type Application = {
  id: string;
  marketId: string;
  vendorName: string;
  products: string;
  status: 'pending' | 'approved' | 'declined';
};

export type StoreState = {
  vendorPatches: Record<string, VendorPatch>;
  marketOverrides: Record<string, MarketOverride>;
  surplus: Surplus[];
  checkins: CheckIn[];
  prefs: Prefs;
  applications: Application[];
};

export type CheckInResult = { ok: true; points: number } | { ok: false; reason: 'already' | 'bad_token' };

export interface Store {
  readonly mode: 'demo' | 'supabase';
  load(): Promise<StoreState>;
  saveVendorPatch(vendorId: string, patch: VendorPatch): Promise<void>;
  saveMarketOverride(marketId: string, override: MarketOverride): Promise<void>;
  postSurplus(s: Omit<Surplus, 'id' | 'postedAt'>): Promise<void>;
  removeSurplus(id: string): Promise<void>;
  checkIn(marketId: string, dayToken: string, today: string): Promise<CheckInResult>;
  savePrefs(prefs: Prefs): Promise<void>;
  setApplicationStatus(id: string, status: Application['status']): Promise<void>;
  clearAll(): Promise<void>;
  subscribe(fn: () => void): () => void;
}
