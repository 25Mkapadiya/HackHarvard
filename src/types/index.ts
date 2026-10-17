import { z } from 'zod';

// Shared by the build-time pipeline (scripts/) and the browser app (src/).
// Every file in public/data/ is validated against these schemas before it is written.

export const PRODUCT_CATEGORIES = [
  'fruits',
  'vegetables',
  'herbs',
  'meat',
  'poultry',
  'seafood',
  'eggs',
  'dairy',
  'cheese',
  'baked_goods',
  'honey',
  'maple_syrup',
  'preserves',
  'nuts',
  'grains',
  'beans',
  'mushrooms',
  'plant_protein',
  'prepared_foods',
  'coffee_tea',
  'beverages_alcohol',
  'juice',
  'flowers',
  'plants',
  'body_care',
  'crafts',
  'pet_food',
  'firewood',
] as const;
export const ProductCategoryId = z.enum(PRODUCT_CATEGORIES);
export type ProductCategoryId = z.infer<typeof ProductCategoryId>;

export const PAYMENT_METHODS = ['cash', 'credit', 'mobile', 'check', 'tokens'] as const;
export const PaymentMethodId = z.enum(PAYMENT_METHODS);
export type PaymentMethodId = z.infer<typeof PaymentMethodId>;

export const PROGRAMS = ['snap', 'hip', 'wic_fmnp', 'sfmnp', 'wic_cvb', 'double_up', 'city_coupon'] as const;
export const ProgramId = z.enum(PROGRAMS);
export type ProgramId = z.infer<typeof ProgramId>;

export const AMENITIES = [
  'restrooms',
  'seating',
  'parking',
  'bike_racks',
  'compost',
  'recycling',
  'bag_dropoff',
  'ada',
  'music',
  'kids',
] as const;
export const AmenityId = z.enum(AMENITIES);
export type AmenityId = z.infer<typeof AmenityId>;

export const MARKET_TYPES = ['farmers_market', 'farm_stand', 'csa', 'food_hub', 'on_farm'] as const;
export const MarketType = z.enum(MARKET_TYPES);
export type MarketType = z.infer<typeof MarketType>;

export const UNITS = [
  'lb',
  'each',
  'bunch',
  'dozen',
  'pint',
  'quart',
  'oz',
  'pint_jar',
  'loaf',
  'half_gallon',
] as const;
export const Unit = z.enum(UNITS);
export type Unit = z.infer<typeof Unit>;

/** Month-day, e.g. "06-14". Seasons repeat yearly; source data rarely gives a year. */
const MonthDay = z.string().regex(/^\d{2}-\d{2}$/);
/** Exception dates are either a yearly month-day ("07-04") or a specific date ("2026-10-18"). */
const ExceptionDate = z.string().regex(/^(\d{4}-)?\d{2}-\d{2}$/);
const HHMM = z.string().regex(/^\d{2}:\d{2}$/);

export const MarketSchedule = z.object({
  seasonStart: MonthDay.optional(),
  seasonEnd: MonthDay.optional(),
  /** RFC 5545 RRULE body without DTSTART, e.g. "FREQ=WEEKLY;BYDAY=SA". null = could not parse. */
  rrule: z.string().nullable(),
  openTime: HHMM.optional(),
  closeTime: HHMM.optional(),
  /** When set, the market meets only on these month-days (source gave an explicit date list). */
  dates: z.array(MonthDay).optional(),
  exceptions: z.array(z.object({ date: ExceptionDate, note: z.string() })).optional(),
  note: z.string().optional(),
});
export type MarketSchedule = z.infer<typeof MarketSchedule>;

