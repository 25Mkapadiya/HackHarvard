# Manual purchase recording — Phase 10 handoff

Current release starts at 94964091 on feature/sustainability-metrics. Purchase
entry is entirely manual. Photo uploads, receipt uploads, image previews,
recognition/OCR contracts and cancellation/suggestion UI have been removed.
No provider integration is planned or required for this workflow.

## Working workflow

1. Find and select the farmers market visited.
2. Enter the actual visit date (default today; future/invalid dates rejected).
3. Enter one or more product names, with optional standardized-name suggestions.
   Exact canonical names/aliases receive a food ID; unknown names remain allowed.
4. Enter each product's positive quantity and unit. All previous units remain:
   kg, g, lb, oz, each, bunch, dozen, pint, quart and loaf. Counts/volume are not
   silently converted to weight. New visits cannot omit quantity.
5. Enter the total spent in USD. Optional item prices are item totals, not unit
   prices. Optional vendor/farm and origin fields are collapsed and self-reported;
   nobody is required to know where their food was grown.
6. Review market, readable date, products, quantities/units, optional details and
   total. Edit any information before submitting. Add/remove products freely,
   with at least one product and a maximum of 100.
7. Submit once. The dashboard refreshes counts, spending and evidence-supported
   metrics. Multiple products form one trip/visit. Repeated clicks and duplicate
   trip fingerprints do not add visits or double spending. Temporary save failures
   preserve the reviewed information and key for retry.

Currency is validated as integer cents with at most two decimal places. Item
prices cannot sum above the trip total. Quantity, date, unit and item-ID checks
remain; required quantity is enforced for new writes by validateNewVisit and
NewVisitInput. The original read schema still accepts unknown quantities in
historical records and calculation fixtures. No migration fabricates weight.

Manual entry and review remain keyboard-accessible, with labelled required
fields, focus on validation feedback, editable confirmation and a mobile layout
checked at 390 × 844 without horizontal scrolling. There is no input-method
selector, camera request, file input, AI dependency or extra recognition step.

## Storage readiness and limitations

The default MemoryPurchaseRepository is a development fallback for this tab only.
Reloading/closing loses records; no account saving, durable security, cross-device
sync, backend or database is provided. The entry page and success state both say
this. No new dependencies, hosted services or account SDKs were added.

Repository injection, get/delete methods, clear semantics, structured errors,
retry idempotency and private-state resets are implemented. New repository
identity resets drafts/history/scenario selection. Explicit null disconnects the
private workspace instead of choosing demo storage. Expired-session errors lock
and clear the private UI. Generic read/save failures keep drafts and allow retry.

[The authenticated storage contract](PURCHASE_STORAGE_CONTRACT.md) defines domain
fields, server-owned identity, methods, ordering, annotations, deletion and retry
semantics, backend validation, session lifecycle, privacy, summary/provenance and
owner acceptance checks. It does not assume account tables or implement auth.

The teammate still must supply verified sessions, a session-bound repository,
server authorization/ownership, secure parent/child records, durable writes,
atomic owner-scoped idempotency, retention/deletion, account-switch/logout/cache
cleanup and expired-session rejection. Never use client user-ID checks alone.
Memory tests and reset boundaries do not certify backend security or persistence.

## Environmental data boundaries

All calculation formulas, adapters and historical scenarios are unchanged:

- Visit count = one deduplicated submitted trip; spending = sum of trip totals.
- Local spending requires verified attribution; a market, vendor or typed origin
  is insufficient. Optional origin text is never promoted into evidence.
- Food miles remain quantity/mass weighted; counts without reviewed mass evidence
  keep mass-dependent metrics unavailable.
- Transportation uses existing evidence and EPA factors; historical Syracuse apple
  scenarios require explicit opt-in and existing eligibility checks. They describe
  modeled study comparisons, not measured individual purchase impact.
- Total life-cycle CO2e remains unavailable without compatible paired stage data.
  Missing provenance/baselines still produce warnings and unavailable results.

