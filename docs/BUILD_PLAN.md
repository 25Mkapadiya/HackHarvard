# Build Plan: Local Food Market Platform (Greater Boston MVP)

> **For Claude Code.** This is the full brief. Read it top to bottom before writing code. Work through the phases in order, commit at the end of each phase, and keep the acceptance criteria green. When a decision isn't covered here, pick the simplest option that keeps the site static and deployable on GitHub Pages, and note the decision in `docs/DECISIONS.md`.

---

## 0. First steps (do these before anything else)

1. Save this file into the repo as `docs/BUILD_PLAN.md`.
2. Create a short `CLAUDE.md` at the repo root that summarizes: the stack, the folder layout, the commands (`npm run dev`, `npm run build`, `npm run data`), and the rule that **the deployed site must be 100% static** (no server code runs on GitHub Pages).
3. Inspect the repo: current branch name, existing files, remote URL (`git remote -v`), and whether the `gh` CLI is installed and authenticated (`gh auth status`). Record the GitHub `owner/repo` — you need the repo name for the Vite `base` path.
4. Do **not** delete any existing files the user already has in the repo without asking. If there is an existing README, merge into it rather than overwriting it.

---

## 1. The key architectural constraint: GitHub Pages is static

GitHub Pages only serves static files. That means:

- **No PostgreSQL/PostGIS, no Express/FastAPI at runtime.** The spec's backend stack is replaced by a **build-time data pipeline** that fetches public data, normalizes it, and writes static JSON/GeoJSON into `public/data/`. The browser loads those files and does filtering, search, distance, and "open now" logic client-side.
- **Most government data sources will fail from the browser because of CORS.** Always fetch them in Node scripts (locally or in GitHub Actions), never from the client.
- **Anything that needs accounts or writes (vendor portal, rewards, reviews, pre-orders)** runs in one of two modes, chosen by an env flag:
  - `VITE_BACKEND=demo` (default): fully working demo backed by `localStorage` and seeded JSON. Clearly labelled "Demo mode — data stays in your browser."
  - `VITE_BACKEND=supabase` (Phase 6, optional): Supabase Auth + Postgres with Row Level Security, called directly from the browser using the public anon key. The anon key is safe to ship **only** if RLS is on for every table. Never commit a service-role key.
- **No payment processing.** Pre-orders reserve items; payment happens at the stall. SNAP/EBT online processing requires FNS authorization, so the site only *shows* where benefits are accepted.

Put a data-access interface in `src/lib/store/` (`DemoStore` and `SupabaseStore` implementing the same TypeScript interface) so swapping modes doesn't touch UI code.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite + React + TypeScript | Static output to `dist/`, simple Pages deploy |
| Routing | `react-router` with **HashRouter** | Deep links work on Pages without a 404 hack |
| Styling | Tailwind CSS | Fast, mobile-first |
| Map | Leaflet + react-leaflet, OpenStreetMap tiles, `leaflet.markercluster` | No API key; include OSM attribution |
| Geo math | `@turf/distance`, `@turf/boolean-point-in-polygon` | Distance from user, tract lookups |
| Schedules | `rrule` (iCal RRULE) + `date-fns-tz` (America/New_York) | Spec requires RRULE, not free text |
| Search | MiniSearch (client-side full-text) | Product + market + vendor search with no server |
| Validation | `zod` schemas for every data file | Pipeline fails loudly on bad data |
| Data pipeline | Node + TypeScript scripts run with `tsx`, `papaparse`, `xlsx`, `shpjs` or `mapshaper` | Fetch, normalize, dedupe, write JSON |
| PWA | `vite-plugin-pwa` | Offline caching for weak signal at outdoor markets |
| i18n | `i18next` + `react-i18next` (en, es) | Spec requires English + Spanish minimum |
| Tests | Vitest + Testing Library; one Playwright smoke test | Pipeline + "open now" logic must be tested |
| CI/CD | GitHub Actions → GitHub Pages | Deploy on push to `main` |

Set `base: '/<REPO_NAME>/'` in `vite.config.ts` (read it from an env var with that as the default). If the repo is named `<user>.github.io`, use `base: '/'`. All data fetches must use `import.meta.env.BASE_URL + 'data/...'`, never an absolute `/data/...` path.

---

## 3. Data sources

