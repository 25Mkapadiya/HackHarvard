// Shared by the pipeline (which builds the index) and the app (which loads it).
// MiniSearch.loadJSON needs exactly the options the index was built with.
export const SEARCH_OPTIONS = {
  fields: ['name', 'city', 'text'],
  storeFields: ['kind', 'name', 'city', 'ref', 'category'],
  searchOptions: { boost: { name: 3, city: 1.5 }, prefix: true, fuzzy: 0.2 },
};

export type SearchDoc = {
  id: string;
  kind: 'market' | 'vendor' | 'crop' | 'category';
  name: string;
  city?: string;
  text: string;
  /** Market id, vendor id, crop id or category id. */
  ref: string;
  category?: string;
};
