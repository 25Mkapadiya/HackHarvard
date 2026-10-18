# Implementation evidence

## Phase 1 — architecture

`2021006e docs: plan seasonal search and sustainability architecture` (pushed).
Inspected baseline, routes, data, storage, workflows, tests and protected areas.
No application changes. Authenticated purchase persistence is blocked on the
team's backend/session integration. No new infrastructure is introduced.

## Phase 2 — seasonal search

Both existing URLs render one region/month/location-aware search page. Pure
weighted ranking validates normalized inputs and redistributes missing weights.
Sample vendor data never supplies reported availability. Directory categories
are explicitly weaker than exact-product availability; popularity stays unknown.
A limited Massachusetts guide uses MDAR's documented June–July strawberry and
September–October pumpkin harvest windows; broad existing regional guides are
labelled approximate. Extending verified state calendars remains a data task.

Validation: 182 Vitest tests passed, TypeScript passed, ESLint has zero errors
and four pre-existing Fast Refresh warnings in protected/shared files.
Workbox fails in a checkout path containing an apostrophe (generated import
strings are not escaped). Use an identical temporary validation copy under
`/private/tmp/hackharvard-sustainability-validation` for full production builds;
no build configuration/dependency edits are needed.

## Phase 3 — purchase recording

Independent validated visit/item schemas, integer-cent currency parsing and an
async repository contract. Manual workflow selects a real directory market,
accepts multiple products, reviews editable information, then submits one trip.
Retries, concurrent clicks, reused submission IDs and identical trip fingerprints
are checked. Repository failures keep the confirmed draft. Memory records are
isolated from all existing demo/account stores and can be cleared.

Validation: 196 tests passed (including multi-item UI workflow, edit/review,
failed submission, immutable storage, duplicate and invalid-input cases),
TypeScript passed, ESLint zero errors/four existing warnings; temporary-copy
production/PWA build passed. Account persistence and photo/receipt extraction
remain explicitly unimplemented integrations; no private records are uploaded.

## Phase 4 — calculation engine

Independent pure modules implement visits/unique markets, trip spending versus
sourced local attribution, kg·mile and weighted-mile comparisons, EPA multimodal
freight CO2e, and compatible stage-resolved life-cycle differences. Optional
purpose-allocated consumer trips are included once per trip. Negative results,
partial coverage, provenance, source units, assumptions and missing states are
retained. Price-derived mass requires matching product/region/date evidence.
See METHODOLOGY.md for verified sources and rejected unsupported shortcuts.

Commits: `19fff6f2` visit/local spending; `f72f55f9` food miles;
`1e59700b` transport; `d91121ca` unused-import correction; lifecycle/methodology
commit follows. The transport commit initially contained an unused type import;
the correction was validated before proceeding and before pushing this phase.

Real origin/routes, local attribution, paired LCA and regional-price adapters
remain missing. No synthetic test evidence is shipped as environmental data.

Phase 4 validation: 209 unit/component tests passed, TypeScript passed, lint has
zero errors/four pre-existing warnings, full production/PWA build passed in the
temporary copy. Engine-only focused tests: 13 passed, including unit conversions,
multimodal freight, signed results, boundary/product mismatches and partial data.

## Phase 5 — dashboard

Standalone `SustainabilityDashboard` consumes visits and optional trusted evidence.
It displays visits, distinct markets, trip spending, local spending, weighted
food miles/average distance, freight and life-cycle CO2e, with source quality,
assumptions, missing reasons and covered subsets. Purchase history is expandable.
The purchases view wires the dashboard to the repository; a failed load never
becomes a zero-visit result. No profile, rewards, account or auth file changed.

Validation: 212 tests passed, TypeScript passed, lint zero errors/four existing
warnings; full production/PWA build passed in the temporary copy. Environmental
values remain unavailable without real evidence. Account persistence is still
blocked; visible demo records are memory-only and disappear on reload.

## Phase 6 — integration and final validation

`d8a1ada4 fix: clarify availability evidence and accessible purchase controls`
adds explicit select names, limits ranking availability to 80 km, groups real
non-sample food-category reports without inventing specific product listings,
clarifies source-record dates/schedule text, and keeps empty estimates unavailable.
`b137beab test: add end-to-end seasonal purchase and sustainability coverage`
adds browser coverage across both existing URLs, region/month changes, multi-item
review/edit/submit, one-trip counts, exact trip spending, unavailable environmental
results, navigation retention, clear, and intentional loss of memory data on reload.

Final validation on 2026-10-18:

