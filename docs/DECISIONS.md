# Decisions

Choices made where `docs/BUILD_PLAN.md` was silent or reality differed from it.

1. **App name: "Market Day Boston".** Short, describes the use (going to market), and fits the stall-sign design.
2. **Vite base defaults to `/HackHarvard/`** (repo `25Mkapadiya/HackHarvard`); CI sets `VITE_BASE` from the repo name.
3. **Tailwind v4** via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css`.
4. **MassGIS statewide service as the primary market source.** The FeatureServer named in the plan
   (`Additional_Resources/FeatureServer/35`) is a 34-record regional export. The statewide MassGIS map service
   (`DPH/DPH_Farmers_Markets/MapServer/0`, 264 records, same MDAR `MARKET_ID`s) is fetched too, and dedupe
   merges the overlap — which doubles as a real test of the dedupe step.
5. **USDA Local Food Portal is optional.** `usdalocalfoodportal.com` returned 403 for every URL from the build
   environment, and its API needs a key. The fetcher runs only when `USDA_LFP_API_KEY` is set and otherwise
   records `skipped`. Its field mapping follows the portal's documented column names and is untested against
   live data.
6. **Seasons repeat yearly.** Source seasons are month-day ranges without a year ("June 14 to October 25") and
   the MDAR data was last updated for the 2023 season. Schedules are stored as month-days and applied to every
   year; every market is flagged `stale` and the UI says so. "No market 7/4" exceptions are treated as yearly too.
7. **Fuzzy season words map to fixed days:** "Late June" → June 20, "Mid October" → October 15,
   "May" as a start → May 1, as an end → May 31. Typos like "June53" or "October 231" fail the parse and show
   raw text instead.
8. **Every-other-week rules** are anchored to the season start (first matching weekday on or after it), or to
   2024-01-01 for year-round markets. This may be a week off from the real rotation, so biweekly markets show a
   note to check with the market.
9. **SNAP retailer records are confirm-only.** Of 475 MA "Farmers and Markets" SNAP retailers, most are
   individual farms registered at their own address. They mark matching markets (≤150 m, similar name) as
   SNAP-confirmed and add a source reference, but unmatched ones are not added as markets.
10. **Food access tracts come pre-joined.** The ERS 2025 Atlas (SNAP Retailer Access Map measures) is served
    with 2020 tract polygons from ERS's ArcGIS server, simplified server-side (~80 m), so no separate Census
    boundary download or mapshaper step is needed. Only low-income or low-access tracts are written for the map.
11. **"Greater Boston" = within 25 km of Boston City Hall.** Those markets get sample vendors and MBTA stops.
12. **Sample vendors are assigned deterministically** (hash of market + vendor ids), 3–6 per Greater Boston
    market, so reruns don't churn the data. When no public source lists a market's products or payment methods,
    they are derived from those sample vendors and flagged `productsAreSample` / `paymentsAreSample`.
13. **Raw snapshots keep only the latest file per source** (`data/raw/<source>/<date>.*`); git history keeps the
    older ones. MBTA stops are saved slimmed (name, lat/lng, mode).
14. **Weekly refresh dispatches the deploy.** A push made with `GITHUB_TOKEN` does not trigger other workflows,
    so `refresh-data.yml` runs `gh workflow run deploy.yml` after committing new data.
15. **lockfile is generated with npm 11** (the runner's `lts/*` Node ships npm 11, which rejects npm 10 lockfiles
    missing optional platform packages).
