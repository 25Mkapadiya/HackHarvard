# Phase 9 photo-assisted purchase entry

Branch: `feature/sustainability-metrics`. Base: `9a70641b`.
The reliable path remains market/date → editable purchases → review → one
validated visit → existing dashboard. Photos and receipts are private visual
references today; **automatic recognition and OCR are not enabled**.

## Working today

- Three entry choices: take/upload a purchase photo, upload a receipt image,
  or enter manually. Manual entry is selected initially and always works.
- Standard file inputs with camera capture hint on supported mobile browsers.
  No continuous camera permission or camera stream. A browser may offer a file
  chooser instead of a camera; existing-image upload remains available.
- JPEG, PNG and WebP only, maximum 8 MiB; empty files, mismatched signatures,
  unsupported formats, corrupt images and decoded images over 40 megapixels
  are rejected. HEIC, SVG, PDFs, text and other formats require conversion before
  use. Validation checks type/signature and successful browser decoding, not an
  antivirus or a guarantee about image content.
- Local preview, replacement and removal. Invalid replacements retain the prior
  valid preview and typed purchases. A new selection invalidates old extraction
  requests immediately. Object URLs are revoked on replacement, removal,
  confirmation, backing out of entry, method changes and unmount. Pending loads
  and provider requests cannot write stale results after removal/unmount.
- The same editable product list handles manual entry and future suggestions.
  Correct names, quantities, units and optional item prices; add/remove products;
  enter total spending and review the complete trip. Unknown foods remain editable.
- All previous units remain: kg, g, lb, oz, each, bunch, dozen, pint, quart, loaf.
  Expanded labels distinguish measured weight from count/volume. Blank quantities
  remain unknown; positive finite quantities and existing limits are enforced.
  Currency still uses exact integer cents, with item-price/total validation.
- Final submission still uses the existing validateVisit/repository contract and
  in-flight guard. Multiple products count as one visit. Duplicate fingerprints
  and reused submission IDs retain the existing repository behavior. A failed
  save keeps the reviewed data for retry. Spending and history update through
  the existing PurchaseWorkspace callback.
- Labels, fieldsets, camera/file inputs, review checkboxes and focus transitions
  support keyboard use. Mobile layout checked at 390 × 844 without horizontal
  overflow. No shared navigation, rewards or account screens were redesigned.

## Integration ready — provider contracts and draft review

`recognition.ts` defines ProductRecognitionProvider and its runtime-validated
ProductRecognitionResult. `receipt.ts` defines ReceiptExtractionProvider and
ReceiptExtractionResult. Requests carry a temporary `File` and `AbortSignal`.
Providers declare availability and return an unknown value; adapters validate
that value before the UI sees it. Production defaults explicitly return
`{ status: 'unavailable' }`; they do not inspect, upload or synthesize products.

A configured product provider may return `status: 'suggestions'` with:

- `products`: at most 100 suggested objects containing a name, nullable known
  candidate food ID, nullable positive quantity/unit pair, nullable confidence
  between 0 and 1, and required uncertainty text.
- `uncertainty`: bounded general limitations. Confidence must be meaningful and
  supplied by the provider; use null when no calibrated confidence exists.

A receipt result adds nullable `totalCents` and nullable per-item `priceCents`.
Amounts must be safe, nonnegative integer cents. An empty item list is valid:
receipts may show only a total or be unreadable/non-itemized. No personal-name,
address, card number, full OCR text or production-origin fields are accepted by
these strict result schemas. Do not place personal information inside description
or uncertainty fields; schema validation alone cannot detect arbitrary PII.

Only an explicit **Send image… / Send receipt…** action calls an injected,
available provider. There is no such action enabled in the default deployment.
A successful provider response is still unconfirmed: nothing is appended or
submitted automatically. Users choose each suggestion to add, then edit and
check its product confirmation box. Changing any field requires re-checking it.
Manual entry uses the same component but needs no redundant per-item checkboxes.
Receipts copy totals only through a separate labelled action that warns it
replaces the entered total. Existing spending remains until that action.

Canonical mapping uses exact names/aliases from the Phase 8 food registry.
Substring matching does not establish an identifier. Candidate IDs and confidence
stay in the temporary draft; only the existing validated product name, quantity,
unit and optional price reach the repository. Future persistence of canonical IDs
needs model/owner review. No image-derived origin or local-grown classification
is added. Historical Syracuse scenarios still require separate explicit opt-in.

Provider failures and malformed responses show a generic error, preserve all
existing entries and do not expose upstream messages or log sensitive content.
Late/cancelled results are ignored even if a provider disregards AbortSignal.
Test-only synthetic providers exercise this seam; production has no fake analysis,
random suggestions or prefilled recognition demonstration.

## Unavailable — integration work still required

- Real image recognition, OCR, receipt extraction, image-derived weight or price.
- Verified counted-item-to-mass estimation and accepted-estimate provenance.
- Account-based history, secured persistence, cross-device sync and uploads.

There are no added SDKs, services, credentials, databases, telemetry or paid APIs.
Before enabling an actual provider, the integration owner must select and review
its privacy/retention policy, quality and cost; disclose the recipient and policy
in the UI; obtain explicit user action; enforce server-side credentials, limits,
response validation, cancellation, error handling and deletion. Static GitHub
Pages must not contain provider secrets. A suitable secure server integration is
required for secret-bearing services; it is not supplied in this phase.

