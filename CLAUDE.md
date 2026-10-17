# CLAUDE.md

Market Day Boston — a static web app for finding farmers markets and farm stands across the contiguous US, what they sell,
when they're open, and which food-access benefits (SNAP, HIP, WIC FMNP, SFMNP, Boston coupons) they take.
The full brief is `docs/BUILD_PLAN.md`; decisions not covered there go in `docs/DECISIONS.md`.

## Hard rule: the deployed site is 100% static

GitHub Pages serves files only. No server code runs at request time. Government data is fetched at
**build time** by `npm run data` (Node, never the browser — CORS), written to `public/data/`, and committed.
Writes (vendor portal, rewards, manager tools) use `src/lib/store/` — `DemoStore` (localStorage, default)
or `SupabaseStore` (`VITE_BACKEND=supabase`, RLS required). Never commit a service-role key.

## Stack

Vite + React + TypeScript, `react-router` **HashRouter**, Tailwind v4, Leaflet/react-leaflet + markercluster
(OSM tiles), turf, `rrule` + `date-fns-tz` (America/New_York), MiniSearch, zod, i18next (en/es),
vite-plugin-pwa, Vitest + Testing Library, Playwright smoke test.

## Commands

- `npm run dev` — local dev server
- `npm run build` — typecheck + production build (`VITE_BASE` sets the Pages sub-path; default `/HackHarvard/`)
- `npm run data` — run the data pipeline (fetch → normalize → geocode → dedupe → enrich → validate → write)
- `npm test -- --run` — unit tests; `npm run test:e2e` — Playwright smoke test against `vite preview`
- `npm run lint`

## Layout

- `scripts/` — pipeline (`pipeline.ts`, `fetch/` one file per source, `normalize/`, `dedupe.ts`, `enrich.ts`, `validate.ts`)
- `data/raw/` source snapshots (fallback when a fetch fails) · `data/cache/` geocode cache ·
  `data/manual/` hand-curated JSON (taxonomy, crop calendar, programs, emission factors) ·
  `data/seed/` **sample** vendors/prices (always badged "Sample data") · `data/reports/` dedupe report
- `public/data/` — generated JSON the browser loads; fetch via `import.meta.env.BASE_URL + 'data/...'`
- `src/types/` shared types + zod schemas (used by both pipeline and app)
- `src/lib/{schedule,geo,score,search,store}` · `src/features/*` · `src/routes/` · `src/i18n/`
- `.github/workflows/deploy.yml` (push to main → Pages) · `refresh-data.yml` (weekly pipeline run)