export const SourceRef = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
  fetchedAt: z.string(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const Market = z.object({
  id: z.string(),
  name: z.string(),
  type: MarketType,
  address: z.object({
    street: z.string().optional(),
    city: z.string(),
    county: z.string().optional(),
    state: z.string(),
    zip: z.string().optional(),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }),
  locationType: z
    .enum(['park', 'parking_lot', 'church', 'school', 'farm', 'indoor_hall', 'other'])
    .optional(),
  locationNote: z.string().optional(),
  indoor: z.boolean().optional(),
  winter: z.boolean().optional(),
  schedules: z.array(MarketSchedule),
  scheduleRaw: z.string().optional(),
  scheduleParsed: z.boolean(),
  products: z.array(ProductCategoryId),
  /** True when `products` came only from sample vendor data, not from a public source. */
  productsAreSample: z.boolean(),
  paymentMethods: z.array(PaymentMethodId),
  /** True when `paymentMethods` came only from sample vendor data. */
  paymentsAreSample: z.boolean(),
  programs: z.array(ProgramId),
  amenities: z.array(AmenityId),
  accessibility: z.string().optional(),
  nearestTransit: z.object({ stopName: z.string(), meters: z.number(), mode: z.string() }).optional(),
  tract: z.object({ geoid: z.string(), lowIncome: z.boolean(), lowAccess: z.boolean() }).optional(),
  vendorIds: z.array(z.string()),
  website: z.string().optional(),
  social: z.array(z.string()).optional(),
  contact: z.object({ email: z.string().optional(), phone: z.string().optional() }).optional(),
  sources: z.array(SourceRef).min(1),
  lastUpdated: z.string(),
  stale: z.boolean(),
});
export type Market = z.infer<typeof Market>;

/** Slim properties carried in markets.geojson for the map and list. */
export const MarketSummary = Market.pick({
  id: true,
  name: true,
  type: true,
  schedules: true,
  scheduleParsed: true,
  scheduleRaw: true,
  products: true,
  productsAreSample: true,
  paymentMethods: true,
  paymentsAreSample: true,
  programs: true,
  winter: true,
  indoor: true,
  stale: true,
  lastUpdated: true,
  tract: true,
  vendorIds: true,
}).extend({ city: z.string(), sustainabilityMax: z.number() });
export type MarketSummary = z.infer<typeof MarketSummary>;

export const Certification = z.object({
  id: z.enum(['usda_organic', 'cng', 'animal_welfare_approved', 'regenerative_organic', 'other']),
  label: z.string(),
  verified: z.boolean(),
  verifyUrl: z.string().optional(),
});
export type Certification = z.infer<typeof Certification>;

export const PRACTICES = [
  'plastic_free_packaging',
  'compostable_packaging',
  'reusable_containers',
  'renewable_energy',
  'cover_crops',
  'no_till',
  'integrated_pest_mgmt',
  'water_conservation',
  'composts_waste',
  'donates_surplus',
  'pasture_raised',
  'pesticide_free',
] as const;
export const SustainabilityPractice = z.object({
  id: z.enum(PRACTICES),
  selfReported: z.boolean(),
});
export type SustainabilityPractice = z.infer<typeof SustainabilityPractice>;
export type PracticeId = (typeof PRACTICES)[number];

export const VendorProduct = z.object({
  id: z.string(),
  name: z.string(),
  category: ProductCategoryId,
  attributes: z.array(z.string()),
  inStock: z.boolean(),
  /** Crop key into crop-calendar.json, when this is a seasonal crop. */
  crop: z.string().optional(),
});
export type VendorProduct = z.infer<typeof VendorProduct>;

export const Vendor = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  town: z.string(),
  farmGeo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  marketIds: z.array(z.string()),
  products: z.array(VendorProduct),
  certifications: z.array(Certification),
  practices: z.array(SustainabilityPractice),
  paymentMethods: z.array(PaymentMethodId),
  programs: z.array(ProgramId),
  badges: z.array(z.string()),
  foodMiles: z.number().optional(),
  sustainabilityScore: z.number(),
  isSample: z.literal(true),
});
export type Vendor = z.infer<typeof Vendor>;

export const Price = z.object({
  vendorProductId: z.string(),
  unit: Unit,
  amount: z.number().positive(),
  observedAt: z.string(),
  source: z.enum(['vendor', 'manager', 'crowd', 'sample', 'usda_benchmark']),
});
export type Price = z.infer<typeof Price>;

export const Program = z.object({
  id: ProgramId,
  name: z.string(),
  shortName: z.string(),
  matchRate: z.number().optional(),
  monthlyCap: z.union([z.number(), z.record(z.string(), z.number())]).optional(),
  description: z.string(),
  howToRedeem: z.string(),
  eligibility: z.string(),
  url: z.string(),
  sourceUrl: z.string(),
  lastVerified: z.string(),
  verificationNote: z.string().optional(),
  regions: z.array(z.string()),
  es: z
    .object({ name: z.string(), description: z.string(), howToRedeem: z.string(), eligibility: z.string() })
    .optional(),
});
export type Program = z.infer<typeof Program>;

export const Crop = z.object({
  id: z.string(),
  name: z.string(),
  nameEs: z.string(),
  category: ProductCategoryId,
  months: z.array(z.number().int().min(1).max(12)),
  tip: z.string().optional(),
});
export type Crop = z.infer<typeof Crop>;

export const CropCalendar = z.object({
  region: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  note: z.string(),
  crops: z.array(Crop),
});
export type CropCalendar = z.infer<typeof CropCalendar>;

export const SourceMeta = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  license: z.string(),
  fetchedAt: z.string().nullable(),
  records: z.number(),
  status: z.enum(['ok', 'snapshot', 'skipped', 'failed', 'manual']),
  note: z.string().optional(),
});
export type SourceMeta = z.infer<typeof SourceMeta>;

export const Meta = z.object({
  builtAt: z.string(),
  region: z.string(),
  marketCount: z.number(),
  sources: z.array(SourceMeta),
});
export type Meta = z.infer<typeof Meta>;
