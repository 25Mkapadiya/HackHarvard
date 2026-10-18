# Phase 9 purchase entry audit and architecture

Base: 9a70641b, feature/sustainability-metrics. Scope is purchase draft UI only,
plus isolated input/adaptor modules, tests and handoff documentation.

## Existing flow and invariants

PurchaseWorkspace owns history loading and dashboard refresh. PurchaseEntry owns
market selection, visit date, string-valued draft items, total, review snapshot,
submission ID and synchronous in-flight ref. validateVisit enforces dates,
positive finite quantities, supported units, safe cents, item totals and IDs.
MemoryPurchaseRepository defensively clones data and deduplicates by submission
ID and trip fingerprint. PurchaseSession is exclusively an auth-owner integration
seam. History is tab-memory; there is no authenticated persistence.

The sustainability dashboard reads validated visits separately from evidence.
Existing environmental adapters and formulas must remain unchanged. Neither a
photo nor receipt establishes origin, locally grown attribution or a historical
scenario opt-in. Multiple items still submit one trip. Existing search and all
270 unit/component and 12 browser tests are regression requirements.

## Safest extension points

- Keep PurchaseWorkspace, repository, VisitInput model, calculation services,
  environmental evidence adapters, shared stores and routes unchanged.
- Add three clearly named input choices inside PurchaseEntry's items step;
  retain the existing manual form labels, review action and submission flow.
- Extract only the editable item/total fields into PurchaseReview, shared by
  manual drafts and any future provider suggestions. Maintain user confirmation.
- Add ImageInput using standard camera/file inputs and a local object-URL preview.
  JPEG/PNG/WebP only, bounded size and successful browser decoding required.
  No raw files, preview URLs or recognition details enter the purchase repository.
  Replace/remove/unmount/submit/reset releases image resources. Switching method
  discards the image but preserves typed items and spending.
- Add runtime-validated, provider-independent product/receipt contracts. Production
  adapters explicitly return unavailable with empty suggestions; no fake success,
  service, credentials, upload, telemetry or image logging. Future configured
  providers require an explicit processing action and secure server integration.
- Suggestions are untrusted drafts: validate IDs, units, amounts, confidence and
  limits, allow exact canonical aliases only, retain unknown names for editing,
  reject malformed results, append only after explicit user selection, and
  require a separate product confirmation before final visit review.
- Keep quantity strings until existing visit validation. Improve error messages,
  unit labels and explain measured mass versus count/volume. No universal
  counted-food conversion or silent estimated mass enters existing calculations.

## Provider and persistence status

No existing image/OCR SDK or configured recognition integration exists in the
purchase feature or manifest. No external provider is added. Photo/receipt
selection, preview and manual transcription will work locally; automatic
recognition, OCR and counted-item mass estimation remain unavailable. The auth
owner must provide a session-bound repository and unmount drafts on identity
changes. These are integration tasks, not a competing account implementation.

## Delivery and verification

Use focused commits for interface, private image input, product contract, shared
review, receipt contract, quantity UX, integration, accessibility, tests and docs.
Test stale async images/results, decoding failures, replacement/URL cleanup,
invalid inputs, provider unavailability, explicit confirmation, one-visit counting,
idempotency, spending, mobile overflow and existing environmental scenarios.
Use the documented apostrophe-free build copy and local Chrome browser runner.
Push only the requested feature branch after checking its remote base.