Fetch everything in `scripts/fetch/*.ts`. Each fetcher must: save the raw response to `data/raw/<source>/<date>.*`, fall back to the most recent raw snapshot if the network call fails, and log the record count. Write a `data/SOURCES.md` listing every source, its URL, license/terms, fetch date, and record count (generate it from the pipeline).

### 3.1 Market directories (core)

| Source | URL | Use |
|---|---|---|
| USDA AMS Local Food Directories (farmers markets, CSAs, on-farm markets, food hubs) | Landing: https://www.ams.usda.gov/local-food-directories/farmersmarkets · Portal: https://www.usdalocalfoodportal.com · Bulk export: `https://www.usdalocalfoodportal.com/api/download_by_directory?directory=farmersmarket` | Primary national source: location, schedule text, products, payment methods, nutrition programs. Try the same endpoint with the other directory slugs (confirm the exact slugs for CSA / on-farm market / food hub from the portal's API docs). If an API key is required, read it from `USDA_LFP_API_KEY` and stop with a clear message if it's missing. Filter to MA for the MVP but keep the national schema. |
| MassGIS Farmers' Markets layer (`FARMERSMARKETS_PT`) | Info: https://www.mass.gov/info-details/massgis-data-farmers-markets · ArcGIS REST: https://services1.arcgis.com/ceiitspzDAHrdGO1/ArcGIS/rest/services/Additional_Resources/FeatureServer | MA-specific markets from MDAR's database, including SNAP and FMNP participation and seasonal vs. winter market type. Query the farmers market layer with `where=1=1&outFields=*&f=geojson`. |
| MassGrown (MDAR) | https://www.mass.gov/massgrown · https://www.mass.gov/farmers-markets | Farm stands, PYO, CSAs, markets-by-day pages, crop availability chart. Use for cross-checking and for the seasonality guide. Don't scrape aggressively; if structured data isn't available, link out. |
| City of Boston farmers markets (Office of Food Justice) | Search boston.gov for "Boston Farmers Markets" — the page has a downloadable list of participating markets | Boston market list, hours, and the city's Farmers Market Coupon Program participation. |
| Mass Farmers Markets (nonprofit) | https://massfarmersmarkets.org | Context and link-outs for Greater Boston markets; cross-check names/schedules. |

### 3.2 Food-access programs

| Source | URL | Use |
|---|---|---|
| USDA FNS SNAP Retailer Locator | https://www.fns.usda.gov/snap/retailer-locator · Data: https://www.fns.usda.gov/snap/retailer-locator/data · ArcGIS hub: https://usda-snap-retailers-usda-fns.hub.arcgis.com | Filter store type "Farmers and Markets" in MA. Use to confirm SNAP acceptance and to add SNAP-authorized direct-marketing farmers. The ArcGIS layer also includes SNAP incentive type fields — use them if present. |
| Massachusetts Healthy Incentives Program (HIP) | https://www.mass.gov/hip · CISA HIP map: https://buylocalfood.org/hip-map | HIP rules for the benefits calculator and guide. HIP vendor locations come from the DTA finder linked on mass.gov/hip — link out if no bulk data is available. |
| Double Up Food Bucks / Fair Food Network | https://www.doubleupfoodbucks.org · https://fairfoodnetwork.org | National SNAP-match program info; MA mostly uses HIP instead, so treat as a program record for other regions. |
| WIC FMNP / Senior FMNP | MassGIS layer FMNP fields + USDA portal `nutrition_programs` field | Program acceptance flags. Note: the MassGIS documentation says WIC Cash Value Vouchers aren't redeemable at MA farmers markets — surface the program data as the source states it, with a "last verified" date, rather than hard-coding claims. |

### 3.3 Geography, demographics, transit

| Source | URL | Use |
|---|---|---|
| USDA ERS Food Access Research Atlas | https://www.ers.usda.gov/data/fooddesert/ · Download: https://www.ers.usda.gov/data-products/food-access-research-atlas/download-the-data | Low-income / low-access census tracts. Use the latest data file on the page (ERS expected an update in fall 2026 — check for the newest version). Join to tract polygons by GEOID. |
| Census cartographic boundary files (tracts) | https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html | MA tract polygons. Use the tract vintage that matches the Atlas file. Simplify with mapshaper so the GeoJSON stays small (target < 1.5 MB). |
| Census Geocoder | https://geocoding.geo.census.gov/geocoder/ | Build-time geocoding for records without lat/lng (batch endpoint). |
| Census Data API (ACS 5-year) | https://api.census.gov/data.html | Tract population and median income for the "need vs. supply" heatmap. Key in `CENSUS_API_KEY` (optional for low volume). |
| Nominatim (OpenStreetMap) | https://nominatim.org · Policy: https://operations.osmfoundation.org/policies/nominatim/ | Client-side "search an address" box only. Max 1 request/second, no autocomplete-on-keystroke, set a descriptive app identifier. Prefer browser geolocation first. |
| OSM tiles | Policy: https://operations.osmfoundation.org/policies/tiles/ | Map tiles with attribution. Make the tile URL a config value so it can be swapped if traffic grows. |
| MBTA V3 API | https://api-v3.mbta.com | Build-time: nearest rapid-transit/bus stops for each market (store stop name + walking distance). |

