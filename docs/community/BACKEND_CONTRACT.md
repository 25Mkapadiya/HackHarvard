# Market reporting backend contract (not implemented)

Phase 11 defines contracts only. Existing authentication, identity, roles and
market-association verification belong to their current owners. No endpoint,
shared database, account or representative verification system is provided here.

## Commands and evidence types

A customer command contains marketId, catalog productIds, observedAt and optional
notes. The server derives the reporter from the existing authenticated session;
ignore/reject browser reporterType, verificationStatus, subject IDs and provenance.
Return canonical product names, server report IDs, received timestamps and source
record IDs. Revalidate directory membership, dates, batch size and note limits.
Use the market's agreed date/time policy; the local demo uses UTC calendar dates.
The server must preserve the actual observation date, not replace it on refresh.

An official observation requires current server-verified authorization for that
specific market. A browser flag, market selection, email domain, or customer
record never establishes that association. The auth owner must check existing
session validity and market permissions for every operation, including revocation.

Expected availability is a separate future command, for example:
`{marketId, productId, expectedMarketDate, assertion, validUntil}`. It must be
stored and labelled as a representative expectation, never converted into an
observation or fed to Phase 11's observedAt validator. Future observation dates
are rejected. This phase does not implement expected-availability writes/search.

## Read adapter boundary

`validateReport(raw, {markets, now}, serverAssertion)` checks a report against a
separate `ServerReportAssertion`. The adapter must obtain both ONLY from an
already authenticated, authorized server response. This object describes the
server's conclusion; it is not authorization enforcement. Do not construct it
from form data, local JSON, query strings, localStorage or an asserted role.
`reportAuthority` has runtime identity checks: copying/deserializing a validated
object loses validation and requires the trusted adapter to revalidate it.

Assertions bind report ID, source record ID, market ID, reporter classification
and verification state. An optional independentReporterKey must be a stable
opaque server-derived identity with a documented identity assurance policy.
Never send names, emails or session tokens to the public aggregation service.
Missing identity gives unknown independent confirmations, not the raw submission
count. Repeated records from the same identity count once. Report verification
and reliable source identity are distinct; verification is never inferred from
submission volume. In a compromised browser no client validator can confer trust;
all authority checks must also run on the server.

## Persistence, security and moderation required before public launch

- Existing session integration and market-specific authorization; separate read,
  write, edit, delete and moderation policies, tested for cross-user/market access.
- Durable report and immutable provenance/audit records, canonical product foreign
  keys and directory references; retention and deletion rules approved by owners.
- Transactional idempotency keys per reporter and deterministic duplicate policy;
  reject key reuse with changed payloads. Keep opposing observations and corrections
  with their provenance rather than overwriting another reporter's evidence.
- Server date, payload, note and product validation, rate limits, quotas, abuse
  detection, moderation queue, reporting/removal workflow and representative
  association review/revocation. Escape content when displayed; do not accept HTML.
- Minimize identity metadata, keep private audit data out of public responses,
  enforce access controls/row security and test anonymous/expired/forged sessions.
- Public read projections expose only approved evidence and explicitly scoped
  independent counts. Decide fraud resistance before describing sources as
  independent; multiple accounts alone cannot establish independence.
- Add integration tests for authorization, atomic retries, moderation, revocation,
  deletion, conflicts, and privacy. Confirm deployment environment, secrets and
  monitoring with backend/deployment owners before enabling shared submissions.

No production adapter is installed. The real market search receives no local
reports; local demo records are never uploaded or copied to public static files.
