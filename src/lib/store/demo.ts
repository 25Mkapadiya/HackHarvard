import { checkToken } from './token';
import type { CheckInResult, Store, StoreState } from './types';

const KEY = 'market-day-demo-v1';
export const CHECKIN_POINTS = 10;

const SEED_APPLICATIONS: StoreState['applications'] = [
  {
    id: 'app-1',
    marketId: 'copley-square-boston',
    vendorName: 'Fern Gully Sprouts (sample)',
    products: 'Sprouts, microgreens',
    status: 'pending',
  },
  {
    id: 'app-2',
    marketId: 'copley-square-boston',
    vendorName: 'Back Bay Bagel Co. (sample)',
    products: 'Bagels, cream cheese',
    status: 'pending',
  },
  {
    id: 'app-3',
    marketId: 'central-square-cambridge',
    vendorName: 'Riverside Herb Garden (sample)',
    products: 'Herbs, seedlings',
    status: 'pending',
  },
];

const empty = (): StoreState => ({
  vendorPatches: {},
  marketOverrides: {},
  surplus: [],
  checkins: [],
  prefs: {},
  applications: SEED_APPLICATIONS,
});

// localStorage can throw (private mode, blocked storage). The demo still works in memory then.
let memory: StoreState | null = null;
function read(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch {
    /* fall through to memory */
  }
  return memory ?? empty();
}
function write(s: StoreState) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* memory only */
  }
}

export class DemoStore implements Store {
  readonly mode = 'demo' as const;
  private listeners = new Set<() => void>();

  private mutate(fn: (s: StoreState) => void) {
    const s = read();
    fn(s);
    write(s);
    this.listeners.forEach((l) => l());
  }

  async load() {
    return read();
  }
  async saveVendorPatch(vendorId: string, patch: StoreState['vendorPatches'][string]) {
    this.mutate((s) => {
      s.vendorPatches[vendorId] = {
        ...s.vendorPatches[vendorId],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    });
  }
  async saveMarketOverride(marketId: string, o: StoreState['marketOverrides'][string]) {
    this.mutate((s) => {
      s.marketOverrides[marketId] = {
        ...s.marketOverrides[marketId],
        ...o,
        updatedAt: new Date().toISOString(),
      };
    });
  }
  async postSurplus(item: Omit<StoreState['surplus'][number], 'id' | 'postedAt'>) {
    this.mutate((s) => {
      s.surplus.push({ ...item, id: `s-${Date.now().toString(36)}`, postedAt: new Date().toISOString() });
    });
  }
  async removeSurplus(id: string) {
    this.mutate((s) => {
      s.surplus = s.surplus.filter((x) => x.id !== id);
    });
  }
  async checkIn(marketId: string, token: string, today: string): Promise<CheckInResult> {
    if (!checkToken(marketId, today, token)) return { ok: false, reason: 'bad_token' };
    if (read().checkins.some((c) => c.marketId === marketId && c.date === today))
      return { ok: false, reason: 'already' };
    this.mutate((s) => {
      s.checkins.push({ marketId, date: today, points: CHECKIN_POINTS, at: new Date().toISOString() });
    });
    return { ok: true, points: CHECKIN_POINTS };
  }
  async savePrefs(prefs: StoreState['prefs']) {
    this.mutate((s) => {
      s.prefs = prefs.rememberBenefits ? { ...s.prefs, ...prefs } : { home: prefs.home ?? s.prefs.home };
    });
  }
  async setApplicationStatus(id: string, status: StoreState['applications'][number]['status']) {
    this.mutate((s) => {
      s.applications = s.applications.map((a) => (a.id === id ? { ...a, status } : a));
    });
  }
  async clearAll() {
    memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l());
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
