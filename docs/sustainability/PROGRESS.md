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
