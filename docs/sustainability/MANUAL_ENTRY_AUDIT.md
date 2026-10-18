# Phase 10 purchase simplification audit

Base: 94964091. Branch: feature/sustainability-metrics.

## Remove

Phase 9 ImageInput/image implement file/camera selection, signature/size checks,
decoding and previews. PurchaseAssistance owns images, cancellation and provider
results. recognition/receipt define unused AI/OCR contracts. photo.test and
purchase-photo.spec test that removed scope. PurchaseEntry owns method/provider
props and mounts assistance. DraftItem/PurchaseReview contain suggestion IDs,
confidence text and per-suggestion checks. These are safe to remove together.
No production provider or credentials exist to migrate.

## Preserve and simplify

Keep PurchaseEntry's market/date, string drafts, review snapshot, currency checks,
in-flight guard, submission ID and retry behavior. Keep reusable PurchaseReview,
quantity units/help and add/edit/remove support. Extract exact canonical aliases
from recognition into a small manual product catalog helper; offer a datalist
without restricting unknown product names. Keep all Phase 8 source data unchanged.

Require positive quantities for new manual submissions. Existing PurchaseItem
and validateVisit permit missing quantities for historical records/calculation
fixtures, so retain that read compatibility and introduce a stricter new-write
validator. Optional product ID, vendor and origin are self-reported annotations,
not verified evidence. Preserve integer cents, item totals, dates, units and
fingerprint duplicate prevention. Never derive mass from counts or origin from
market location. Calculation formulas/adapters need no changes.

## Persistence boundary

PurchaseRepository currently provides list/submit/clear and a persistence label.
Add get/delete with explicit submission-ID addressing, idempotent deletion and
clone isolation. Memory remains a clearly labelled development fallback. Define
safe repository error codes and a backend-neutral contract, not network services,
account tables, auth SDKs or client user-ID security checks.

PurchaseWorkspace already rejects late list results, but only the loaded history
is associated with its repository: PurchaseEntry draft and scenario state survive
repository replacement. Key the private workspace by repository identity so
replacement unmounts all prior private state; an explicit null repository must
show unavailable/signed-out state rather than silently fall back to memory.
The auth owner must issue a fresh session-bound repository per session/account
and remove it before logout, expiry or account changes. A rejected session must
lock and clear the private workspace. Generic failures preserve entered drafts
and offer retry. Backend validation, ownership and atomic idempotency remain
external requirements, never simulated security.

## Verification and delivery

Remove obsolete image tests; retain/update manual browser tests for required
quantities and add repository, reset/expiry, error/retry, currency, review,
mobile/keyboard and duplicate behavior coverage. Preserve seasonal and historical
scenario tests and all environmental formulas. Focused commits: removal, manual
form, review, repository boundary, teammate contract, tests and final handoff.
Use the documented apostrophe-free production-build copy and browser runner.
Push only the requested feature branch, without force or main changes.
