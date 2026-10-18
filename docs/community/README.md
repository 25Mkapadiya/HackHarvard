# Community market product reporting — Phase 11

## Working now

A standalone local reporting demo is available at `#/search?view=reports` (also
`#/seasonal?view=reports`). Select a directory market and observation date, search
existing catalog names/aliases, select 1–30 products, remove mistakes, and review
or edit before adding observations to temporary memory. No quantities, spending,
photos, purchases, rewards, or account fields are involved. Public submission is
disabled; the confirmation explicitly says nothing was uploaded or saved
permanently. Clear, leaving the reporting view, reload, or close discards records.
No localStorage, sessionStorage, shared store, network write or backend is used.

The navigation now has one **In Season Search** entry. Both existing route aliases
remain. Other menu links, market detail pages, purchases, calculations, historical
evidence/scenarios, seasonal datasets and My Rewards are preserved.

## Not yet live

Public submissions, permanent shared storage, verified representative accounts,
official market availability updates and community-derived production search
results are **not implemented**. No synthetic reports are bundled as live data.
The existing public preview remains its previously published snapshot: Phase 11
has not republished it or changed deployment configuration.

## Models and validation

`src/features/marketReports/models.ts` uses the existing 59-food seasonal catalog
and its normalization/alias functions. A multi-product draft becomes one
MarketProductReport per canonical product, each carrying ID, marketId, productId,
canonical productName, observedAt, submittedAt, reporterType,
verificationStatus, availabilityStatus, optional notes and source metadata.
`observed` and `not_observed` describe observations, never guaranteed inventory.
The current form reports products seen; negative observations are supported by
the service model for future trusted integrations, not by an invented live feed.

Validation rejects unknown markets/products, noncanonical display names, invalid
calendar dates/timestamps, future observations/submissions, submission dates
preceding observation, notes over 500 characters, missing provenance, unexpected
fields, duplicate product IDs and invalid batch sizes. Dates use UTC in this
local demo; document the market-time-zone policy before a server launch. IDs and
received timestamps are generated on confirmation for the demo, and must be
server-assigned in production. Validated records and provenance are frozen.

Local reports always have customer/unverified/local_demo provenance. Role and
verification fields in a draft are rejected; there is no role picker. Forged
representative or verified demo records fail validation. A trusted record needs
a separate server assertion bound to its report/source/market/classification.
The runtime validator tracks object identity; JSON copies are not trusted.
This is an adapter boundary, not proof of server authority or a permission system.
See [the backend contract](BACKEND_CONTRACT.md).

Same market/product/date/observation status is one local demo entry even after
retries or note edits. The first record's timestamps/provenance are retained.
Opposing status is a distinct observation. Aggregate duplicate IDs are ignored
only if their report bodies match; changed bodies with the same ID are rejected.
Production owner-scoped atomic deduplication remains server work.

## Aggregation, freshness and conflicts

`aggregation.ts` groups validated observations by market and product. It retains
all distinct observations, sorts by observation date, then submission instant,
then report ID, and exposes latest observation, original classifications,
verification, provenance and an explicit conflict flag. Newer opposing reports
influence relevance without erasing older ones or declaring either guaranteed
truth. Consumers must offer the original dated observations when showing a
conflict. A non-observation means that reporter did not see the product; it does
not establish market-wide absence.

Default freshness is observation age **0–7 days recent**, **8–30 older**, **31+
historical**. Thresholds are configurable nonnegative integers with older >=
recent. UTC day differences are used, with future/invalid dates rejected.
These are initial product-design choices, not scientifically established
inventory-validity periods. Refresh and submission dates never replace the
observation date. Even recent reports explicitly do not establish current stock.

IndependentReporterCount is null if any input lacks reliable server-derived source
identity. Otherwise distinct opaque server keys count once across the group's
provided observation history, regardless of repeated submissions. This is not a
count of recent availability confirmations. Unverified report volume never grants
official status. Reliable identity and report verification are distinct backend
assertions; the client supplies neither.

