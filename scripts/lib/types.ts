import type { ProgramId, ProductCategoryId, PaymentMethodId, SourceMeta } from '../../src/types';

/** A market record from one source, before normalization and dedupe. */
export type SourceMarket = {
  source: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  name: string;
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
