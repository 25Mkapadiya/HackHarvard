import type { MarketType, ProgramId, ProductCategoryId, PaymentMethodId, SourceMeta } from '../../src/types';

/** A market record from one source, before normalization and dedupe. */
export type SourceMarket = {
  source: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  name: string;
  /** Defaults to farmers_market. */
  type?: MarketType;
  street?: string;
  locationNote?: string;
  city: string;
  county?: string;
  state: string;
  zip?: string;
  lat?: number;
  lng?: number;
  dayTimeRaw?: string;
  seasonRaw?: string;
  /** USDA directory format: up to four seasons with dates and per-day hours. */
  usdaSeasons?: { date?: string; time?: string }[];
  winter?: boolean;
  website?: string;
  programs: ProgramId[];
  paymentMethods: PaymentMethodId[];
  products: ProductCategoryId[];
  /** ISO date or a bare year when the source only gives a year. */
  lastUpdated: string;
  /** Records that only confirm attributes of other markets (e.g. SNAP retailer list) are never added on their own. */
  confirmOnly?: boolean;
};

export type FetchResult = { meta: SourceMeta; markets?: SourceMarket[] };
