import type { AmenityId, PaymentMethodId, ProductCategoryId, ProgramId } from '../types';

// English display labels. Spanish lives in src/i18n/es.json under the same keys.

export const CATEGORY_LABELS: Record<ProductCategoryId, string> = {
  fruits: 'Fruit',
  vegetables: 'Vegetables',
  herbs: 'Herbs',
  meat: 'Meat',
  poultry: 'Poultry',
  seafood: 'Seafood',
  eggs: 'Eggs',
  dairy: 'Dairy',
  cheese: 'Cheese',
  baked_goods: 'Baked goods',
  honey: 'Honey',
  maple_syrup: 'Maple syrup',
  preserves: 'Jams and preserves',
  nuts: 'Nuts',
  grains: 'Grains and flour',
  beans: 'Beans',
  mushrooms: 'Mushrooms',
  plant_protein: 'Tofu and plant proteins',
  prepared_foods: 'Prepared foods',
  coffee_tea: 'Coffee and tea',
  beverages_alcohol: 'Kombucha, cider and wine',
  juice: 'Juice and cider',
  flowers: 'Flowers',
  plants: 'Plants and seedlings',
  body_care: 'Soap and body care',
  crafts: 'Crafts',
  pet_food: 'Pet food',
  firewood: 'Firewood',
};

export const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  cash: 'Cash',
  credit: 'Credit or debit',
  mobile: 'Mobile pay',
  check: 'Check',
  tokens: 'Market tokens',
};

export const PROGRAM_LABELS: Record<ProgramId, string> = {
  snap: 'SNAP / EBT',
  hip: 'HIP',
  wic_fmnp: 'WIC coupons',
  sfmnp: 'Senior coupons',
  wic_cvb: 'WIC cash value',
  double_up: 'Double Up Food Bucks',
  city_coupon: 'Boston coupons',
};

export const AMENITY_LABELS: Record<AmenityId, string> = {
  restrooms: 'Restrooms',
  seating: 'Seating',
  parking: 'Parking',
  bike_racks: 'Bike racks',
  compost: 'Compost drop-off',
  recycling: 'Recycling',
  bag_dropoff: 'Reusable bag drop-off',
  ada: 'Wheelchair accessible',
  music: 'Live music',
  kids: 'Kids activities',
};