### 3.4 Products, seasonality, prices

| Source | URL | Use |
|---|---|---|
| SNAP-Ed Seasonal Produce Guide | https://snaped.fns.usda.gov/resources/nutrition-education-materials/seasonal-produce-guide | Produce descriptions and tips for the seasonal guide. |
| MassGrown crop availability chart | linked from https://www.mass.gov/massgrown | MA crop calendar (month ranges per crop). If it's only a PDF/image, hand-transcribe into `data/manual/crop-calendar-ma.json` and cite it. |
| USDA AMS My Market News (MARS API) | https://mymarketnews.ams.usda.gov · API base: https://marsapi.ams.usda.gov | Retail/wholesale price benchmarks for "vs. supermarket" comparisons (e.g., the weekly National Retail Report – Local and Organic). Free API key via My Market News account → `MARS_API_KEY` GitHub secret. Skip gracefully if the key is missing. |
| USDA NASS Quick Stats API | https://quickstats.nass.usda.gov/api | County-level farm/production context for the research view. Key in `NASS_API_KEY`. |

### 3.5 Sustainability, certification, weather, grants

| Source | URL | Use |
|---|---|---|
| USDA Organic Integrity Database | https://organic.ams.usda.gov/integrity/ | Link-out verification for "certified organic" claims on vendor pages. |
| Certified Naturally Grown | https://www.naturallygrown.org | Link-out verification for CNG claims. |
| EPA GHG Emission Factors Hub | https://www.epa.gov/climateleadership/ghg-emission-factors-hub | Emission factor per ton-mile for food-miles CO₂e estimates. Store the factor and its source year in `data/manual/emission-factors.json`; label all CO₂e numbers as estimates. |
| National Weather Service API | https://api.weather.gov | Client-side forecast on market pages (CORS-enabled; no key). |
| Grants (for vendor resources page) | FMPP/LFPP: https://www.ams.usda.gov/services/grants · GusNIP: https://www.nifa.usda.gov/grants/programs/gusnip · EQIP: https://www.nrcs.usda.gov/programs-initiatives/eqip-environmental-quality-incentives | Static resource links. |
| Supabase (Phase 6 only) | https://supabase.com/docs | Auth + Postgres + RLS for real vendor portal, rewards, reviews. |

**Data that does not exist publicly:** per-vendor rosters at most markets, per-vendor prices, inventory, and sales. Generate these as **clearly labelled sample data** in `data/seed/` (realistic Greater Boston vendors with invented names, MA-grown products, plausible prices) and show a "Sample data" badge anywhere it appears. Never present seed data as real.

---

## 4. Data pipeline

`npm run data` runs `scripts/pipeline.ts`, which does:

```
fetch → normalize → geocode → dedupe → enrich → validate → write
```

1. **Fetch** (section 3) with retries, timeouts, and raw-snapshot fallback.
2. **Normalize**
   - Names: trim, title-case consistently, strip "Farmers Market" variants for matching only.
   - Addresses: USPS-style abbreviations, ZIP to 5 digits.
   - Schedules: parse free-text season/day/time strings into `{ seasonStart, seasonEnd, rrule, openTime, closeTime }`. Keep the original string in `scheduleRaw`. Write unit tests with at least 20 real messy strings from the USDA export. If parsing fails, set `rrule: null` and show the raw text in the UI rather than guessing.
   - Products: map source product labels onto the taxonomy in spec section 2.3 via `data/manual/product-taxonomy.json`.
   - Payment methods + programs: map to fixed enums (`cash`, `credit`, `mobile`, `check`, `tokens`, `snap`, `wic_fmnp`, `sfmnp`, `wic_cvb`, `hip`, `double_up`, `city_coupon`, …).
   - Units for prices: normalize to a canonical unit per product (lb, each, bunch, dozen, pint) for comparison.