No calculation-compatibility patch was necessary. Environmental modules,
SustainabilityDashboard, seasonal/market search, rewards, shared stores, routing,
authentication, account/profile/social systems and package manifests are unchanged.

## Removed modules and retired docs

Deleted from src/features/purchases: ImageInput.tsx, PurchaseAssistance.tsx,
image.ts, recognition.ts, receipt.ts and photo.test.tsx. Removed
`e2e/purchase-photo.spec.ts`. Preserved DraftItem and PurchaseReview in reduced
manual-only form. `products.ts` now owns exact manual product-name lookup.
PHOTO_ENTRY.md and PHOTO_ENTRY_PLAN.md are explicitly superseded; original Phase 9
implementation details remain available in Git at 94964091.

## Validation

- Unit/component tests: 291 passed; original photo tests removed and 21 manual,
  repository and private-state tests added to the prior 270 non-photo tests.
- Browser tests: 14 passed; 12 prior non-photo browser workflows retained plus
  mobile required-input/editing and keyboard/currency/duplicate-trip workflows.
- TypeScript project validation passed.
- ESLint: zero errors, only the same four existing Fast Refresh warnings.
- Production/PWA build passed in an apostrophe-free temporary copy.
- Seasonal catalog validation/report check and git diff whitespace check passed.

To reproduce: npm test -- --run; npm run lint; TypeScript via
`node node_modules/typescript/bin/tsc -b`; npm run seasonal:validate -- --check.
Mirror the checkout into the documented temporary build directory **with removed
files deleted from that mirror**, preserving its node_modules and excluding .git
and dist. Run npm run build there, then npm run test:e2e -- --workers=1 using the
installed Chrome override from earlier phases. Stale Phase 9 files must not remain
in that copy. Build output, screenshots and browser reports are not committed.

## Focused commits

- `867121ba` docs: audit purchase workflow simplification
- `c437319d` refactor: remove unused photo and recognition features
- `fa9caea0` feat: simplify manual farmers market purchase entry
- `80d8de56` feat: improve purchase review and submission feedback
- `fa945b3e` refactor: prepare purchase repository for authenticated storage
- `f2286769` docs: define authenticated purchase integration contract
- `cb4aa35d` fix: preserve retry idempotency after purchase deletion
- `51594ceb` test: validate simplified purchase recording workflow
- `de6ed491` fix: discard deleted purchase payloads from retry records

Final documentation handoff: `docs: update purchase recording and persistence handoff`.

## Complete changed-file list

- `docs/sustainability/INTEGRATION.md`
- `docs/sustainability/MANUAL_ENTRY_AUDIT.md`
- `docs/sustainability/MANUAL_PURCHASES.md`
- `docs/sustainability/PHOTO_ENTRY.md`
- `docs/sustainability/PHOTO_ENTRY_PLAN.md`
- `docs/sustainability/PROGRESS.md`
- `docs/sustainability/PURCHASE_STORAGE_CONTRACT.md`
- `e2e/environmental-evidence.spec.ts`
- `e2e/manual-purchases.spec.ts`
- `e2e/purchase-photo.spec.ts` (removed)
- `e2e/sustainability.spec.ts`
- `src/features/purchases/ImageInput.tsx` (removed)
- `src/features/purchases/PurchaseAssistance.tsx` (removed)
- `src/features/purchases/PurchaseEntry.test.tsx`
- `src/features/purchases/PurchaseEntry.tsx`
- `src/features/purchases/PurchaseReview.tsx`
- `src/features/purchases/PurchaseWorkspace.tsx`
- `src/features/purchases/draft.ts`
- `src/features/purchases/image.ts` (removed)
- `src/features/purchases/manual.test.tsx`
- `src/features/purchases/model.ts`
- `src/features/purchases/photo.test.tsx` (removed)
- `src/features/purchases/products.ts`
- `src/features/purchases/quantity.ts`
- `src/features/purchases/receipt.ts` (removed)
- `src/features/purchases/recognition.ts` (removed)
- `src/features/purchases/repository.test.ts`
- `src/features/purchases/repository.ts`
