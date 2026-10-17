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
11. **"Greater Boston" = within 25 km of Boston City Hall.** Those markets get sample vendors.
12. **Sample vendors are assigned deterministically** (hash of market + vendor ids), 3–6 per Greater Boston
    market, so reruns don't churn the data. When no public source lists a market's products or payment methods,
    they are derived from those sample vendors and flagged `productsAreSample` / `paymentsAreSample`.
13. **Raw snapshots keep only the latest file per source** (`data/raw/<source>/<date>.*`); git history keeps the
    older ones.
14. **Weekly refresh dispatches the deploy.** A push made with `GITHUB_TOKEN` does not trigger other workflows,
    so `refresh-data.yml` runs `gh workflow run deploy.yml` after committing new data.
15. **lockfile is generated with npm 11** (the runner's `lts/*` Node ships npm 11, which rejects npm 10 lockfiles
    missing optional platform packages).
16. **`?now=` simulates time.** Any URL accepts `?now=YYYY-MM-DDTHH:MM` (Boston wall-clock) so demos and the
    Playwright test don't depend on the real date — in October most summer markets are closed. A banner says when
    time is simulated.
17. **Location stays in the session.** "Use my location" / address search is kept in `sessionStorage` only; the
    default origin is downtown Boston. Address search calls Nominatim on submit only, at most once per second.
18. **Benefit details are opt-in.** The HIP calculator's household size is saved only if the user ticks
    "Remember", and "Clear my data" in the footer wipes all demo storage.
19. **QR check-in tokens are a speed bump, not security.** Demo tokens are a hash of market + date with a salt
    that ships in the bundle. Real anti-fraud needs server-signed tokens (a Supabase edge function).
20. **SupabaseStore is a stub.** No Supabase project was provided, so Phase 6 stops at the shared `Store` interface;
    `VITE_BACKEND=supabase` logs a warning and falls back to demo mode. No migrations were written.
21. **Score category labels and "how to improve" hints are English only** (they come from `src/lib/score/`); the
    rest of the UI chrome and the benefits guide are translated.
22. **Duplicate-looking summer/winter listings are kept.** MDAR lists some markets (e.g. Boston Public Market) once
    as a summer and once as a winter market at the same address; they are separate source records with their own
    schedules, so both appear.
23. **Markets outside Greater Boston have no vendors**, so their products/payment show "—" rather than invented data.
24. **Lighthouse wasn't run in this environment.** The initial JS is about 140 KB gzipped (budget 250 KB); the map,
    MiniSearch, QR code and portal/manager routes are lazy-loaded.
25. **National coverage comes from the USDA directory's last public export.** The Local Food Portal stays blocked
    without a key, so markets outside Massachusetts come from USDA's National Farmers Market Directory as hosted by
    Esri StoryMaps on ArcGIS Online (8,117 records, last updated 2009–2014). We keep the 48 contiguous states and DC
    (dropping AK, HI and territories), skip placeholder rows like "Various Cities and Towns", and flag every record
    stale. USDA's *current* SNAP retailer list (7,042 mainland "Farmers and Markets") confirms SNAP on ~840 of them.
26. **Massachusetts: MDAR wins.** USDA and MassGIS records within 150 m with similar names merge, and the newer
    MassGIS values take precedence. USDA-only Massachusetts records (markets the state no longer lists) are kept but
    are as stale as everything else from 2014.
27. **Ids now end in the state** (`copley-square-boston-ma`) so names can't collide across states. Old
    Massachusetts links without the suffix redirect.
28. **The map stays fast with 8,000 pins** by coloring pins with a state-only check (no look-ahead for the next
    opening), building popup text on demand, chunked marker loading, and refreshing the map every 5 minutes instead of
    every minute. `markets.geojson` carries raw schedule text only for unparsed markets: 4.9 MB, about 470 KB gzipped.
29. **Tract shading and sample vendors stay Greater Boston / Massachusetts.** National low-income /
    low-access tracts would be tens of MB; per-state tract files are a follow-up.
30. **OpenStreetMap was not used for markets.** A nationwide Overpass query timed out through the build proxy, and
    the public Overpass server isn't meant for that load; a regional extract would be the way to add it.
31. **Location only, no routing.** Market pages show where the market is (address, site description, map pin) but
    no directions links or transit/walking estimates, by request. The MBTA stop lookup was removed from the
    pipeline with them.