## Privacy and retention

Files exist in ImageInput/PurchaseAssistance state only. They are never passed to
PurchaseRepository, serialized with a visit, placed in a route/query URL, localStorage or a
shared account store, or logged. Preview object URLs are local browser resources,
not remote uploads. The browser releases temporary file references and URLs as
components leave entry; this does not delete the user's original camera/file
photo or guarantee forensic erasure from browser/OS memory.

Receipts may include sensitive information. A future integration must crop/redact
unnecessary personal/payment content, strip unnecessary metadata such as EXIF
location, minimize request content, avoid raw-image/response logging and provide
retention/deletion controls. The current preview does not strip metadata because
it does not upload the file. Do not send images automatically after selection.

## Quantities and environmental evidence

[USDA FoodData Central Foundation Foods documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/)
provides food-specific portion measures and distinguishes portions/weights by data
type. That is a research path for a future reviewed product/size/portion catalog;
it is not an installed weight conversion. A bare food count does not identify a
specific portion/size, and no universal fruit or vegetable weight is assumed.

Original count/volume quantities are retained. Only a user-entered measured
weight uses the existing mass conversions. Provider-suggested mass is displayed
as unverified text and **is not copied into the measured-weight field**, even
when a suggestion is added. Reviewers can leave weight unknown or enter a measured
value themselves. Count suggestions require explicit confirmation. Accepted mass
estimates would need a distinct model field, source/uncertainty and reviewed engine
integration; they must never masquerade as measured weight.

Formulas and environmental evidence adapters are unchanged. No product-specific
impact is displayed without the existing evidence, no scenario is activated by a
photo, no market location becomes farm origin, and no receipt proves local spending.

## Authentication and storage ownership

PurchaseRepository/PurchaseSession and MemoryPurchaseRepository are unchanged.
The default history is tab-memory and disappears on reload/close. The auth/backend
owner still must supply authenticated persistence with server-side ownership,
validation, idempotency and authorization. Unmount/remount PurchaseWorkspace on
identity changes/logout to discard images, drafts and the prior user's history.
See INTEGRATION.md for the existing owner-specific persistence checklist.

## Files and validation

Implementation is confined to `src/features/purchases/`: PurchaseEntry,
PurchaseReview, PurchaseAssistance, ImageInput, draft, image, quantity, recognition,
receipt and photo.test. Browser tests are `e2e/purchase-photo.spec.ts`. This document,
PHOTO_ENTRY_PLAN.md and the existing progress/integration handoff are the only docs
changed. PurchaseWorkspace, purchase model/repository, seasonal files, account
stores, routes, authentication, profiles/social, My Rewards, calculation formulas
and environmental catalogs/adapters are unchanged.

Validation commands:

- `npm test -- --run`: 305 unit/component tests, including all prior 270.
- `npm run lint`: zero errors and the same four existing Fast Refresh warnings.
- `node node_modules/typescript/bin/tsc -b`: TypeScript project validation.
- `npm run build`: production/PWA build in the documented apostrophe-free copy.
- `npm run test:e2e -- --workers=1`: 15 browser tests, including all prior 12.
- `npm run seasonal:validate -- --check`: existing catalog/report consistency.

New tests cover signatures/formats/size/decoding, preview replacement and cleanup,
stale async images/results, cancellation, runtime provider validation, unavailable
fallbacks, explicit suggestion review, quantity errors, receipt totals/item prices,
failed processing, duplicate clicks and mobile/keyboard flows. Existing purchase
and Syracuse/Boston scenario tests remain unchanged. Browser photo test also
checks that default selection/submission emits no POST requests.

## Focused commits

- `9c13dee5` docs: plan photo-assisted purchase entry architecture
- `de017f62` feat: streamline farmers market purchase entry
- `49872fbf` feat: add private purchase photo capture interface
- `26123629` feat: add extensible product recognition adapter
- `4809a01c` feat: add editable purchase recognition review
- `d31f12ae` feat: prepare privacy-conscious receipt extraction interface
- `f364cbf1` feat: improve food quantity entry and validation
- `f16461a7` feat: integrate photo-assisted entry with purchase workflow
- `29bea451` fix: improve purchase entry usability and accessibility
- `ced8ce35` fix: cancel stale purchase image processing before replacement
- `05f956ea` fix: keep purchase review labels clear and user focused
- `373ff535` test: cover photo-assisted purchase workflow

The final documentation handoff is committed separately as
`docs: document purchase recognition integration requirements`.

## Complete changed-file list

- `docs/sustainability/INTEGRATION.md`
- `docs/sustainability/PHOTO_ENTRY.md`
- `docs/sustainability/PHOTO_ENTRY_PLAN.md`
- `docs/sustainability/PROGRESS.md`
- `e2e/purchase-photo.spec.ts`
- `src/features/purchases/ImageInput.tsx`
- `src/features/purchases/PurchaseAssistance.tsx`
- `src/features/purchases/PurchaseEntry.tsx`
- `src/features/purchases/PurchaseReview.tsx`
- `src/features/purchases/draft.ts`
- `src/features/purchases/image.ts`
- `src/features/purchases/photo.test.tsx`
- `src/features/purchases/quantity.ts`
- `src/features/purchases/receipt.ts`
- `src/features/purchases/recognition.ts`