- 212 tests in 24 Vitest files passed.
- TypeScript project build passed.
- ESLint: zero errors; four existing Fast Refresh warnings in shared context and MarketCard (untouched).
- Full production/PWA build passed in an identical temporary copy without an apostrophe in its path.
- Six Playwright tests passed in isolated headless Chrome, including all three existing smoke tests (home, market details, manager closure).
- Desktop/mobile search and purchase screenshots inspected at 1280 px and 390 px; document scroll widths equal viewport widths, with no horizontal overflow.
- `git diff --check` passed; all changed tracked paths match the feature allowlist. No auth/account/profile/social, rewards, check-in, shared routing/store/types, dependency, workflow, main or generated-data changes.

INTEGRATION.md documents interfaces, security requirements, deployment and data
refresh. No production deploy or main merge was attempted. All feature work is
scoped for review; browser validation is local, not proof of production deployment.

## Commit map

- Phase 1: `2021006e` — architecture.
- Phase 2: `c282dfd9` — unified search and ranking.
- Phase 3: `1dc9cb75` — validated multi-item purchase workflow/repository.
- Phase 4: `19fff6f2`, `f72f55f9`, `1e59700b`, `d91121ca`, `904d2dab` — calculations, tests, source methodology and import correction.
- Phase 5: `d7553bd7` — standalone connected dashboard.
- Phase 6: `d8a1ada4`, `b137beab`, followed by the integration/handoff documentation commit.

## Definition-of-done status and remaining work

Independent feature code, tests, builds and branch commits are complete. Full
account-level product completion is **blocked**, not claimed:

- Purchases are tab-memory demo records, not secured durable user-account records. Auth/backend owners must provide the session-bound repository and server-side authorization/idempotency.
- Verified state calendar coverage is limited to the documented Massachusetts harvest windows. Existing broader regional guides remain explicitly approximate.
- Actual-purchase origin/counterfactual, local-attribution, regional-price and paired LCA data remain unavailable. Phase 7 adds explicit historical scenarios only; see the Phase 7 section below. These do not establish real purchase-specific environmental reductions.
- Popularity and agricultural relevance lack measured inputs; weights are redistributed. Directory categories do not prove product stock.
- Photo/receipt extraction is deferred; no suitable provider was available.
- New feature labels are English; the existing translated shell is unchanged. Additional feature localization remains a follow-up.
- Team review and normal deployment are still required; main is untouched.

## Phase 7 — real environmental evidence integration

Starting commit: `56c4ab0e`. Branch: `feature/sustainability-metrics`.
The source-backed adapter, catalog, opt-in dashboard integration and tests are
implemented. Actual purchase-specific reductions are **not** established by the
bundled research data.

### Integrated evidence and coverage

- Version `ers-err99-table3/1.0.0-reviewed-2026`: attributed factual extract from
  USDA ERS ERR-99 (published 2010-06-21), Table 3 and its vehicle footnotes;
  direct selling-window context from p.11. Source URL, digest, geographic/product
  coverage, original units, observation-period uncertainty, methodology and
  redistribution basis are retained in the catalog and DATA_SOURCES.md.
- Product aliases: apple, apples, fresh apples. Geography: exact Syracuse, NY
  market city/state. No nearest-farm inference or fabricated coordinates.
- Direct-market vs WA/NY mainstream cases: April–December, including stored
  apples. These provide opt-in **historical food-mile scenarios** with recorded
  mass; no direct-case freight CO2e is shown because the small van is not a
  supported heavy freight truck.
- Separate NY vs WA mainstream retail-distribution illustration: all months,
  product miles plus documented heavy-truck legs and existing EPA factors.
  This is explicitly **not a farmers-market supply route**. Its calculated
  freight is a modeled national-average combustion estimate, not measured
  emissions or a replication of the source's loading-specific fuel analysis.
- Reviewed scenario-use dates: post-publication through 2026-12-31. This is an
  application policy, not source observation validity. Circa-2008/2009 source
  observations never become current observations because of a new review date.

### Unavailable and deferred

No actual-purchase origin/counterfactual pairs, local-spending fractions, matched
regional prices, farm-specific LCA refinements or compatible paired total LCA
are bundled. All other products/locations, inappropriate selling seasons and
unsupported dates remain unavailable. A documented origin alone cannot establish
a conventional comparison. Consumer travel stays excluded; no home address is
required. Authentication/persistence remains untouched and tab-memory only.

### Validation and separation of evidence

The catalog integration assertions use actual published numeric facts. Synthetic
transaction fixtures and deliberate alterations test rejection, signs and mode
handling; they are clearly labelled and never become production evidence.
The UI distinguishes recorded money, actual/observed evidence, modeled scenarios
and insufficient information, with provenance and missing fields expandable.
Partial baskets keep whole-basket estimates unavailable while identifying the
supported subset. Unknown mass is not replaced with an assumed basket or price.

