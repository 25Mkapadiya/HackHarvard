# Phase 7 source review — 2026-10-18

## Integrated candidate: historical Syracuse apple scenarios

[USDA ERS ERR-99, published 2010-06-21](https://www.ers.usda.gov/publications/46407)
([current PDF](https://www.ers.usda.gov/media/8523/err-99.pdf?v=78209)),
Table 3, printed p.16/PDF p.24; direct-market context p.11/PDF p.19.
The downloaded PDF SHA-256 is
`1b77d3961022603139f443531cf397c0c8be04590c4915f08a963f0ccf2e956d`.
Mainstream records cover August 2008–July 2009; interviews describe the historical
case period. Only numeric route facts and our own metadata are redistributed,
not the report's prose, images, confidential identities, or layout. Source
attribution is retained; no USDA endorsement is implied. This is a factual
extract, not a claim that every part of the report has an open license. See the
[Copyright Office's explanation of facts](https://www.copyright.gov/what-is-copyright/).

The reviewed product is fresh apples; endpoints are research supply chains in
Syracuse, New York. Product miles are loaded supply-chain distances, distinct
from vehicle round trips. No farm coordinates are inferred. Direct-market
scenarios use the study's April–December selling window, including stored apples;
they are not harvest-only calendars. Regionally distributed supermarket apples
are a separate, explicitly non-farmers-market illustration. No contemporary
purchase is classified as observed from these records.

The adapter will require an explicit scenario selection and exact NY/Syracuse
location scope. This is contextual matching, not proof of supply to that market.
For post-publication dates through the end of the current reviewed year (2026),
reuse is explicitly a **historical scenario**, not a contemporary observation.
Source observation dates remain separate from this application policy. Other
cities/states and unsupported products do not inherit these distances. Full
numeric extract, vehicle evidence and locators accompany the versioned catalog.
Refresh: immutable historical facts; annually review applicability policy and
source accessibility, and create a new version for any correction. Never replace
observation dates with download dates. No scheduled job or API credential needed.

## EPA transport factors — retained

[EPA January 2025 GHG factors](https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf),
Tables 8/11: the four freight modes and gas/unit conversions already in the
engine were rechecked. Do not replace or copy their calculation here. Truck
payload capacities documented in ERR-99 support a medium/heavy classification
for its mainstream chains. The direct-market small van does not support that
classification. Applying EPA national-average mass-distance factors to eligible
historical legs is an additional modeled approximation, not a reproduction of
the study's fuel-use or loading-specific results. No current rail/ship/air case
is shipped; the adapter can admit those modes only with source-backed legs.

## Investigated, not assigned to individual purchases

- [USDA NASS Quick Stats](https://data.nass.usda.gov/Quick_Stats/): commodity,
  state/county/year production, yield and acreage; downloadable exports/API
  with source-specific units. Useful regional context, not a vendor's origin,
  delivered price, supply route or a life-cycle pair. Do not integrate large
  production files to infer origins. NASS requests acknowledgment for its
  [public-domain data](https://data.nass.usda.gov/Data_and_Statistics/Citation_Request/index.php).
- [ERS Fruit and Vegetable Prices documentation](https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices/documentation):
  national annual retail prices in product-specific pound/pint/edible-cup units;
  free CSV/XLSX downloads, periodic releases. Does not establish the current
  regional farmers-market price required for quantity estimation. No quantity
  estimate is made from these averages; data is linked, not redistributed.
- [AMS Local & Regional Market News](https://www.ams.usda.gov/market-news/local-regional-food):
  public price/volume reports for selected locations and dates, with varying
  grade, packaging and units. Market/auction/wholesale reports cannot silently
  become a retail price. No reviewed Syracuse farmers-market/product/date match
  was established; no automatic price adapter or paid/keyed service added.
- [Poore and Nemecek 2018, DOI 10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216)
  ([author-hosted paper](https://josephpoore.com/data/science-2018/Poore%20and%20Nemecek%20%282018%29%20Reducing%20foods%20environmental%20impacts%20through%20producers%20and%20consumers.pdf)):
  product-level LCA background; global/provider heterogeneity is not an identified
  NY-vs-WA paired, stage-compatible purchase comparison. No figures or dataset
  are redistributed, and no open-data license is assumed. Aggregate footprints
  do not fill the engine's individual stage fields.
- [MDAR produce availability chart](https://www.mass.gov/lists/produce-availability-chart)
  and [Purdue's regional seasonal chart](https://extension.purdue.edu/foodlink/includes/marketing/rackcard.pdf):
  state seasonal guidance, not supply origins or environmental factors. These
  are outside the NY case scope and are not used to invent routes. No state or
  university calendar artwork is redistributed. Existing seasonal search stays intact.

## Supported and blocked metrics

Recorded visits and market spending remain available. A supported measured mass
can scale the selected historical food-mile scenario; a separately selected
regional-retail scenario can also scale eligible truck freight. Local attribution,
regional price-derived mass and complete paired LCA remain unsupported by the
reviewed data. Unknown origin plus no selected scenario produces unavailable
comparisons. Consumer travel remains excluded, with no home address required.