3. **Geocode** records missing coordinates (Census batch geocoder); cache results in `data/cache/geocode.json`.
4. **Dedupe** across sources: candidate pairs within 150 m with name similarity ≥ 0.8 (Jaro-Winkler) are merged. Keep `sources: [{name, id, url, fetchedAt}]` on every merged record and prefer the most recently updated field values. Write a `data/reports/dedupe.md` listing merges for human review.
5. **Enrich**: tract GEOID + low-income/low-access flags (point-in-polygon), nearest MBTA stop, distance-based food miles for seed vendors.
6. **Validate** every output with zod. Flag records with `lastUpdated` older than 12 months as `stale: true`.
7. **Write** to `public/data/`:
   - `markets.geojson` (FeatureCollection; properties = Market summary for map/list)
   - `markets/<id>.json` (full detail per market — keeps the initial payload small)
   - `vendors.json`, `products.json`, `prices.json`, `programs.json`, `crop-calendar.json`
   - `tracts-lila.geojson` (simplified)
   - `search-index.json` (prebuilt MiniSearch index)
   - `meta.json` (build time, per-source fetch dates and counts)

Schedule: `.github/workflows/refresh-data.yml` runs the pipeline weekly (cron) and on manual dispatch, then commits changed files in `public/data/` and `data/` to `main` with message `data: weekly refresh`. That push triggers the deploy workflow. API keys come from repository secrets.

---

## 5. TypeScript data model (`src/types/`)

Mirror spec section 9, flattened for static JSON:

```ts
type Market = {
  id: string; name: string; type: 'farmers_market'|'farm_stand'|'csa'|'food_hub'|'on_farm';
  address: { street?: string; city: string; county?: string; state: string; zip?: string };
  geo: { lat: number; lng: number };
  locationType?: 'park'|'parking_lot'|'church'|'school'|'farm'|'indoor_hall'|'other';
  indoor?: boolean;
  schedules: MarketSchedule[]; scheduleRaw?: string;
  products: ProductCategoryId[];
  paymentMethods: PaymentMethodId[];
  programs: ProgramId[];
  amenities: AmenityId[];
  accessibility?: string; nearestTransit?: { stopName: string; meters: number };
  tract?: { geoid: string; lowIncome: boolean; lowAccess: boolean };
  vendorIds: string[];            // seed data in MVP
  website?: string; social?: string[]; contact?: { email?: string; phone?: string };
  sources: SourceRef[]; lastUpdated: string; stale: boolean;
};
type MarketSchedule = { seasonStart?: string; seasonEnd?: string; rrule: string|null;
  openTime?: string; closeTime?: string; exceptions?: { date: string; note: string }[] };
type Vendor = { id: string; name: string; description: string; farmGeo?: {lat:number;lng:number};
  marketIds: string[]; products: VendorProduct[]; certifications: Certification[];
  practices: SustainabilityPractice[]; badges: string[]; sustainabilityScore: number; isSample: boolean };
type Price = { vendorProductId: string; unit: Unit; amount: number; observedAt: string;
  source: 'vendor'|'manager'|'crowd'|'sample'|'usda_benchmark' };
type Program = { id: ProgramId; name: string; matchRate?: number; monthlyCap?: number|Record<string,number>;
  description: string; howToRedeem: string; url: string };
```

---

## 6. Features by phase

### Phase 1 — Scaffold, deploy pipeline, and branch setup (ship an empty site first)

- Scaffold Vite + React + TS + Tailwind, HashRouter, ESLint/Prettier, Vitest.
- Add `.github/workflows/deploy.yml` (section 8) and get a "Hello" page live on Pages **before** building features.
- Do the branch work in section 9.
- **Accept when:** the Pages URL loads, assets resolve under the repo sub-path, `main` is the default branch.

### Phase 2 — Data pipeline

- Everything in section 4, with tests for the schedule parser, unit normalizer, and dedupe.
- **Accept when:** `npm run data` produces valid files with ≥ 100 MA markets, `meta.json` lists every source, and the dedupe report exists.

### Phase 3 — Consumer discovery (the core of the MVP)

