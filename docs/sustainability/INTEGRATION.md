# Integration and deployment handoff

## Access and scope

Existing `#/search` and `#/seasonal` are aliases for In Season Search.
`#/search?view=purchases` opens manual purchase entry and the independent
dashboard without changing shared routing or navigation. Existing menu labels
remain owned by the team. All new modules live in the three feature directories.
My Rewards remains the original sample/check-in feature and is **not** this
dashboard. Its legacy estimates are not reused or endorsed by this implementation.

## Account persistence — required, not implemented

`PurchaseRepository` defines async `list`, `submit`, `clear` and a persistence
label. `PurchaseSession.purchases()` is the auth integration seam. Default UI
uses one tab-memory instance: reload/close loses records; no purchases are
uploaded, written to localStorage, attributed to a hardcoded user, or logged.
This is a working independent demo, **not a secured durable account store**.

The authentication/backend owner must supply a repository:

1. Resolve current identity from the existing session, exclusively server-side
   or through authenticated backend requests; never accept an arbitrary owner ID
   from the purchase form.
2. Add visit/item tables, server validation, authorization and row-level security
   for reads/writes/deletes. Restrict records to the current user. Do not place
   private records in committed JSON or static/public tables.
3. Enforce an atomic per-owner submission ID uniqueness constraint and fingerprint
   deduplication transaction. Reusing a key with a different payload must fail.
   Include market existence, real dates, positive quantities, safe currency cents,
   and item-price/total consistency checks on the server.
4. Inject the session-bound repository into `PurchaseWorkspace`, handle signed-out
   state in the team's existing auth UI, and unmount/remount the workspace on
   identity changes so no previous user's draft or history survives logout.
5. Define retention/deletion semantics for `clear()`, test isolation between users,
   concurrent submissions, expired sessions, offline errors and recovery.

No Supabase schema, auth SDK, hosted service or credential was added. A real
backend implementation is required before the account-persistence definition
of done can be met. Receipt/photo extraction is deferred; future extraction
must use an isolated provider and return editable fields for user confirmation.

## Evidence integration

`impactSummary(visits, evidence)` is UI-independent. `SustainabilityDashboard`
accepts `evidence` separately from self-reported purchases. Keys use
`itemEvidenceKey(submissionId, itemId)`. Never derive origin from market
coordinates or trust sample vendors as actual inventory.

Provide audited product/region/date-matched price baselines, item-price local
attribution, both supply-chain distances, complete freight legs/modes, or paired
stage-resolved LCA evidence. Preserve source URL, quality, assumptions and exact
units. A citation's presence is structurally validated but cannot prove its
content: the data adapter must audit suitability. No real origin/LCA data adapter
is installed. Consumer-trip comparisons must already include round-trip purpose
allocation and the correct tank-to-wheel/well-to-wheel boundary. Consult
METHODOLOGY.md for details; do not sum the freight and life-cycle cards.

## Refresh and regional coverage

No new jobs or APIs are introduced. Existing main-owned weekly market-data
publication continues; this feature neither changes nor runs that workflow.
Monthly results recompute from the clock or selected month. Region changes
recompute seasonal and market results. Availability ranking only considers
non-sample reports within 80 km, even when the user views a broader region.
Popular-food measurements and agricultural-relevance measurements remain absent,
so weights are redistributed rather than populated with invented values.

Massachusetts has a limited sourced harvest guide. Other existing regional rows
are approximate, not independently audited calendars. Extend source-backed state
coverage before claiming verified nationwide seasonality. Dataset downloads do
not refresh historical source observations. Reports are not live inventory.
The static loader caches for the page lifetime; reload to get published data.

## Validation and deployment

Keep package.json, package-lock, workflows, shared routing, auth and profiles
unchanged. Use the repository's existing npm commands (`npm ci`,
`npm test -- --run`, `npm run lint`, `npm run build`, `npm run test:e2e`).
The local bundled Node runtime is Node 24; tests can also run through the
installed Vitest/TypeScript/ESLint/Vite executables when npm is absent.

Known local-tool issue: Workbox generates invalid import strings if the absolute
checkout path includes an apostrophe. An identical temporary copy in
`/private/tmp/hackharvard-sustainability-validation` builds successfully with no
source/configuration changes. CI's normal checkout path does not have that issue.
For browser tests, the existing Playwright configuration accepts
`PLAYWRIGHT_CHROMIUM_PATH`; an installed Chrome can run with an isolated test
profile. Generated dist, node_modules, screenshots, reports and caches stay out
of Git.

Feature commits are pushed only to `origin/feature/sustainability-metrics`.
This does not deploy GitHub Pages: the existing deployment workflow runs from
main. The team's normal review/integration/deployment remains outstanding; no
main merge, workflow execution or production publication is performed here.
