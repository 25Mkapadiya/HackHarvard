# Sustainability methodology — market-impact/1.0.0

These modules calculate differences from supplied evidence, not proof that
shopping at any farmers market reduces emissions. Positive means conventional
minus local; negative results remain negative. No numerical confidence intervals
are asserted. The application currently has **no verified origin/counterfactual
or paired local/conventional LCA dataset**, so environmental comparisons are
unavailable for normal manual entries. Tests use explicitly synthetic data.

## Visits and money

A submitted trip is one visit irrespective of product count. Unique markets use
directory IDs. Market spending sums trip totals in integer USD cents; optional
item prices are not added again. Local spending sums priced items times sourced
local-attribution fractions in [0,1]. A market's location or the word “local”
is not origin evidence. Missing prices, fractions, and unallocated trip balances
remain unknown. A known subset is exposed separately from the whole-basket value.

## Mass and food miles

Use recorded kg/g/lb/oz weights with exact avoirdupois conversion
(1 lb = 0.45359237 kg). Count, bunch, loaf and volume units have no generic mass.
An optional regional price adapter must match product, region and validity dates,
with a sourced positive USD/kg price. Only item spending divided by that price
can supply estimated mass. There is no deployed price adapter or inferred basket.

Food miles difference = sum of kg × (conventional miles − local miles), in
**kg·mile**. Divide by the covered kg for the mass-weighted average in **mile**.
If any purchased item lacks evidence, the whole-basket value is unavailable;
subset results and coverage are separate. Home-to-market distance is never used
as a farm-to-market supply distance. Both chains require documented origin,
destination, scope, and a plausible comparable conventional alternative.

## Transport

Source: [EPA January 2025 inventory factors](https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf),
Tables 8/11, reviewed 2026-10-18. Truck, rail, waterborne and aircraft freight
rows are transcribed in `transport.ts`. Their columns use kg CO2 and grams
CH4/N2O per **short ton-mile**. Compute kg CO2e as CO2 + CH4×28/1000 +
N2O×265/1000; divide by 907.18474 kg per short ton. These are combustion
averages, not farm-specific or well-to-wheel factors. Do not substitute a
vehicle-mile factor for a freight-mass factor. The old rewards factor is unused.

Sum mass × distance × mode factor for each sourced freight leg, conventional
minus local. No default truck mode or origin is assigned. Optional consumer-trip
comparisons enter once per visit and must already cover return travel and be
allocated to the trip purpose. Without supplied travel evidence, consumer travel
is explicitly excluded. A supplied incompatible comparison makes the requested
metric incomplete rather than being silently discarded.

## Life cycle and double counting

Use a paired product-matched comparison with identical boundaries:
cradle-to-retail, kg of product as purchased, mass allocation, AR5 100-year GWP.
Production includes agricultural inputs and relevant land use. Freight covers
well-to-wheel transportation. Other covers processing, storage, packaging and
retail, excluding production/freight. Each component is explicitly tagged; an
aggregate footprint cannot be inserted into a component slot. Add the three
stage differences times kg, then an optional compatible well-to-wheel consumer
trip comparison. **Do not add the separate transport metric to this result.**

[Poore and Nemecek (2018), Science, DOI 10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216)
is relevant product-level background, not evidence of a specific market's
advantage. Its [author-hosted paper](https://josephpoore.com/data/science-2018/Poore%20and%20Nemecek%20%282018%29%20Reducing%20foods%20environmental%20impacts%20through%20producers%20and%20consumers.pdf)
was reviewed for scope. No global average is assigned to a local farm or
subtracted from a differently bounded factor. Farm refinement fields can retain
sourced fertilizer, irrigation, heating, machinery, energy, yield, livestock and
soil measurements. They do not apply unsupported practice multipliers.

## Data candidates investigated

- [USDA ERS Fruit and Vegetable Prices](https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices/documentation): annual US national averages and edible-cup conversions; not a matched regional/time-specific farmers market price series. Not used for automatic quantities.
- [USDA AMS Local & Regional Market News](https://www.ams.usda.gov/market-news/local-regional-food): regional coverage exists for selected locations; a matching product/unit/region/date adapter is still required. No API/hosted service added.
- [MDAR pick-your-own guide](https://www.mass.gov/guides/pick-your-own-farms): limited Massachusetts strawberry (June–July) and pumpkin (September–October) windows, rounded to months; weather and partial months vary. Guide is not market inventory.
- Existing broad regional crop-calendar rows remain hand-compiled approximations, clearly labelled. They must be reviewed against state calendars before being described as verified.
- Existing government market snapshots support location/category search. Exclude `productsAreSample` categories. A 2026 fetch date does not make a 2014 directory observation current.

## Outputs and quality

Each environmental metric carries units, method version, missing reasons,
coverage counts, evidence sources, source quality and assumptions. “Evidence-based”
means all required supplied inputs passed structural validation; it does **not**
verify the truth of a citation or imply measurement accuracy. The adapter owner
must audit source suitability. “Partial” means only a subset is calculable;
“Unavailable” means no supported comparison. No missing value becomes a claimed
zero saving. UI shows source quality and the known subset separately.