- **Home**: location prompt (geolocation or address), "Open now near you" list, and the map.
- **Map + list view** (toggle on mobile, side-by-side on desktop): clustered markers, filters for open now / open on a chosen day, distance, market type, products, payment methods, food-access programs (SNAP, HIP, WIC FMNP, SFMNP, city coupons), indoor/winter markets, and sustainability attributes. Filters live in the URL query so filtered views are shareable. Filtering works with **no account**.
- **"Open now"** uses RRULE + season dates + exceptions in America/New_York. Show "Opens Saturday 9:00 AM" when closed. If `rrule` is null, show the raw schedule and exclude from "open now" with an explanation.
- **Market detail page**: schedule (calendar for the next 4 weeks), products, payment methods, programs with "how to use your benefits here", amenities, nearest transit stop, directions link (opens Google/Apple Maps), NWS forecast for the next market day, vendors (sample-badged), sources and "last updated" date, and a "Suggest a correction" button.
- **Product search**: "where can I find strawberries this week?" → markets carrying the category that are open in the next 7 days and in season per the crop calendar.
- **Seasonal guide**: month picker showing what's in season in MA, each crop linking to product search.
- **Need vs. supply map layer**: toggle low-income/low-access tracts under market markers.

### Phase 4 — Benefits guide and calculator

- Plain-language guide (en/es) for SNAP, HIP, WIC FMNP, SFMNP, Boston coupon program.
- HIP calculator: user picks household size → shows the monthly HIP cap and an example ("Spend $40 SNAP on eligible produce at a HIP vendor → get $40 back on your card"). Store caps in `programs.json`, not in components, with a source URL and "last verified" date, because program amounts change.
- Never store benefit status unless the user opts in (demo mode: only in localStorage, with a "Clear my data" button).

### Phase 5 — Vendor, manager, and rewards demos (demo mode)

- **Vendor portal** (`/vendor`): pick a sample vendor, edit products/prices/inventory with a phone-sized UI, mark market attendance, fill out the sustainability self-assessment, list end-of-day surplus. Changes persist to localStorage and appear in the consumer views on the same device.
- **Sustainability score v1**: transparent formula in `src/lib/score.ts` and a public `/how-scores-work` page. Inputs: certifications, packaging, food miles, waste diversion, benefit-program acceptance. Each input shows points earned and how to improve. Self-reported items are marked "self-reported" until verified.
- **Rewards v1**: each market detail page shows a QR code that links to `#/checkin/<marketId>?t=<day-token>`; checking in awards points (rate-limited to one per market per day in demo mode). Impact dashboard: visits, estimated local dollars, estimated food miles avoided (with method notes).
- **Manager view** (`/manager`): edit a sample market's schedule, post a one-off closure ("closed due to rain") that immediately updates "open now", approve a sample vendor application.

### Phase 6 (optional) — Supabase backend

- Only if the user provides a Supabase project URL and anon key. Write SQL migrations in `supabase/migrations/` with RLS policies for every table (vendors edit only their own rows; users see only their own rewards; sales data private by default). Add `SupabaseStore`. Keep demo mode as the default build.

### Stretch (only after Phases 1–5 pass)

Pre-order + pickup reservations, surplus alerts, Spanish translations for all content, demand forecasting chart on the vendor dashboard, seasonal recipe suggestions, public read-only `data/` JSON documented as an open dataset for researchers.

---

## 7. Design direction

- Audience: Greater Boston shoppers, including SNAP/HIP households, often on phones outdoors. Legibility and speed beat decoration.
- Ground the look in market-day signage: chalkboard price signs, produce-crate stamps, hand-painted stall banners. One memorable element (e.g., market cards styled like stall signs with the day and hours as the dominant type); everything else quiet.
- Type: a characterful display face for headings (e.g., Bricolage Grotesque) + **Atkinson Hyperlegible** for body/UI (designed for low-vision readers, which fits the food-access mission). Self-host or use Google Fonts with system fallbacks.
- Palette (adjust if needed, keep WCAG AA contrast): kale green `#24513F`, beet `#8C2D4F`, squash yellow `#F2B33D`, sky `#DCEBF2`, paper `#FBFBF8`, ink `#1D2422`. Avoid cream-and-terracotta and generic SaaS card grids.
- Status colors for open/closing soon/closed must also use text and icons, not color alone.
- Sentence case, plain verbs, no all-caps labels. Empty and error states say what to do next ("No markets open right now. Show markets open this weekend").
- Respect `prefers-reduced-motion`; one deliberate motion moment at most.

---