## Search integration readiness

`rankMarketsWithTrustedReports(markets, productId, validatedReports, now, policy?)`
is a pure, tested explicit adapter seam. It rejects the whole batch if any report
is demo/untrusted or outside the supplied directory. It is **not wired to the
live seasonal page**. Empty report input provides only historical directory
category evidence or unknown; sample categories supply no exact-product evidence.

A latest positive observation ranks: recent verified representative, recent
customer, older representative/customer, historical report, historical USDA
category, unknown. Within a tier, later observation date then stable market ID
break ties. An older verified report cannot override a newer customer observation
in its group. Latest negative observations do not receive a positive report
boost; any directory fallback stays explicitly broad/unknown for the product.
Every report label names its actual observation date and classification and
states that current stock is not established. Seasonal recommendation weights,
directory distance ordering and actual production results remain unchanged.

Expected availability is a different future representative assertion. It must
have a separate target market date and expiry and be displayed as an expectation,
not an observation. Phase 11 deliberately rejects future observedAt values.

## Integration and deployment requirements

The existing auth owner must provide authenticated sessions and market-specific
server authorization. The backend owner must provide durable storage, validation,
atomic idempotency, safe public read projections and private audit/identity
storage. Moderation/abuse owners need review/removal, representative verification
and revocation, quotas/rate limits, fraud controls, retention and deletion rules.
See BACKEND_CONTRACT.md for concrete handoff requirements. No new service,
dependency, credential, database, auth/social code or deployment job is introduced.

Before enabling public writes: implement and test those server requirements,
review privacy/moderation policies, inject the trusted read adapter, verify UI
labels and conflict handling with approved data, and obtain the team's normal
integration/deployment review. The current integration contract is not a backend.

## Validation and audit

Started from remote feature commit `3bd3ea0f` after fetching the feature branch;
Phase 10 baseline was `837bf8f0`. No uncommitted changes existed. Remote and local
feature heads matched. Navigation history showed Claude's existing baseline
commits, with no intervening teammate changes; only the redundant menu tuple and
its English/Spanish search labels were edited. Routing declarations are intact.

- 322 unit/component tests passed (291 existing plus 31 new), including validation,
  forged authority, aliases, multi-product review/edit/removal, deduplication,
  freshness boundaries, conflicts, independent counts, ranking and demo isolation.
- All 16 browser workflows passed (14 existing plus two), retaining seasonal,
  manual purchase, sustainability, Syracuse opt-in and Boston rejection checks.
- New browser coverage verifies no report network writes, keyboard confirmation,
  390 px mobile layout without horizontal overflow, memory reset and both routes.
- TypeScript passed; lint has zero errors and the same four existing warnings.
- Seasonal validation passed: 113 records, eight sources, 59 foods; generated
  reports match. Seasonal source/data files were not edited.
- Full production/PWA build passed in the documented apostrophe-free temporary
  copy. Existing build, preview and deployment configuration are unchanged.

## Files changed

- `src/features/marketReports/models.ts` — model, catalog normalization, validation,
  separate server-assertion boundary and memory-only duplicate handling.
- `src/features/marketReports/MarketProductReporting.tsx` — standalone local UI.
- `src/features/marketReports/aggregation.ts` — freshness, conflicts, identity
  counting and explicit trusted-report search seam.
- `src/features/marketReports/models.test.ts` and
  `MarketProductReporting.test.tsx` — service and component tests.
- `e2e/market-reports.spec.ts` — reporting/navigation browser tests.
- `src/features/seasonal/InSeasonSearch.tsx` — independent reporting view selector.
- `src/app/App.tsx`, `src/i18n/en.json`, `src/i18n/es.json` — minimal menu cleanup.
- This README, `BACKEND_CONTRACT.md`, `docs/sustainability/PROGRESS.md` and
  `docs/sustainability/INTEGRATION.md` — documentation and handoff.
