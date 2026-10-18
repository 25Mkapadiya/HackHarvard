# Sustainability methodology — market-impact/1.0.0

These modules calculate differences from supplied evidence, not proof that
shopping at any farmers market reduces emissions. Positive means conventional
minus local; negative results remain negative. No numerical confidence intervals
are asserted. Actual purchase origins/counterfactuals and paired local/conventional
LCA remain undocumented. Phase 7 adds **optional historical Syracuse apple
scenarios**, using a verified factual extract from USDA ERS ERR-99. They are
explicitly modeled comparisons, never observations of the recorded purchase.
Tests distinguish synthetic transactions/alterations from the public source facts.

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


## Phase 7 data adapter and scenario interpretation

Dataset `ers-err99-table3/1.0.0-reviewed-2026` contains fresh-apple cases from
[USDA ERS ERR-99](https://www.ers.usda.gov/publications/46407), Table 3, p.16,
with the direct-market selling window from p.11. Source publication: 2010-06-21.
Mainstream records cover August 2008–July 2009; exact case interview dates are
not supplied, so precise observation endpoints are null and the observation
period is described in text. Source review/download dates do not update the
age of the study. See DATA_SOURCES.md and the attributed JSON extract for facts,
locators, source digest, unit metadata and redistribution basis.

These distances are **published product miles**, not a new map-route computation.
The adapter neither infers a farm nor recomputes a study endpoint from market
coordinates. Selecting a market in Syracuse, NY identifies city applicability
only; it does not establish that the studied supplier delivered to that market.

Three opt-in cases are supported: direct market versus WA retail supply, direct
market versus NY retail supply, and NY versus WA mainstream retail distribution.
Direct-market cases are limited to April–December, including stored apples, as
in the study's selling window. The retail illustration covers all months and is
explicitly **not a farmers-market supply route**. Only exact fresh-apple aliases
match; apple pie, other products and other cities/states do not inherit a case.

Reuse for post-publication purchase dates through 2026-12-31 is an explicit
application scenario policy, not contemporary source validity. Annual review
is required to extend that cutoff. A scenario selection is required each time
this view is mounted; it is not written into the purchase record or repository.
Without a selection, this catalog establishes no actual-purchase comparison.

The existing food-mile engine scales source distances by recorded mass. Missing
mass or unsupported items keep the full basket result unavailable; any known
subset is separately labelled. No price-based mass or local-spending fraction
is generated from these cases. A modeled environmental figure never reclassifies
recorded trip spending as estimated or locally attributable spending.

The direct case's small van is incompatible with the existing medium/heavy truck
freight factor, so its freight CO2e remains unavailable. The separate mainstream
retail case documents eligible freight trucks for all legs. EPA national-average
combustion factors scale the historical loaded-product distances; this additional
approximation is not a reproduction of the study's fuel/loading results, actual
trip emissions, or total climate benefit. Return/empty truck miles are not
independently inserted as product miles. Rail/ship/air require documented eligible
legs; none are asserted for the shipped cases. No home address is used.

Catalog validation rejects ambiguous aliases, wrong units, unsupported geographic
scope, inconsistent segment totals, invalid chronology, and incompatible LCA
boundaries. Observed evidence requires a reviewed comparison with exact market
IDs, a matching dated origin document and known observation validity. An origin
alone still cannot establish a conventional comparison. No such observed records
are bundled. All calculation formulas and engine methodology version remain
`market-impact/1.0.0`; catalog versioning is separate. Total LCA remains unavailable
for the reasons in LIFECYCLE_LIMITATIONS.md.

## Phase 8 agricultural calendar interpretation

Seasonal food recommendations resolve each product using a cited state calendar,
then an explicitly applicable verified region, then a labelled approximation,
then unknown. A known state record outside its documented window does not fall
through to approximate evidence. Seasonal ranking preserves the existing weight
formula and absent-signal redistribution. No popularity measurements are invented.
Storage, general/limited availability and extended production can contribute an
active calendar signal but never receive a fresh-harvest label. Source-backed
calendar guidance is not evidence of a specific farm's current harvest, an exact
market product, current inventory, purchase origin, or avoided emissions. See
[seasonal provenance](../seasonal/README.md) for source-specific qualifications.
No environmental calculation or scenario eligibility rule changes in this phase.

## Phase 12 conditional regional transportation — regional-transport/1.0.0

[Regional methodology](regional/README.md) defines the separate ten-case release.
Production facts identify possible producer states, not destination sourcing
probabilities. Sourced origin-season intersections constrain eligibility. A
Census internal geographic reference and the selected market coordinate provide
a great-circle proxy, explicitly not road mileage or a measured farm route.
Actual origins, routes, mode/load and final delivery remain unknown.

The existing mass conversions and food-mile engine calculate kg × signed distance
difference and the covered-mass average. The existing freight engine uses explicit
per-branch conditional medium/heavy truck modes and EPA January 2025 factors.
Those outputs are coarse straight-line freight proxies, not road-route emissions
estimates or measured reductions. One reviewed case can display automatically;
multiple origin cases stay separate and require an illustrative choice for basket
aggregation. No probabilities, optimized savings, road/payload multipliers or
confidence intervals are invented. Missing inputs keep whole-basket output unknown.

Consumer travel, refrigeration energy, farm processes (fertilizer, irrigation,
soil carbon, heating, livestock) and total life-cycle effects are outside this
transport-only model. They require different matched evidence and boundaries.
Existing observed/historical evidence views and all six engines are unchanged;
never add regional illustrations to their results. Full sources, limitations,
version/applicability, coverage and refresh instructions are in the regional docs.
