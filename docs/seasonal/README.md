# Seasonal food data and search — Phase 8

Dataset version: **2026.10.18.1**, manually reviewed 2026-10-18. This is a
static, source-backed calendar release, not nationwide verified harvest coverage.

## Coverage and supported foods

See [COVERAGE.md](COVERAGE.md) for the generated 50-state-plus-DC table and nine
approximate regions, and [COVERAGE.json](COVERAGE.json) for individual product IDs.
There are 59 registered foods (the previous 55 plus blackberries, bell peppers,
cantaloupe and oranges), 45 foods with at least one sourced record, 113 food/state
records and eight sources. State coverage is deliberately partial:

- Massachusetts: 2 foods; inherited MDAR pick-your-own harvest windows.
- New York: 11 foods; harvest and distinct availability windows.
- California: 7 foods; general statewide U-pick harvest guidance.
- Florida: 22 foods; typical harvest times.
- Texas: 24 foods; general availability, harvest unspecified.
- Washington: 14 foods; availability plus explicitly marked apple/pear peak harvest.
- Michigan: 15 foods; field fresh, extended season and storage distinguished.
- Georgia: 18 foods; availability and limited availability distinguished.

All nine legacy approximate calendars remain: Northeast (NE), Mid-Atlantic and
Upper South (MA), Southeast (SE), South Central (SC), Midwest (MW), High Plains
and Rockies (PL), Desert Southwest (SW), California (CA), Pacific Northwest (NW).
Region IDs MA/SC are distinct from state codes. Approximate calendars cover the
contiguous 48 states plus DC; Alaska, Hawaii and territories remain unknown.
Some legacy region memberships overlap. The first region listed supplies a
state's approximate fallback; users can explicitly choose a different region.
There are **no verified broader-region records** in this release. The resolver
supports that tier only with explicit source applicability to all named states.

## Sources and transcription decisions

The versioned catalog is
`src/features/seasonal/catalog/seasonal-v1.json`. Every source includes its
organization, HTTPS reference, applicable states, publication date or explicit
null, review date and limitations. Every food/state record identifies a source,
page/row locator, evidence kinds and numeric month arrays. Source review dates
are neither publication dates nor dates of underlying observations.