## 8. Deployment workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build
        env:
          VITE_BASE: /${{ github.event.repository.name }}/
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The build uses the committed `public/data/` files; it does **not** run the data pipeline (that's the weekly refresh workflow), so deploys stay fast and don't depend on government sites being up.

---

## 9. Git: make `main` the default branch and push everything

Run these, adapting to what you find, and explain each step's result:

```bash
# 1. Commit all work
git add -A
git commit -m "feat: local food market platform MVP"

# 2. Rename the current branch to main (no-op if already main)
git branch -M main

# 3. Push main and set upstream
git push -u origin main

# 4. Make main the default branch on GitHub
gh repo edit --default-branch main
#   (fallback if gh repo edit fails:)
#   gh api -X PATCH repos/{owner}/{repo} -f default_branch=main

# 5. Enable Pages with GitHub Actions as the source
gh api -X POST repos/{owner}/{repo}/pages -f build_type=workflow \
  || gh api -X PUT repos/{owner}/{repo}/pages -f build_type=workflow

# 6. Trigger and watch the deploy
gh workflow run deploy.yml --ref main
gh run watch
```

Rules:
- If an old default branch (e.g., `master`) exists on the remote with commits that aren't in `main`, **stop and ask** before deleting it. If it's fully merged into `main`, ask whether to delete it (`git push origin --delete master`).
- Never force-push to `main`.
- If `gh` isn't installed or authenticated, finish everything else and print the exact manual steps: Settings → Branches → default branch = `main`; Settings → Pages → Source = "GitHub Actions".
- Print the final Pages URL (`https://<owner>.github.io/<repo>/`) at the end.

---

## 10. Repo layout

```
.
├── CLAUDE.md
├── README.md                 # what it is, live link, how to run, data sources summary, license
├── docs/BUILD_PLAN.md        # this file
├── docs/DECISIONS.md
├── data/
│   ├── raw/                  # raw source snapshots (gitignore large files; keep latest small ones)
│   ├── cache/                # geocode cache
│   ├── manual/               # taxonomy, crop calendar, emission factors, program caps
│   ├── seed/                 # SAMPLE vendors, prices, sales
│   ├── reports/              # dedupe + data quality reports
│   └── SOURCES.md
├── public/data/              # generated static data served to the browser
├── scripts/
│   ├── fetch/                # one file per source
│   ├── normalize/ dedupe.ts enrich.ts validate.ts
│   └── pipeline.ts
├── src/
│   ├── app/ routes/ components/ features/{map,markets,search,benefits,vendor,manager,rewards}
│   ├── lib/{schedule,geo,score,search,store}/
│   ├── i18n/{en,es}.json
│   └── types/
├── supabase/migrations/      # Phase 6 only
└── .github/workflows/{deploy.yml,refresh-data.yml}
```

---

## 11. Quality bar

- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95. Initial JS ≤ 250 KB gzipped; lazy-load map, vendor portal, and manager routes.
- Map + list render in < 2 s on throttled 4G (initial payload: `markets.geojson` only).
- WCAG 2.1 AA: keyboard-reachable map markers (the list view is the accessible equivalent), visible focus, labelled form controls, alt text.
- Every data-derived screen shows source and "last updated"; stale records show a warning.
- No secrets in the repo. `.env.example` lists `USDA_LFP_API_KEY`, `MARS_API_KEY`, `NASS_API_KEY`, `CENSUS_API_KEY`, `VITE_BACKEND`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Tests: schedule parsing and "open now" (including season boundaries, DST changes, one-off closures), unit normalization, dedupe, score formula, HIP calculator.

---

## 12. README contents

Project pitch (2–3 sentences), live link, screenshots, features, how data is collected (pipeline diagram + `SOURCES.md` link), "Sample data" disclaimer, how to run locally, how to refresh data, how to enable Supabase mode, license (MIT for code; note that each source's terms apply to its data), and the open questions from spec section 13.

---

## 13. Final checklist before you stop

- [ ] `npm run build` passes locally with the Pages `base` path
- [ ] All tests pass
- [ ] `public/data/` is committed and valid
- [ ] `main` is the default branch on GitHub
- [ ] Pages source is "GitHub Actions" and the deploy run succeeded
- [ ] Live URL loads, deep links (e.g., `#/market/<id>`) work, data loads under the sub-path
- [ ] README, CLAUDE.md, SOURCES.md, DECISIONS.md written
- [ ] Summary printed: live URL, what's real vs. sample data, any sources that failed and why
