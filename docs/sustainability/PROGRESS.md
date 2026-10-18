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
