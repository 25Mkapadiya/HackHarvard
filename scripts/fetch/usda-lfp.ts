import { fetchWithSnapshot } from '../lib/http';
import { log, readJson } from '../lib/io';
import type { FetchResult, SourceMarket } from '../lib/types';
import type { PaymentMethodId, ProductCategoryId, ProgramId } from '../../src/types';

// USDA AMS Local Food Directories (usdalocalfoodportal.com). The portal's data-sharing API
// needs a free key (USDA_LFP_API_KEY). Directory slugs per the portal's API docs.
const DIRECTORIES = [
  { slug: 'farmersmarket', type: 'farmers_market' },
  { slug: 'csa', type: 'csa' },
  { slug: 'onfarmmarket', type: 'on_farm' },
  { slug: 'foodhub', type: 'food_hub' },
] as const;
const ID = 'usda-lfp';
const NAME = 'USDA AMS Local Food Directories';
const URL = 'https://www.usdalocalfoodportal.com';

const taxonomy = readJson<{ map: Record<string, ProductCategoryId> }>(
  'data/manual/product-taxonomy.json',
).map;

function mapList<T extends string>(text: unknown, table: Record<string, T>): T[] {
  if (typeof text !== 'string') return [];
  const out = new Set<T>();
  for (const part of text
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    const hit = table[part] ?? Object.entries(table).find(([k]) => part.includes(k))?.[1];
    if (hit) out.add(hit);
  }
  return [...out];
}

const PAYMENTS: Record<string, PaymentMethodId> = {
  cash: 'cash',
  credit: 'credit',
  debit: 'credit',
  check: 'check',
  mobile: 'mobile',
  venmo: 'mobile',
  token: 'tokens',
};
const PROGRAMS: Record<string, ProgramId> = {
  snap: 'snap',
  wic: 'wic_fmnp',
  senior: 'sfmnp',
  sfmnp: 'sfmnp',
  'double up': 'double_up',
};

type Row = Record<string, unknown>;

export function lfpToMarkets(rows: Row[], fetchedAt: string): SourceMarket[] {
  return rows.map((r) => ({
    source: ID,
    sourceName: NAME,
    sourceId: String(r.listing_id ?? r.listingid ?? r.id),
    sourceUrl: URL,
    fetchedAt,
    name: String(r.listing_name ?? ''),
    street: String(r.location_address ?? '') || undefined,
    city: String(r.location_city ?? '') || '',
    state: String(r.location_state ?? 'MA'),
    zip: r.location_zipcode ? String(r.location_zipcode) : undefined,
    lat: r.location_y ? Number(r.location_y) : undefined,
    lng: r.location_x ? Number(r.location_x) : undefined,
    dayTimeRaw: typeof r.season1time === 'string' ? r.season1time : undefined,
    seasonRaw: typeof r.season1date === 'string' ? r.season1date : undefined,
    website: typeof r.media_website === 'string' ? r.media_website : undefined,
    programs: mapList(r.FNAP, PROGRAMS),
    paymentMethods: mapList(r.acceptedpayment, PAYMENTS),
    products: mapList(r.products, taxonomy),
    lastUpdated: String(r.updatetime ?? fetchedAt).slice(0, 10),
  }));
}

export async function fetchUsdaLfp(): Promise<FetchResult> {
  const key = process.env.USDA_LFP_API_KEY;
  if (!key) {
    log(
      ID,
      'skipped: USDA_LFP_API_KEY is not set. Get a free key at https://www.usdalocalfoodportal.com/fe/datasharing/',
    );
    return {
      meta: {
        id: ID,
        name: NAME,
        url: URL,
        license: 'U.S. Government work (public domain)',
        fetchedAt: null,
        records: 0,
        status: 'skipped',
        note: 'USDA_LFP_API_KEY not set',
      },
    };
  }
  try {
    const all: SourceMarket[] = [];
    let fetchedAt = '';
    for (const dir of DIRECTORIES) {
      const r = await fetchWithSnapshot(
        `${ID}-${dir.slug}`,
        'json',
        async () => {
          const { fetchText } = await import('../lib/http');
          return fetchText(`${URL}/api/${dir.slug}/?apikey=${encodeURIComponent(key)}&state=MA`);
        },
        (b) => {
          const j = JSON.parse(b);
          return (Array.isArray(j) ? j : (j.data ?? [])) as Row[];
        },
      );
      fetchedAt = r.fetchedAt;
      // Farmers markets only for the MVP map; other directories are kept for later phases.
      if (dir.slug === 'farmersmarket') all.push(...lfpToMarkets(r.data, r.fetchedAt));
    }
    log(ID, `${all.length} farmers markets`);
    return {
      markets: all,
      meta: {
        id: ID,
        name: NAME,
        url: URL,
        license: 'Public domain',
        fetchedAt,
        records: all.length,
        status: 'ok',
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