1. [Massachusetts Department of Agricultural Resources: pick-your-own farms](https://www.mass.gov/guides/pick-your-own-farms).
   Reuses the previously reviewed strawberries June–July and pumpkins
   September–October windows. Partial months rounded outward; publication date
   unstated. The site intermittently blocks automated access; no claim of a new
   observation or newly downloaded state calendar is made.
2. [New York State Department of Agriculture and Markets: procurement toolkit appendices](https://agriculture.ny.gov/farming/appendices-local-procurement-toolkit).
   PDF page 4, printed page 1. Orange harvest bars and blue availability bars
   were inspected separately. Apples July–November harvest versus year-round
   availability; pears and plums also retain their wider availability windows.
   Partial months rounded outward, including split raspberry seasons. Dates
   elsewhere in the toolkit do not establish the chart's publication date.
3. [CDFA: U-pick guide, June 24, 2026](https://plantingseedsblog.cdfa.ca.gov/index.php/2026/06/24/whats-in-season-at-u-pick-farms-across-the-state/).
   Individual strawberry, blueberry, raspberry, blackberry, cherry, peach and
   pumpkin headings only. A general guide across different districts and farms,
   not every California farm's harvest. Broad aggregate berries/citrus/stone-fruit
   headings and the unusually broad apple heading were omitted pending review.
4. [Florida Department of Agriculture and Consumer Services: crops in season](https://www.fdacs.gov/Food-Nutrition/Buy-Fresh-from-Florida/crops-in-season).
   Typical harvest times. Bell peppers, cantaloupe and oranges have their own IDs;
   they do not establish windows for every pepper, melon or citrus species.
5. [Texas Department of Agriculture: produce commodity card](https://texasagriculture.gov/Portals/0/forms/MKT/TDA%20Produce%20Commodity%20Card.pdf).
   Varieties and availability; these windows never become a fresh-harvest claim.
   Cucumber variants share the same dates. Field tomatoes retained; greenhouse
   tomatoes, generic squash/greens/herbs and distinct cabbage variants excluded.
6. [Washington State Department of Agriculture: fruit, legume and herb chart](https://agr.wa.gov/getmedia/497c614b-5c54-4277-89cf-4d6d1dd79c52/seasonalitychartfruitlegumeherbsfinal.pdf).
   AGR PUB 200-339. Apple and pear asterisks identify peak harvest September–November;
   year-round bars remain availability. Other unmarked rows remain availability; peach/plum evidence applies only to
   the source’s yellow-peach/purple-plum rows.
   Frozen berries and dried legumes were excluded from fresh-food IDs.
7. [Michigan State University Center for Regional Food Systems: produce chart](https://msu-prod.dotcmscloud.com/foodsystems/uploads/files/mi-produce-availability.pdf).
   [Resource landing page](https://msu-prod.dotcmscloud.com/resources/mi-produce-availability)
   dates the resource March 29, 2013. PDF page 2 was inspected visually: green
   field fresh, yellow extended season, purple storage. Partial months round
   outward, so two evidence kinds can overlap in one month. Old source age is
   flagged; the underlying observations are not dated. This is an official MSU
   alternate host because the canonical canr.msu.edu endpoint denied access.
8. [University of Georgia Cooperative Extension: month-by-month guide](https://site.extension.uga.edu/aaecext/2025/12/georgias-month-by-month-produce-guide/).
   Published December 24, 2025, chart by Daniel Remar. A and L cells remain
   availability and limited availability; footnotes on storage/season extension
   prevent these being labelled harvest. Generic mixed-product rows excluded.

Climate, latitude, cultivar, farm practice and weather affect every window. A
month means at least part of that month, not continuous daily availability.
Missing records and months do not establish that a product cannot be purchased.
Harvest, peak harvest, storage, extended season, availability and limited
availability are separate fact types. Only the first two receive harvest labels.

## Selection, search and ranking

State selection changes both seasonal applicability and the market area. The
location picker changes the distance origin. With no explicit state/region, the
nearest directory market within 80 km supplies a **location hint**; users are
asked to confirm it, especially near borders. This is not a reverse geocoder.
A distant or unsupported location has unknown coverage and never defaults to
Northeast. Existing shared location behavior elsewhere remains untouched.

Each food resolves independently: state record → applicable verified broader
region → approximate legacy region → unknown. A sourced calendar outside its
window does not fall through to an approximate calendar. Unknown inputs remain
absent scoring signals. Existing weights, missing-weight redistribution and
ranking formulas are unchanged. The agricultural signal uses the active window
of the resolved calendar (including explicitly labelled availability/storage).
Popularity and separate regional-relevance measurements remain unavailable.
The market signal remains a non-sample **category report**, not product stock.

Search handles canonical names, Spanish names, categories and explicit aliases
(e.g. apple, strawberry, snap bean, courgette, green onion). It also matches
market names/cities. Search results show out-of-window and unknown food evidence
when a product is queried. Changing the month updates the single-month view.
Changing state/region cannot leak markets from the previous selection. The
80 km toggle intersects the selected geography; category counts/ranking always
use that same nearby radius. A state selection does not move the distance origin.

Both `/search` and `/seasonal` keep their existing shared page. Existing
`region=verified-ma` links select Massachusetts; explicit legacy growing-region
links continue to work. New links use `state=NY&month=10&q=apple`. `state=auto`
uses the location hint. Controls remain keyboard-accessible and fit a 390 px
mobile viewport. Historical directory data never receives a live-stock claim.

## Offline maintenance

1. Manually review official government/university sources and legends. Verify
   access/permission and reliability before any automated importer is considered.
   No scraping or source API call runs in the browser or validator.
2. Edit the catalog, keeping canonical IDs stable. Add aliases only when exact
   synonyms; do not map a specific variety to every broader product. Cite source
   page/row locators and applicable states. Preserve unstated dates as null.
3. Conflicting same-precedence calendars must be resolved by a human before
   import; do not union or overwrite their months. Corroborating sources go in
   one record's `sourceIds`. Different fact kinds (harvest versus storage) remain
   distinct windows. Regional records need at least two explicitly named states
   covered by every cited source. Do not extrapolate a substate chart statewide.
4. Increment the dataset version and review cutoff, update source lastReviewed
   only after actual review, and record the change in this log. Git preserves
   old releases; the filename stays stable for imports. Re-check at least annually,
   and sooner after source changes or broken links. Compare lastReviewed with
   today's date; never treat a file download or review as recent observations.
5. Run `npm run seasonal:validate` to validate and regenerate coverage. Run
   `npm run seasonal:validate -- --check` to check committed output without edits.
   Checks reject invalid/duplicate months, products, aliases, sources, missing
   metadata, chronology, source scope and conflicting or duplicate records. The
   report flags unknown publication dates, references older than five years and
   reviews older than a year **as of the version's review cutoff**. During annual
   maintenance advance that cutoff to expose newly stale reviews.
6. Run unit, TypeScript, lint, production-build and browser checks before committing
   catalog plus regenerated coverage. No new hosted service, account store,
   database, package dependency, scheduled job or paid API is required.

The legacy market pipeline and its weekly publication workflow stay unchanged.
It does not refresh this manually reviewed catalog. Seasonal files bundle with
the static production app/PWA; an already-open tab may need a reload to use a
newly published release. This phase does not deploy or merge main.

## Release log and validation

- **2026.10.18.1**: initial state-aware release; 113 records, eight sources,
  59 registered foods / 45 source-backed foods. Four extra product IDs prevent
  species/variety overgeneralization. Earlier baseline is commit 5631a0b7.
- Validation: 270 unit/component tests (original 230 plus 40), 12 browser tests
  (original eight plus four), TypeScript project build, zero lint errors and only
  the four pre-existing warnings, deterministic catalog/report check. Browser
  coverage retains purchase recording and both historical Syracuse and Boston
  environmental scenario boundaries. Production build uses the documented
  temporary copy because Workbox cannot handle the checkout path's apostrophe.
  The final full browser run uses `npm run test:e2e -- --workers=1`: an earlier
  parallel run hit a Chrome context-startup timeout before its smoke test ran.
- Changed files are limited to seasonal feature/catalog/tests, offline report,
  one package script and documentation. Authentication, account/profile/social,
  My Rewards, purchase logic, environmental catalogs/adapters, sustainability
  formulas, shared location stores and routing remain unchanged.