Final validation (2026-10-18):

- `npm test -- --run`: 230 tests in 29 files passed.
- `npm run lint`: zero errors; the same four existing Fast Refresh warnings.
- `tsc -b`: passed; `npm run build`: production/PWA build passed.
- `npm run test:e2e`: eight browser tests passed, including all six prior tests,
  source-backed Syracuse opt-in workflow, and Boston geographic rejection.
- Scenario view inspected at 1280 px and 390 px; no horizontal overflow.
- The apostrophe-free temporary-copy validation approach was retained. Existing
  locked dependencies and cached npm runtime were used; no manifest/lockfile,
  build configuration, workflow or hosted service was added or changed.
- Protected-path audit passed. All six calculation modules (`evidence`,
  `foodMiles`, `transport`, `lifecycle`, `spending`, `summary`) are byte-for-byte
  unchanged from the starting commit. Auth/account/profile/social, shared account
  stores, rewards, QR code, main and unrelated features remain untouched.
- `git diff --check` passed. Generated screenshots, PDFs, runtimes, builds and
  browser reports remain outside the committed feature paths.

### Focused commits

- `42dd925a docs: audit environmental evidence integration requirements`
- `9b64f0c8 docs: evaluate authoritative environmental data sources`
- `e2ee31ce feat: add verified environmental evidence adapters`
- `33684cd4 feat: integrate sourced food miles comparison evidence`
- `713f3c52 feat: connect real transport evidence to emissions calculations`
- `62f1d397 docs: document lifecycle evidence limitations`
- `3e5f1fb9 feat: connect sustainability evidence to purchase dashboard`
- `e53d64cd test: validate real environmental evidence integration`
- `a202adab fix: distinguish historical scenarios from actual purchase comparisons`
- Final handoff: `docs: document environmental data coverage and limitations`.

### Handoff and future additions

See INTEGRATION.md for service inputs, registry validation, observed-document
requirements, adding datasets without formula changes, annual review and account
integration. See METHODOLOGY.md for modeled versus observed interpretation and
LIFECYCLE_LIMITATIONS.md for the unmatched-stage blocker. Current runtime use is
fully static and needs no source API key, new backend or paid service. Feature
commits are pushed only to the requested branch after checking its upstream;
team review/deployment and any main merge remain outside this work.

## Phase 8 — nationwide seasonal guidance (2026-10-18)

The shared In Season Search now selects state-specific evidence per food, with
explicit approximate/unknown fallbacks, aliases, source details and a single
selected month. Dataset `2026.10.18.1` contains 113 food/state records from eight
official sources, covering 45 of 59 registered foods somewhere. MA, NY, CA, FL,
TX, WA, MI and GA have partial source-backed coverage; general availability is
kept separate from harvest. Nine approximate calendars remain; AK/HI/territories
are unknown. No claim of nationwide verified coverage is made.

See [seasonal data handoff](../seasonal/README.md) and the
[state coverage table](../seasonal/COVERAGE.md) for product counts, sources,
limitations, version history, offline validation and refresh instructions.
The original purchase and Phase 7 environmental scenario workflows remain
unchanged. Validation: 270 unit/component tests, 12 browser tests, TypeScript,
production build in the documented temporary copy, zero lint errors and the same
four existing warnings. Only the requested feature branch is pushed.

## Phase 9 — photo-assisted purchase entry (2026-10-18)

Working: photo/camera and receipt-image selection, private local previews,
replacement/removal/cleanup, three entry choices, shared editable product review,
clear quantity units and manual fallback. Default automatic recognition and OCR
remain unavailable; no provider, credential, upload or hosted database was added.

Integration ready: strict product/receipt result contracts, cancellable providers,
explicit processing/add/review actions, exact canonical aliases, and unconfirmed
drafts. These seams are tested with synthetic fixtures, not a working AI service.
Suggested mass never silently becomes recorded measured weight. Original counts
remain counts, with no installed count-to-mass estimate. Persistence remains
unchanged tab-memory, owned by the future authentication/backend integration.

See [photo workflow and provider handoff](PHOTO_ENTRY.md) and the
[audit/architecture plan](PHOTO_ENTRY_PLAN.md). Validation: 305 unit/component
tests and 15 browser tests, preserving all prior 270/12; TypeScript and production
build pass; lint has zero errors and only the four existing warnings. Existing
seasonal search, visit deduplication/counting, spending, scenario opt-in rules,
formulas, adapters and all protected systems remain unchanged. Push only the
requested feature branch; no main merge or deployment.
